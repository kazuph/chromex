import { collectArxivAdapterPayload, isArxivUrl } from "../adapters/arxiv.js";
import { collectGoogleWorkspaceAdapterPayload, isGoogleWorkspaceUrl } from "../adapters/google-workspace.js";
import { collectPdfAdapterPayload, isLikelyPdfUrl } from "../adapters/pdf.js";
import { collectYouTubeAdapterPayload, collectYouTubePlaybackState, isYouTubeUrl } from "../adapters/youtube.js";
import { collectBodyText } from "./dom-text.js";
import { extractCssImageUrls, sortEditablePageImageCandidates, type EditablePageImageCandidate } from "../page-image-target.js";
import { resolveImagePreviewRefForUi } from "../sidepanel/image-preview-assets.js";
import { createSitePayload } from "../site-payload.js";
import type { VoiceNavigationCommand } from "../sidepanel/voice-commands.js";
import type {
  BrowserAutomationMode,
  BrowserDomActionResult,
  BrowserDomActionStep,
  BrowserDomElementSnapshot,
  BrowserDomSnapshot,
} from "@codex-sidepanel/shared";

let overlayNode: HTMLDivElement | null = null;
let aiControlOverlayNode: HTMLDivElement | null = null;
let aiControlOverlayTimer: number | null = null;
let aiControlOverlayWatchdogTimer: number | null = null;
let aiControlCancelled = false;
let imagePromptHoverInstalled = false;
let imagePromptHoverButton: HTMLButtonElement | null = null;
let imagePromptHoverTarget: HTMLImageElement | null = null;
let imagePromptHoverHideTimer: number | null = null;
const highlightedElements = new Set<HTMLElement>();
const domActionElementRefs = new Map<string, HTMLElement>();
const AI_CONTROL_OVERLAY_MAX_MS = 45_000;
const EDITOR_LIKE_SELECTOR = [
  'input:not([type="hidden"])',
  "textarea",
  '[contenteditable="true"]',
  '[contenteditable="plaintext-only"]',
  '[role="textbox"]',
  '[aria-multiline="true"]',
  '[data-lexical-editor="true"]',
  '[data-slate-editor="true"]',
  ".ProseMirror",
  ".ql-editor",
].join(",");
const EDITOR_DISCOVERY_TIMEOUT_MS = 900;

removeStaleAiControlOverlays();

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "page.collect") {
    void collectPageProbe()
      .then((probe) => sendResponse(probe))
      .catch((error) => {
        sendResponse({
          error: error instanceof Error ? error.message : String(error),
          rawCapture: {
            metadata: {
              url: window.location.href,
              title: document.title,
              domain: window.location.hostname,
            },
          },
        });
      });
    return true;
  }

  if (message.type === "page.apply-image-overlay") {
    void applyImageOverlay(message.previewRef)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) }));
    return true;
  }

  if (message.type === "page.clear-image-overlay") {
    clearImageOverlay();
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "page.image-prompt-hover.install") {
    installImagePromptHover();
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "page.navigate") {
    sendResponse(handlePageNavigation(message.command));
    return true;
  }

  if (message.type === "page.ai-control.start") {
    aiControlCancelled = false;
    showAiControlOverlay(normalizeBrowserAutomationMode(message.mode), typeof message.label === "string" ? message.label : undefined);
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "page.ai-control.stop") {
    aiControlCancelled = true;
    scheduleHideAiControlOverlay(Number(message.delayMs) || 0);
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "page.dom.snapshot") {
    sendResponse(collectBrowserDomSnapshot());
    return true;
  }

  if (message.type === "page.dom.perform") {
    const steps = Array.isArray(message.steps) ? message.steps : [];
    performBrowserDomActions(steps).then(sendResponse).catch((error) => {
      scheduleHideAiControlOverlay(0);
      sendResponse({
        ok: false,
        summary: error instanceof Error ? error.message : String(error),
        results: [],
        controlMode: "dom",
      });
    });
    return true;
  }

  if (message.type === "youtube.seek") {
    const video = document.querySelector("video");
    if (video) {
      video.currentTime = Number(message.seconds) || 0;
    }
    sendResponse({ ok: true });
    return true;
  }

  if (message.type === "youtube.current-state") {
    sendResponse(collectYouTubePlaybackState());
    return true;
  }

  return false;
});

async function collectPageProbe() {
  const bodyText = collectBodyText();
  const images = sortEditablePageImageCandidates(
    [
      ...Array.from(document.images).map(describePageImage),
      ...collectCssBackgroundImageCandidates(),
    ]
      .filter((image): image is EditablePageImageCandidate => image !== null),
  ).slice(0, 8);
  const adapterPayload = await collectAdapterPayload();

  return {
    rawCapture: {
      metadata: {
        url: window.location.href,
        title: document.title,
        domain: window.location.hostname,
      },
      selectedText: window.getSelection?.()?.toString().trim() ?? "",
      bodyText,
      images,
      adapterPayload,
      privacyFlags: {
        containsSensitiveFormData: Boolean(
          document.querySelector('input[type="password"], input[autocomplete="cc-number"], textarea'),
        ),
        userConsentedToHistory: false,
      },
    },
    features: {
      textLength: bodyText.length,
      imageCount: images.length,
      hasCanvas: document.querySelectorAll("canvas").length > 0,
      hasVideo: document.querySelectorAll("video").length > 0,
      hasDenseInteractiveUi: document.querySelectorAll("button, input, [role='button']").length > 15,
    },
    adapterActions: adapterPayload?.platform === "youtube"
      ? ["summarize-video", "summarize-current-timestamp", "draft-blog-post"]
      : [],
  };
}

