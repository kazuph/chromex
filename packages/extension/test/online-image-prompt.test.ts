import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import { createOnlineImagePromptExtractionPrompt } from "../src/sidepanel/online-image-prompt.js";

const contentSource = readFileSync(resolve(process.cwd(), "src/content/index.ts"), "utf8");
const backgroundSource = readFileSync(resolve(process.cwd(), "src/background/index.ts"), "utf8");
const sidepanelSource = readFileSync(resolve(process.cwd(), "src/sidepanel/index.ts"), "utf8");

function getFunctionSource(source: string, name: string): string {
  const startMatch = new RegExp(`(?:async\\s+)?function\\s+${name}\\b`, "u").exec(source);
  const start = startMatch?.index ?? -1;
  if (start < 0) {
    return "";
  }
  const rest = source.slice(start + 1);
  const nextMatch = /\n(?:async\s+)?function\s+/u.exec(rest);
  return nextMatch ? source.slice(start, start + 1 + nextMatch.index) : source.slice(start);
}

describe("online image prompt extraction", () => {
  test("builds a prompt that asks for a reusable generation prompt from the attached image", () => {
    const prompt = createOnlineImagePromptExtractionPrompt({
      alt: "product launch poster",
      pageTitle: "Launch gallery",
      pageUrl: "https://example.com/gallery",
      responseLanguage: "ko",
    });

    expect(prompt).toContain("첨부한 온라인 이미지를 분석");
    expect(prompt).toContain("이미지 생성 프롬프트");
    expect(prompt).toContain("응답은 한국어로");
    expect(prompt).toContain("코드블럭");
    expect(prompt).toContain("product launch poster");
    expect(prompt).toContain("Launch gallery");
    expect(prompt).toContain("https://example.com/gallery");
    expect(prompt).not.toContain("한 줄짜리");
  });

  test("wires the hover icon click through background into an auto-sent sidepanel prompt", () => {
    expect(contentSource).toContain('message.type === "page.image-prompt-hover.install"');
    expect(contentSource).toContain('type: "page.image-prompt.extract"');
    expect(contentSource).toContain("imageCandidate: describePageImage(image)");
    expect(contentSource).toContain("chromex-image-prompt-button");
    expect(contentSource).toContain('chrome.runtime.getURL("icons/codex-32.png")');
    expect(contentSource).not.toContain('button.textContent = "✦"');
    expect(contentSource).toContain('document.addEventListener("pointerout"');
    expect(contentSource).toContain('document.addEventListener("pointermove", handleImagePromptPointerMove, true)');
    expect(contentSource).toContain("handleImagePromptPointerOut");
    expect(contentSource).toContain("function handleImagePromptPointerOut");
    expect(contentSource).toContain("function handleImagePromptPointerMove");
    expect(contentSource).toContain("function isPointerInsideImagePromptHoverSurface");
    expect(backgroundSource).toContain("function installImagePromptHoverForTab");
    expect(backgroundSource).toContain("void installImagePromptHoverForTab(activeTab)");
    expect(backgroundSource).toContain('case "page.image-prompt-hover.install"');
    expect(backgroundSource).toContain('case "page.image-prompt.extract"');
    expect(backgroundSource).toContain("chrome.sidePanel.open");
    expect(backgroundSource).toContain('pendingImagePromptExtraction');
    expect(sidepanelSource).toContain('message.type === "ui.image-prompt.extract"');
    expect(sidepanelSource).toContain("handleOnlineImagePromptExtraction");
    expect(sidepanelSource).toContain("await startNewChat()");
    expect(sidepanelSource).toContain("createRemoteImageAttachment");
    expect(sidepanelSource).toContain("normalizeOnlineImagePromptAttachment");
    expect(sidepanelSource).toContain("await sendPrompt(prompt)");
  });

  test("removes stale hover buttons from the page instead of leaving hidden DOM behind", () => {
    expect(contentSource).toContain("function removeImagePromptHoverButtons");
    expect(contentSource).toContain("removeImagePromptHoverButtons(button)");
    expect(contentSource).toContain("button.remove()");
    expect(contentSource).toContain('document.addEventListener("pointerleave", hideImagePromptHoverButton, true)');
    expect(contentSource).toContain('window.addEventListener("blur", hideImagePromptHoverButton)');
    expect(contentSource).toContain("scheduleImagePromptHoverButtonPrune(button)");
  });

  test("keeps the hover button stable while the pointer moves from the image onto the button", () => {
    const pointerOutHandler = getFunctionSource(contentSource, "handleImagePromptPointerOut");
    expect(pointerOutHandler).toContain("scheduleHideImagePromptHoverButton()");
    expect(pointerOutHandler).not.toContain("hideImagePromptHoverButton();");
    const pointerMoveHandler = getFunctionSource(contentSource, "handleImagePromptPointerMove");
    expect(pointerMoveHandler).toContain("scheduleHideImagePromptHoverButton()");
    expect(pointerMoveHandler).not.toContain("hideImagePromptHoverButton();");
    expect(contentSource).toContain('button.addEventListener("pointerenter", clearImagePromptHoverHideTimer)');
    expect(contentSource).toContain('button.addEventListener("pointerover", clearImagePromptHoverHideTimer)');
  });

  test("rechecks the pointer location before removing a scheduled hover button", () => {
    const scheduleHide = getFunctionSource(contentSource, "scheduleHideImagePromptHoverButton");
    const conditionalHide = getFunctionSource(contentSource, "hideImagePromptHoverButtonIfPointerOutsideSurface");
    const hideButton = getFunctionSource(contentSource, "hideImagePromptHoverButton");

    expect(contentSource).toContain("let imagePromptHoverPointer");
    expect(scheduleHide).toContain("hideImagePromptHoverButtonIfPointerOutsideSurface");
    expect(conditionalHide).toContain("isPointerInsideImagePromptHoverSurface");
    expect(conditionalHide).toContain("return;");
    expect(conditionalHide).toContain("hideImagePromptHoverButton();");
    expect(hideButton).toContain("imagePromptHoverPointer = null");
  });

  test("opens the side panel before async storage work and avoids extra page context", () => {
    const messageListenerStart = backgroundSource.indexOf("chrome.runtime.onMessage.addListener");
    const fastExtractPath = backgroundSource.indexOf('message.type === "page.image-prompt.extract"', messageListenerStart);
    expect(fastExtractPath).toBeGreaterThanOrEqual(0);
    expect(fastExtractPath).toBeLessThan(backgroundSource.indexOf("await ensureStateLoaded()", messageListenerStart));

    const backgroundHandler = getFunctionSource(backgroundSource, "handlePageImagePromptExtraction");
    expect(backgroundHandler).toContain("sidePanelOpenPromise = chrome.sidePanel.open");
    expect(backgroundHandler.indexOf("sidePanelOpenPromise = chrome.sidePanel.open")).toBeLessThan(
      backgroundHandler.indexOf("createOnlineImagePromptAttachment(extraction, tab)"),
    );
    expect(backgroundHandler).toContain("await chrome.storage.session.set");
    expect(backgroundHandler).toContain("await sidePanelOpenPromise");
    expect(backgroundHandler.indexOf("await sidePanelOpenPromise")).toBeGreaterThan(
      backgroundHandler.indexOf("await chrome.storage.session.set"),
    );

    const clickHandler = getFunctionSource(contentSource, "extractPromptFromHoveredImage");
    expect(clickHandler).toContain('type: "page.image-prompt.extract"');
    expect(clickHandler).toContain("imageUrl,");
    expect(clickHandler).toContain("imageCandidate: describePageImage(image)");
    expect(clickHandler).not.toContain("pageTitle: document.title");
    expect(clickHandler).not.toContain("pageUrl: window.location.href");
    expect(clickHandler).not.toContain("alt: image.alt.trim()");
  });

  test("materializes the hovered image into an actual image attachment for the prompt", () => {
    const backgroundHandler = getFunctionSource(backgroundSource, "handlePageImagePromptExtraction");
    expect(backgroundHandler).toContain("createOnlineImagePromptAttachment(extraction, tab)");
    expect(backgroundHandler).toContain("attachment ? { ...extraction, attachment } : extraction");

    expect(backgroundSource).toContain("function capturePromptVisibleImage");
    expect(backgroundSource).toContain("cropVisibleTabDataUrlToImageCandidate");
    expect(backgroundSource).toContain("base64: input.base64");
    expect(backgroundSource).toContain("sourceUrl: extraction.imageUrl");

    const sidepanelHandler = getFunctionSource(sidepanelSource, "handleOnlineImagePromptExtraction");
    expect(sidepanelHandler).toContain("extraction.attachment ?? createRemoteImageAttachment(extraction.imageUrl)");
    expect(sidepanelHandler.indexOf("state.fileAttachments = [attachment]")).toBeLessThan(
      sidepanelHandler.indexOf("await sendPrompt(prompt)"),
    );
  });
});