function normalizeBrowserAutomationMode(value: unknown): BrowserAutomationMode {
  return value === "playwright" || value === "computer-use" ? value : "dom";
}

function showAiControlOverlay(mode: BrowserAutomationMode, label = "Codex is controlling this page"): void {
  clearAiControlOverlayTimers();
  ensureAiControlStyle();
  if (!aiControlOverlayNode) {
    removeStaleAiControlOverlays();
    aiControlOverlayNode = document.createElement("div");
    aiControlOverlayNode.className = "codex-ai-control-border";
    aiControlOverlayNode.setAttribute("aria-hidden", "true");
    const pill = document.createElement("div");
    pill.className = "codex-ai-control-pill";
    const modeLabel = document.createElement("span");
    modeLabel.className = "codex-ai-control-mode";
    const text = document.createElement("span");
    text.className = "codex-ai-control-label";
    pill.append(modeLabel, text);
    aiControlOverlayNode.append(pill);
    document.documentElement.append(aiControlOverlayNode);
  }

  aiControlOverlayNode.dataset.mode = mode;
  const modeLabel = aiControlOverlayNode.querySelector<HTMLElement>(".codex-ai-control-mode");
  const text = aiControlOverlayNode.querySelector<HTMLElement>(".codex-ai-control-label");
  if (modeLabel) {
    modeLabel.textContent = mode === "dom" ? "DOM" : mode === "playwright" ? "Playwright" : "Computer Use";
  }
  if (text) {
    text.textContent = label;
  }
  scheduleAiControlOverlayWatchdog();
}

function removeStaleAiControlOverlays(): void {
  for (const node of Array.from(document.querySelectorAll(".codex-ai-control-border"))) {
    if (node !== aiControlOverlayNode) {
      node.remove();
    }
  }
}

function hideAiControlOverlay(): void {
  clearAiControlOverlayTimers();
  aiControlOverlayNode?.remove();
  aiControlOverlayNode = null;
}

function scheduleHideAiControlOverlay(delayMs: number): void {
  clearAiControlOverlayTimers();
  if (delayMs <= 0) {
    hideAiControlOverlay();
    return;
  }
  aiControlOverlayTimer = window.setTimeout(() => {
    hideAiControlOverlay();
    aiControlOverlayTimer = null;
  }, Math.max(0, delayMs));
}

function scheduleAiControlOverlayWatchdog(): void {
  if (aiControlOverlayWatchdogTimer !== null) {
    window.clearTimeout(aiControlOverlayWatchdogTimer);
  }
  aiControlOverlayWatchdogTimer = window.setTimeout(() => {
    aiControlOverlayWatchdogTimer = null;
    scheduleHideAiControlOverlay(0);
  }, AI_CONTROL_OVERLAY_MAX_MS);
}

function clearAiControlOverlayTimers(): void {
  if (aiControlOverlayTimer !== null) {
    window.clearTimeout(aiControlOverlayTimer);
    aiControlOverlayTimer = null;
  }
  if (aiControlOverlayWatchdogTimer !== null) {
    window.clearTimeout(aiControlOverlayWatchdogTimer);
    aiControlOverlayWatchdogTimer = null;
  }
}

function ensureAiControlStyle(): void {
  if (document.getElementById("codex-ai-control-style")) {
    return;
  }
  const style = document.createElement("style");
  style.id = "codex-ai-control-style";
  style.textContent = `
    @keyframes codexAiControlPulse {
      0%, 100% {
        box-shadow: 0 0 0 1px rgba(84, 155, 255, 0.46), 0 0 30px rgba(84, 155, 255, 0.22), inset 0 0 22px rgba(84, 155, 255, 0.1);
      }
      50% {
        box-shadow: 0 0 0 2px rgba(84, 155, 255, 0.62), 0 0 58px rgba(84, 155, 255, 0.36), inset 0 0 34px rgba(84, 155, 255, 0.16);
      }
    }
    @keyframes codexAiControlAura {
      0%, 100% {
        opacity: 0.46;
        transform: scale(1);
      }
      50% {
        opacity: 0.82;
        transform: scale(1.012);
      }
    }
    .codex-ai-control-border {
      position: fixed;
      inset: 6px;
      z-index: 2147483647;
      pointer-events: none;
      border: 1px solid rgba(84, 155, 255, 0.78);
      border-radius: 16px;
      animation: codexAiControlPulse 2.8s ease-in-out infinite;
      box-sizing: border-box;
    }
    .codex-ai-control-border::before {
      content: "";
      position: fixed;
      inset: 0;
      pointer-events: none;
      border-radius: 20px;
      background:
        radial-gradient(circle at 12% 8%, rgba(84, 155, 255, 0.32), transparent 28%),
        radial-gradient(circle at 88% 12%, rgba(90, 200, 255, 0.22), transparent 30%),
        radial-gradient(circle at 50% 100%, rgba(84, 155, 255, 0.24), transparent 36%);
      filter: blur(18px);
      animation: codexAiControlAura 3.6s ease-in-out infinite;
    }
    .codex-ai-control-pill {
      position: absolute;
      z-index: 1;
      left: 50%;
      bottom: 18px;
      transform: translateX(-50%);
      display: inline-flex;
      align-items: center;
      gap: 10px;
      max-width: min(720px, calc(100vw - 48px));
      padding: 10px 14px;
      border-radius: 16px;
      background: rgba(15, 23, 42, 0.94);
      color: #f8fafc;
      font: 600 13px/1.35 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      box-shadow: 0 16px 44px rgba(15, 23, 42, 0.34);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .codex-ai-control-mode {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 44px;
      padding: 5px 8px;
      border-radius: 10px;
      background: rgba(59, 130, 246, 0.95);
      color: #ffffff;
      font-size: 12px;
      letter-spacing: 0.01em;
    }
    .codex-ai-control-label {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  `;
  document.documentElement.append(style);
}

async function collectAdapterPayload(): Promise<Record<string, unknown> | null> {
  if (isYouTubeUrl(window.location.href)) {
    return collectYouTubeAdapterPayload();
  }
  if (isArxivUrl(window.location.href)) {
    return collectArxivAdapterPayload(document, window.location.href);
  }
  if (isLikelyPdfUrl(window.location.href, document.title)) {
    return collectPdfAdapterPayload(document, window.location.href, document.title);
  }
  if (isGoogleWorkspaceUrl(window.location.href)) {
    const workspacePayload = await collectGoogleWorkspaceAdapterPayload({
      url: window.location.href,
      title: document.title,
      documentText: collectBodyText(),
    });
    if (workspacePayload) {
      return workspacePayload;
    }
  }
  const payload = createSitePayload({
    title: document.title,
    url: window.location.href,
  });
  if (!payload) {
    return null;
  }
  return {
    ...payload,
    selectedText: window.getSelection?.()?.toString().trim() ?? "",
  };
}

function collectCssBackgroundImageCandidates(): Array<EditablePageImageCandidate | null> {
  const elements = [
    ...(document.body ? [document.body] : []),
    ...Array.from(document.querySelectorAll<HTMLElement>("body *")),
  ];

  return elements
    .slice(0, 800)
    .flatMap((element) => {
      if (!isElementVisible(element)) {
        return [];
      }
      const rect = element.getBoundingClientRect();
      if (rect.width < 48 || rect.height < 48) {
        return [];
      }
      const urls = extractCssImageUrls(window.getComputedStyle(element).backgroundImage || "");
      if (!urls.length) {
        return [];
      }
      return urls.map((url) => describeElementImage(resolvePageImageUrl(url), element));
    });
}

function describePageImage(image: HTMLImageElement): EditablePageImageCandidate | null {
  const url = image.currentSrc || image.src;
  if (!url) {
    return null;
  }

  const rect = image.getBoundingClientRect();
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const visibleLeft = clamp(rect.left, 0, viewportWidth);
  const visibleTop = clamp(rect.top, 0, viewportHeight);
  const visibleRight = clamp(rect.right, 0, viewportWidth);
  const visibleBottom = clamp(rect.bottom, 0, viewportHeight);
  const visibleWidth = Math.max(0, visibleRight - visibleLeft);
  const visibleHeight = Math.max(0, visibleBottom - visibleTop);
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const viewportCenterX = viewportWidth / 2;
  const viewportCenterY = viewportHeight / 2;
  const alt = image.alt.trim();

  return {
    url,
    ...(alt ? { alt } : {}),
    ...(image.naturalWidth ? { width: image.naturalWidth, naturalWidth: image.naturalWidth } : {}),
    ...(image.naturalHeight ? { height: image.naturalHeight, naturalHeight: image.naturalHeight } : {}),
    renderedWidth: rect.width,
    renderedHeight: rect.height,
    visibleArea: visibleWidth * visibleHeight,
    distanceFromViewportCenter: Math.hypot(centerX - viewportCenterX, centerY - viewportCenterY),
    viewportRect: {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    },
    viewportWidth,
    viewportHeight,
    devicePixelRatio: window.devicePixelRatio || 1,
  };
}

function describeElementImage(url: string, element: HTMLElement): EditablePageImageCandidate | null {
  if (!url || url.startsWith("data:image/svg")) {
    return null;
  }
  const rect = element.getBoundingClientRect();
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth || 0;
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 0;
  const visibleLeft = clamp(rect.left, 0, viewportWidth);
  const visibleTop = clamp(rect.top, 0, viewportHeight);
  const visibleRight = clamp(rect.right, 0, viewportWidth);
  const visibleBottom = clamp(rect.bottom, 0, viewportHeight);
  const visibleWidth = Math.max(0, visibleRight - visibleLeft);
  const visibleHeight = Math.max(0, visibleBottom - visibleTop);
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;
  const viewportCenterX = viewportWidth / 2;
  const viewportCenterY = viewportHeight / 2;

  return {
    url,
    renderedWidth: rect.width,
    renderedHeight: rect.height,
    visibleArea: visibleWidth * visibleHeight,
    distanceFromViewportCenter: Math.hypot(centerX - viewportCenterX, centerY - viewportCenterY),
    viewportRect: {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    },
    viewportWidth,
    viewportHeight,
    devicePixelRatio: window.devicePixelRatio || 1,
  };
}

function resolvePageImageUrl(url: string): string {
  try {
    return new URL(url, document.baseURI).href;
  } catch {
    return url;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function installImagePromptHover(): void {
  if (imagePromptHoverInstalled) {
    return;
  }
  imagePromptHoverInstalled = true;
  document.addEventListener("pointerover", handleImagePromptPointerOver, true);
  document.addEventListener("pointerout", handleImagePromptPointerOut, true);
  document.addEventListener("pointermove", handleImagePromptPointerMove, true);
  document.addEventListener("scroll", hideImagePromptHoverButton, true);
}

function handleImagePromptPointerOver(event: PointerEvent): void {
  const target = event.target;
  if (!(target instanceof HTMLImageElement) || !isPromptExtractableImage(target)) {
    return;
  }
  showImagePromptHoverButton(target);
}

function handleImagePromptPointerOut(event: PointerEvent): void {
  if (event.target !== imagePromptHoverTarget) {
    return;
  }
  const relatedTarget = event.relatedTarget;
  if (relatedTarget instanceof Node && imagePromptHoverButton?.contains(relatedTarget)) {
    return;
  }
  scheduleHideImagePromptHoverButton();
}

function handleImagePromptPointerMove(event: PointerEvent): void {
  const target = event.target;
  if (target instanceof HTMLImageElement && isPromptExtractableImage(target)) {
    showImagePromptHoverButton(target);
    return;
  }
  if (!imagePromptHoverTarget || imagePromptHoverButton?.hidden) {
    return;
  }
  if (isPointerInsideImagePromptHoverSurface(event.clientX, event.clientY)) {
    clearImagePromptHoverHideTimer();
    return;
  }
  scheduleHideImagePromptHoverButton();
}

function isPointerInsideImagePromptHoverSurface(clientX: number, clientY: number): boolean {
  return (
    isPointInsideElementRect(imagePromptHoverTarget, clientX, clientY) ||
    isPointInsideElementRect(imagePromptHoverButton, clientX, clientY)
  );
}

function isPointInsideElementRect(element: Element | null, clientX: number, clientY: number): boolean {
  if (!element) {
    return false;
  }
  const rect = element.getBoundingClientRect();
  return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
}

function isPromptExtractableImage(image: HTMLImageElement): boolean {
  const source = resolvePageImageUrl(image.currentSrc || image.src || "");
  if (!/^https?:\/\//iu.test(source)) {
    return false;
  }
  const rect = image.getBoundingClientRect();
  return rect.width >= 80 && rect.height >= 80;
}

function showImagePromptHoverButton(image: HTMLImageElement): void {
  imagePromptHoverTarget = image;
  clearImagePromptHoverHideTimer();
  const button = getImagePromptHoverButton();
  positionImagePromptHoverButton(image, button);
  button.hidden = false;
}

function getImagePromptHoverButton(): HTMLButtonElement {
  if (imagePromptHoverButton) {
    return imagePromptHoverButton;
  }

  const button = document.createElement("button");
  button.type = "button";
  button.className = "chromex-image-prompt-button";
  button.title = "Extract image prompt";
  button.setAttribute("aria-label", "Extract image prompt");
  const icon = document.createElement("img");
  icon.alt = "";
  icon.src = chrome.runtime.getURL("icons/codex-32.png");
  Object.assign(icon.style, {
    width: "22px",
    height: "22px",
    display: "block",
    pointerEvents: "none",
  });
  button.appendChild(icon);
  Object.assign(button.style, {
    position: "fixed",
    zIndex: "2147483647",
    width: "34px",
    height: "34px",
    display: "grid",
    placeItems: "center",
    border: "1px solid rgba(255,255,255,0.28)",
    borderRadius: "999px",
    background: "rgba(17, 24, 39, 0.92)",
    color: "#ffffff",
    boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
    cursor: "pointer",
    padding: "0",
  });
  button.hidden = true;
  button.addEventListener("pointerover", () => {
    clearImagePromptHoverHideTimer();
  });
  button.addEventListener("pointerleave", scheduleHideImagePromptHoverButton);
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    void extractPromptFromHoveredImage();
  });
  document.documentElement.appendChild(button);
  imagePromptHoverButton = button;
  return button;
}

function positionImagePromptHoverButton(image: HTMLImageElement, button: HTMLButtonElement): void {
  const rect = image.getBoundingClientRect();
  const left = clamp(rect.right - 42, 8, window.innerWidth - 42);
  const top = clamp(rect.top + 8, 8, window.innerHeight - 42);
  button.style.left = `${left}px`;
  button.style.top = `${top}px`;
}

function scheduleHideImagePromptHoverButton(): void {
  if (imagePromptHoverHideTimer) {
    return;
  }
  imagePromptHoverHideTimer = window.setTimeout(hideImagePromptHoverButton, 120);
}

function hideImagePromptHoverButton(): void {
  clearImagePromptHoverHideTimer();
  if (imagePromptHoverButton) {
    imagePromptHoverButton.hidden = true;
  }
  imagePromptHoverTarget = null;
}

function clearImagePromptHoverHideTimer(): void {
  if (imagePromptHoverHideTimer) {
    window.clearTimeout(imagePromptHoverHideTimer);
    imagePromptHoverHideTimer = null;
  }
}

async function extractPromptFromHoveredImage(): Promise<void> {
  const image = imagePromptHoverTarget;
  if (!image) {
    return;
  }
  const imageUrl = resolvePageImageUrl(image.currentSrc || image.src || "");
  if (!/^https?:\/\//iu.test(imageUrl)) {
    return;
  }
  hideImagePromptHoverButton();
  await chrome.runtime.sendMessage({
    type: "page.image-prompt.extract",
    imageUrl,
    imageCandidate: describePageImage(image),
  });
}

async function applyImageOverlay(previewRef: string): Promise<void> {
  const resolvedPreviewRef = await resolveImagePreviewRefForUi(previewRef, (payload) =>
    chrome.runtime.sendMessage(payload) as Promise<{
      dataBase64: string;
      mimeType: string;
      sizeBytes: number;
      offset: number;
      nextOffset: number;
      done: boolean;
    }>,
  );
  clearImageOverlay();

  overlayNode = document.createElement("div");
  overlayNode.style.position = "fixed";
  overlayNode.style.inset = "24px";
  overlayNode.style.zIndex = "2147483647";
  overlayNode.style.background = "rgba(10, 14, 18, 0.92)";
  overlayNode.style.border = "1px solid rgba(255,255,255,0.12)";
  overlayNode.style.borderRadius = "20px";
  overlayNode.style.boxShadow = "0 24px 80px rgba(0,0,0,0.35)";
  overlayNode.style.display = "grid";
  overlayNode.style.placeItems = "center";
  overlayNode.style.padding = "24px";
  overlayNode.addEventListener("click", clearImageOverlay);

  const image = document.createElement("img");
  image.src = resolvedPreviewRef;
  image.style.maxWidth = "100%";
  image.style.maxHeight = "100%";
  image.style.objectFit = "contain";
  image.style.borderRadius = "16px";

  overlayNode.appendChild(image);
  document.documentElement.appendChild(overlayNode);
}

function clearImageOverlay(): void {
  overlayNode?.remove();
  overlayNode = null;
}

function handlePageNavigation(command: VoiceNavigationCommand): { ok: boolean; matched?: boolean } {
  switch (command.kind) {
    case "scroll":
      if (command.direction === "top") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else if (command.direction === "bottom") {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
      } else {
        window.scrollBy({
          top: (command.direction === "down" ? 1 : -1) * window.innerHeight * 0.85,
          behavior: "smooth",
        });
      }
      return { ok: true };
    case "highlight": {
      const match = findBestMatchingElement(command.query);
      if (!match) {
        return { ok: true, matched: false };
      }

      clearHighlights();
      match.style.outline = "3px solid rgba(212, 95, 51, 0.92)";
      match.style.outlineOffset = "6px";
      match.style.background = "rgba(255, 230, 204, 0.55)";
      match.style.transition = "outline-color 180ms ease, background 180ms ease";
      match.scrollIntoView({ block: "center", behavior: "smooth" });
      highlightedElements.add(match);
      return { ok: true, matched: true };
    }
    case "clear-highlights":
      clearHighlights();
      return { ok: true };
  }
}

function collectBrowserDomSnapshot(): BrowserDomSnapshot {
  domActionElementRefs.clear();
  const elements = collectInteractiveElements()
    .slice(0, 80)
    .map<BrowserDomElementSnapshot>((element, index) => {
      const ref = `dom-${index + 1}`;
      domActionElementRefs.set(ref, element);
      return describeDomActionElement(ref, element);
    });

  return {
    metadata: {
      url: window.location.href,
      title: document.title,
      domain: window.location.hostname,
    },
    elements,
    capabilities: {
      supportsDomAutomation: true,
      supportsVisualControlIndicator: true,
      preferredAutomationMode: "dom",
    },
  };
}

async function performBrowserDomActions(steps: BrowserDomActionStep[]): Promise<BrowserDomActionResult> {
  aiControlCancelled = false;
  showAiControlOverlay("dom", "Codex is controlling this page");
  const results: BrowserDomActionResult["results"] = [];
  try {
    for (const step of steps.slice(0, 4)) {
      await waitForDomActionTick();
      if (aiControlCancelled) {
        results.push({
          step,
          ok: false,
          message: "Browser control was stopped by the user.",
        });
        return {
          ok: false,
          summary: "Browser control was stopped.",
          results,
          controlMode: "dom",
          cancelled: true,
        };
      }
      results.push(await performBrowserDomAction(step));
    }
    return {
      ok: results.every((result) => result.ok),
      summary: summarizeDomActionResults(results),
      results,
      controlMode: "dom",
    };
  } finally {
    scheduleHideAiControlOverlay(0);
  }
}

function waitForDomActionTick(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });
}

function collectInteractiveElements(): HTMLElement[] {
  const selectors = [
    "button",
    "a[href]",
    'input:not([type="hidden"])',
    "textarea",
    "select",
    "summary",
    '[role="button"]',
    '[role="link"]',
    '[role="menuitem"]',
    '[role="option"]',
    '[role="checkbox"]',
    '[role="radio"]',
    '[role="switch"]',
    '[role="tab"]',
    '[role="textbox"]',
    '[aria-haspopup]',
    '[aria-controls]',
    '[aria-expanded]',
    '[aria-multiline="true"]',
    '[contenteditable="true"]',
    '[contenteditable="plaintext-only"]',
    '[data-lexical-editor="true"]',
    '[data-slate-editor="true"]',
    "[data-placeholder]",
    ".ProseMirror",
    ".ql-editor",
    "[tabindex]",
  ];

  return Array.from(document.querySelectorAll<HTMLElement>(selectors.join(",")))
    .filter((element) => isDomActionElementVisible(element) && !isDomActionElementDisabled(element))
    .sort((left, right) => {
      const leftRect = left.getBoundingClientRect();
      const rightRect = right.getBoundingClientRect();
      return leftRect.top - rightRect.top || leftRect.left - rightRect.left;
    });
}

function describeDomActionElement(ref: string, element: HTMLElement): BrowserDomElementSnapshot {
  const rect = element.getBoundingClientRect();
  const input = element instanceof HTMLInputElement ? element : null;
  const anchor = element instanceof HTMLAnchorElement ? element : null;
  const value = getElementValue(element);
  const placeholder = getElementPlaceholder(element);
  const ariaExpanded = element.getAttribute("aria-expanded") || "";
  const ariaHasPopup = element.getAttribute("aria-haspopup") || "";
  const ariaControls = element.getAttribute("aria-controls") || "";
  return {
    ref,
    role: element.getAttribute("role") || inferDomActionRole(element),
    tagName: element.tagName.toLowerCase(),
    label: getElementLabel(element),
    text: normalizeDomActionText(element.innerText || element.textContent || "").slice(0, 180),
    selector: buildElementSelector(element),
    ...(value ? { value } : {}),
    ...(anchor?.href ? { href: anchor.href } : {}),
    ...(input?.type ? { inputType: input.type } : {}),
    ...(placeholder ? { placeholder } : {}),
    ...(element.getAttribute("contenteditable") ? { contentEditable: element.getAttribute("contenteditable") ?? "" } : {}),
    ...(ariaExpanded ? { ariaExpanded } : {}),
    ...(ariaHasPopup ? { ariaHasPopup } : {}),
    ...(ariaControls ? { ariaControls } : {}),
    ...(element.tabIndex >= 0 ? { tabIndex: element.tabIndex } : {}),
    isTextEntryCandidate: isTextEntryCandidate(element),
    opensEditableSurface: opensEditableSurface(element),
    disabled: isDomActionElementDisabled(element),
    viewportRect: {
      left: Math.round(rect.left),
      top: Math.round(rect.top),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    },
  };
}

async function performBrowserDomAction(step: BrowserDomActionStep): Promise<BrowserDomActionResult["results"][number]> {
  try {
    if (step.action === "navigate") {
      performNavigateAction(step);
      return { step, ok: true, message: "Navigated the current page." };
    }

    const element = resolveDomActionTarget(step);
    if (!element && step.action !== "scroll") {
      return { step, ok: false, message: "Target element was not found." };
    }

    if (step.action === "scroll") {
      performScrollAction(element, step);
      return { step, ok: true, message: "Scrolled the page." };
    }

    if (!element || isDomActionElementDisabled(element)) {
      return { step, ok: false, message: "Target element is unavailable." };
    }

    element.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" });

    switch (step.action) {
      case "click":
        element.click();
        await waitForDomActionTick();
        return { step, ok: true, message: `Clicked ${getElementLabel(element) || "the target element"}.` };
      case "focus":
        element.focus();
        return { step, ok: true, message: `Focused ${getElementLabel(element) || "the target element"}.` };
      case "fill":
        await fillDomActionElement(element, step.value ?? "");
        return { step, ok: true, message: `Filled ${getElementLabel(element) || "the target field"}.` };
      case "select":
        selectDomActionElement(element, step.value ?? "");
        return { step, ok: true, message: `Selected a value for ${getElementLabel(element) || "the target field"}.` };
      case "submit":
        submitDomActionElement(element);
        return { step, ok: true, message: "Submitted the nearest form." };
      default:
        return { step, ok: false, message: "Unsupported action." };
    }
  } catch (error) {
    return { step, ok: false, message: error instanceof Error ? error.message : String(error) };
  }
}

function performNavigateAction(step: BrowserDomActionStep): void {
  const url = step.url || step.value || "";
  if (!url) {
    throw new Error("No navigation URL was provided.");
  }
  const destination = new URL(url, window.location.href);
  if (destination.protocol !== "http:" && destination.protocol !== "https:") {
    throw new Error("Only http and https page navigation is supported.");
  }
  window.location.assign(destination.href);
}

function resolveDomActionTarget(step: BrowserDomActionStep): HTMLElement | null {
  if (step.targetRef && domActionElementRefs.has(step.targetRef)) {
    return domActionElementRefs.get(step.targetRef) ?? null;
  }
  if (step.selector) {
    const element = document.querySelector(step.selector);
    return element instanceof HTMLElement ? element : null;
  }
  if (step.label) {
    const normalizedLabel = normalizeDomActionText(step.label).toLowerCase();
    return collectInteractiveElements().find((element) => getElementLabel(element).toLowerCase() === normalizedLabel) ?? null;
  }
  return null;
}

async function fillDomActionElement(element: HTMLElement, value: string): Promise<void> {
  const directTarget = resolveDirectEditableTarget(element);
  if (directTarget) {
    setEditableTargetValue(directTarget, value);
    return;
  }

  const activatedTarget = await resolveEditableTargetAfterActivation(element);
  if (activatedTarget) {
    setEditableTargetValue(activatedTarget, value);
    return;
  }

  throw new Error("Target element cannot be filled.");
}

function resolveDirectEditableTarget(element: HTMLElement): HTMLElement | HTMLInputElement | HTMLTextAreaElement | null {
  if (isTextEntryCandidate(element)) {
    return element;
  }
  const descendant = Array.from(element.querySelectorAll<HTMLElement | HTMLInputElement | HTMLTextAreaElement>(EDITOR_LIKE_SELECTOR))
    .find((candidate) => isTextEntryCandidate(candidate) && isDomActionElementVisible(candidate));
  return descendant ?? null;
}

async function resolveEditableTargetAfterActivation(element: HTMLElement): Promise<HTMLElement | HTMLInputElement | HTMLTextAreaElement | null> {
  const before = new Set(collectVisibleEditableTargets());
  element.focus();
  element.click();
  await waitForDomActionTick();

  const deadline = Date.now() + EDITOR_DISCOVERY_TIMEOUT_MS;
  while (Date.now() <= deadline) {
    const target = findNewEditableTarget(element, before);
    if (target) {
      return target;
    }
    await sleepDomActionTick(80);
  }
  return null;
}

function findNewEditableTarget(
  activatedElement: HTMLElement,
  before: Set<HTMLElement | HTMLInputElement | HTMLTextAreaElement>,
): HTMLElement | HTMLInputElement | HTMLTextAreaElement | null {
  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement && isTextEntryCandidate(activeElement) && isDomActionElementVisible(activeElement)) {
    return activeElement;
  }

  const directTarget = resolveDirectEditableTarget(activatedElement);
  if (directTarget) {
    return directTarget;
  }

  const candidates = collectVisibleEditableTargets();
  const newCandidate = candidates.find((candidate) => !before.has(candidate));
  if (newCandidate) {
    return newCandidate;
  }
  return candidates.find((candidate) => isLikelyEditorNearActivatedElement(candidate, activatedElement)) ?? null;
}

function collectVisibleEditableTargets(): Array<HTMLElement | HTMLInputElement | HTMLTextAreaElement> {
  return Array.from(document.querySelectorAll<HTMLElement | HTMLInputElement | HTMLTextAreaElement>(EDITOR_LIKE_SELECTOR))
    .filter((candidate) => isTextEntryCandidate(candidate) && isDomActionElementVisible(candidate));
}

function setEditableTargetValue(element: HTMLElement | HTMLInputElement | HTMLTextAreaElement, value: string): void {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    element.focus();
    setNativeTextControlValue(element, value);
    element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }
  if (isTextEntryCandidate(element)) {
    element.focus();
    if (element.isContentEditable) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(element);
      selection?.removeAllRanges();
      selection?.addRange(range);
      if (!document.execCommand("insertText", false, value)) {
        element.textContent = value;
      }
    } else {
      element.textContent = value;
    }
    element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }
  throw new Error("Target element cannot be filled.");
}

function setNativeTextControlValue(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");
  if (descriptor?.set) {
    descriptor.set.call(element, value);
    return;
  }
  element.value = value;
}

function sleepDomActionTick(delayMs: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs);
  });
}

function selectDomActionElement(element: HTMLElement, value: string): void {
  if (!(element instanceof HTMLSelectElement)) {
    throw new Error("Target element is not a select field.");
  }
  const normalizedValue = normalizeDomActionText(value).toLowerCase();
  const option = Array.from(element.options).find(
    (item) =>
      item.value.toLowerCase() === normalizedValue ||
      normalizeDomActionText(item.label || item.textContent || "").toLowerCase() === normalizedValue,
  );
  if (!option) {
    throw new Error("Requested select option was not found.");
  }
  element.value = option.value;
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

function submitDomActionElement(element: HTMLElement): void {
  const form = element instanceof HTMLFormElement ? element : element.closest("form");
  if (!form) {
    throw new Error("No form was found near the target element.");
  }
  if (typeof form.requestSubmit === "function") {
    form.requestSubmit();
    return;
  }
  form.submit();
}

function performScrollAction(element: HTMLElement | null, step: BrowserDomActionStep): void {
  const amount = step.amountPx ?? Math.round((window.innerHeight || 800) * 0.75);
  const target = element ?? window;
  const direction = step.direction ?? "down";
  if (target === window) {
    if (direction === "top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (direction === "bottom") {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
      return;
    }
    window.scrollBy({
      left: direction === "left" ? -amount : direction === "right" ? amount : 0,
      top: direction === "up" ? -amount : direction === "down" ? amount : 0,
      behavior: "smooth",
    });
    return;
  }

  target.scrollBy({
    left: direction === "left" ? -amount : direction === "right" ? amount : 0,
    top: direction === "up" ? -amount : direction === "down" ? amount : 0,
    behavior: "smooth",
  });
}

function getElementLabel(element: HTMLElement): string {
  const labelledBy = element.getAttribute("aria-labelledby");
  const labelledByText = labelledBy
    ? labelledBy
        .split(/\s+/u)
        .map((id) => document.getElementById(id)?.innerText || document.getElementById(id)?.textContent || "")
        .join(" ")
    : "";
  const inputLabels = element.id
    ? Array.from(document.querySelectorAll<HTMLLabelElement>(`label[for="${cssEscapeCompat(element.id)}"]`))
        .map((label) => label.innerText || label.textContent || "")
        .join(" ")
    : "";
  return normalizeDomActionText(
    element.getAttribute("aria-label") ||
      labelledByText ||
      inputLabels ||
      element.getAttribute("placeholder") ||
      element.getAttribute("title") ||
      (element instanceof HTMLInputElement ? element.value : "") ||
      element.innerText ||
      element.textContent ||
      "",
  ).slice(0, 160);
}

function getElementPlaceholder(element: HTMLElement): string {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return normalizeDomActionText(element.placeholder || "");
  }
  return normalizeDomActionText(
    element.getAttribute("placeholder") ||
      element.getAttribute("aria-placeholder") ||
      element.getAttribute("data-placeholder") ||
      "",
  );
}

function getElementValue(element: HTMLElement): string {
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
    return element.value.slice(0, 200);
  }
  return "";
}

function isTextEntryCandidate(element: HTMLElement): boolean {
  if (element instanceof HTMLTextAreaElement) {
    return true;
  }
  if (element instanceof HTMLInputElement) {
    const type = (element.type || "text").toLowerCase();
    return !["button", "checkbox", "color", "file", "hidden", "image", "radio", "range", "reset", "submit"].includes(type);
  }
  return (
    element.isContentEditable ||
    element.getAttribute("contenteditable") === "plaintext-only" ||
    element.getAttribute("role") === "textbox" ||
    element.getAttribute("aria-multiline") === "true" ||
    element.getAttribute("data-lexical-editor") === "true" ||
    element.getAttribute("data-slate-editor") === "true" ||
    element.classList.contains("ProseMirror") ||
    element.classList.contains("ql-editor")
  );
}

function opensEditableSurface(element: HTMLElement): boolean {
  if (isTextEntryCandidate(element)) {
    return false;
  }
  return (
    element instanceof HTMLButtonElement ||
    element.getAttribute("role") === "button" ||
    element.getAttribute("aria-haspopup") === "dialog" ||
    element.getAttribute("aria-haspopup") === "menu" ||
    Boolean(element.getAttribute("aria-controls")) ||
    Boolean(element.getAttribute("aria-expanded")) ||
    element.tabIndex >= 0
  );
}

function isLikelyEditorNearActivatedElement(candidate: HTMLElement, activatedElement: HTMLElement): boolean {
  if (activatedElement.contains(candidate)) {
    return true;
  }
  const candidateRect = candidate.getBoundingClientRect();
  const activatedRect = activatedElement.getBoundingClientRect();
  const candidateCenterX = candidateRect.left + candidateRect.width / 2;
  const candidateCenterY = candidateRect.top + candidateRect.height / 2;
  const activatedCenterX = activatedRect.left + activatedRect.width / 2;
  const activatedCenterY = activatedRect.top + activatedRect.height / 2;
  return Math.hypot(candidateCenterX - activatedCenterX, candidateCenterY - activatedCenterY) < Math.max(window.innerHeight, 720);
}

function inferDomActionRole(element: HTMLElement): string {
  if (element instanceof HTMLButtonElement) {
    return "button";
  }
  if (element instanceof HTMLAnchorElement) {
    return "link";
  }
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    return "textbox";
  }
  if (element instanceof HTMLSelectElement) {
    return "combobox";
  }
  return element.isContentEditable ? "textbox" : element.tagName.toLowerCase();
}

function isDomActionElementDisabled(element: HTMLElement): boolean {
  return (
    element.getAttribute("aria-disabled") === "true" ||
    (element instanceof HTMLButtonElement && element.disabled) ||
    (element instanceof HTMLInputElement && element.disabled) ||
    (element instanceof HTMLTextAreaElement && element.disabled) ||
    (element instanceof HTMLSelectElement && element.disabled)
  );
}

function isDomActionElementVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) {
    return false;
  }
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0 && rect.bottom >= 0 && rect.right >= 0 && rect.top <= window.innerHeight && rect.left <= window.innerWidth;
}

function buildElementSelector(element: HTMLElement): string {
  if (element.id) {
    return `#${cssEscapeCompat(element.id)}`;
  }
  const parts: string[] = [];
  let current: Element | null = element;
  while (current && current instanceof HTMLElement && current !== document.body && parts.length < 5) {
    const tag = current.tagName.toLowerCase();
    const parent: HTMLElement | null = current.parentElement;
    if (!parent) {
      parts.unshift(tag);
      break;
    }
    const currentTagName = current.tagName;
    const siblings = (Array.from(parent.children) as Element[]).filter((child) => child.tagName === currentTagName);
    const index = siblings.indexOf(current) + 1;
    parts.unshift(siblings.length > 1 ? `${tag}:nth-of-type(${index})` : tag);
    current = parent;
  }
  return parts.join(" > ");
}

function cssEscapeCompat(value: string): string {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return value.replace(/["\\#.:,[\]>+~*]/gu, "\\$&");
}

function summarizeDomActionResults(results: BrowserDomActionResult["results"]): string {
  const okCount = results.filter((result) => result.ok).length;
  if (okCount === results.length) {
    return "Requested browser action completed.";
  }
  if (okCount > 0) {
    return `Partially completed ${okCount} of ${results.length} browser actions.`;
  }
  return "No browser action was completed.";
}

function normalizeDomActionText(value: string): string {
  return value.replace(/\s+/gu, " ").trim();
}

function findBestMatchingElement(query: string): HTMLElement | null {
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(
      "main, article, section, h1, h2, h3, h4, h5, h6, p, li, dt, dd, a, button, label, figcaption, td, th",
    ),
  );
  let best: { element: HTMLElement; score: number } | null = null;

  for (const element of candidates) {
    const text = element.innerText?.replace(/\s+/g, " ").trim();
    if (!text) {
      continue;
    }
    if (!isElementVisible(element)) {
      continue;
    }

    const lower = text.toLowerCase();
    if (!lower.includes(normalized)) {
      continue;
    }

    const score = Math.abs(text.length - normalized.length);
    if (!best || score < best.score) {
      best = { element, score };
    }
  }

  return best?.element ?? null;
}

function clearHighlights(): void {
  for (const element of highlightedElements) {
    element.style.outline = "";
    element.style.outlineOffset = "";
    element.style.background = "";
    element.style.transition = "";
  }
  highlightedElements.clear();
}

function isElementVisible(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  return style.visibility !== "hidden" && style.display !== "none" && rect.width > 0 && rect.height > 0;
}
