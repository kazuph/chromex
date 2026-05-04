import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

import {
  buildConferenceModeContextHint,
  buildConferenceModeTranslatedContextHint,
  createConferenceModeTranslationRequestEvent,
  mergeConferenceModeTranscriptEntry,
  parseConferenceModeAssistantText,
  type ConferenceTranscriptEntry,
} from "../src/sidepanel/conference-mode.js";

const sidepanelSource = readFileSync(resolve(process.cwd(), "src/sidepanel/index.ts"), "utf8");
const sidepanelCss = readFileSync(resolve(process.cwd(), "public/sidepanel.css"), "utf8").replace(
  /\/\*[\s\S]*?\*\//g,
  "",
);

function extractFunctionBody(name: string): string {
  const startMatch = new RegExp(`(?:async\\s+)?function\\s+${name}\\s*\\(`, "u").exec(sidepanelSource);
  const start = startMatch?.index ?? -1;
  expect(start).toBeGreaterThanOrEqual(0);
  const paramsStart = sidepanelSource.indexOf("(", start);
  expect(paramsStart).toBeGreaterThanOrEqual(0);
  let parenDepth = 0;
  let signatureEnd = -1;
  for (let index = paramsStart; index < sidepanelSource.length; index += 1) {
    const char = sidepanelSource[index];
    if (char === "(") {
      parenDepth += 1;
    } else if (char === ")") {
      parenDepth -= 1;
      if (parenDepth === 0) {
        signatureEnd = index;
        break;
      }
    }
  }
  expect(signatureEnd).toBeGreaterThanOrEqual(0);
  const braceStart = sidepanelSource.indexOf("{", signatureEnd);
  expect(braceStart).toBeGreaterThanOrEqual(0);
  let depth = 0;
  for (let index = braceStart; index < sidepanelSource.length; index += 1) {
    const char = sidepanelSource[index];
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return sidepanelSource.slice(braceStart + 1, index);
      }
    }
  }
  throw new Error(`Unable to extract ${name}`);
}

function readFinalDeclaration(selector: string, property: string): string {
  const blockPattern = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  let value = "";

  while ((match = blockPattern.exec(sidepanelCss))) {
    const selectorList = (match[1] ?? "")
      .split(",")
      .map((item) => item.trim());
    if (!selectorList.includes(selector)) {
      continue;
    }

    const declarations = match[2] ?? "";
    for (const declaration of declarations.split(";")) {
      const [name, ...rawValue] = declaration.split(":");
      if (name?.trim() === property) {
        value = rawValue.join(":").trim();
      }
    }
  }

  return value;
}

describe("conference mode", () => {
  test("parses labeled assistant translation output", () => {
    expect(
      parseConferenceModeAssistantText(`ORIGINAL: We need to answer now.\nKOREAN: 이제 답변해야 합니다.`),
    ).toEqual({
      sourceText: "We need to answer now.",
      translationText: "이제 답변해야 합니다.",
    });
  });

  test("attaches assistant translations to the latest source transcript", () => {
    const entries: ConferenceTranscriptEntry[] = [
      {
        id: "conference-transcript-1",
        sourceText: "We need to answer now.",
        translationText: "",
        createdAt: 100,
      },
    ];

    const next = mergeConferenceModeTranscriptEntry(entries, {
      sourceText: "",
      translationText: "이제 답변해야 합니다.",
      createdAt: 110,
    });

    expect(next).toEqual([
      {
        id: "conference-transcript-1",
        sourceText: "We need to answer now.",
        translationText: "이제 답변해야 합니다.",
        createdAt: 100,
      },
    ]);
  });

  test("does not add a second translation-only card when the same translation already exists", () => {
    const entries: ConferenceTranscriptEntry[] = [
      {
        id: "conference-transcript-1",
        sourceText: "But then, a team of researchers introduced a new model known as the transformer.",
        translationText: "하지만 그때 한 연구팀이 '트랜스포머'라고 알려진 새로운 모델을 도입했습니다.",
        createdAt: 100,
      },
    ];

    const next = mergeConferenceModeTranscriptEntry(entries, {
      sourceText: "",
      translationText: "하지만 그때 한 연구팀이 '트랜스포머'라고 알려진 새로운 모델을 도입했습니다.",
      createdAt: 120,
    });

    expect(next).toEqual(entries);
  });

  test("builds hidden chat context from recent conference transcript", () => {
    const hint = buildConferenceModeContextHint([
      {
        id: "conference-transcript-1",
        sourceText: "We should decide the launch scope.",
        translationText: "출시 범위를 결정해야 합니다.",
        createdAt: 100,
      },
    ]);

    expect(hint).toContain("Live conference transcript context:");
    expect(hint).toContain("Original: We should decide the launch scope.");
    expect(hint).toContain("Korean: 출시 범위를 결정해야 합니다.");
  });

  test("builds conference question context from translated transcript only", () => {
    const hint = buildConferenceModeTranslatedContextHint([
      {
        id: "conference-transcript-1",
        sourceText: "We should decide the launch scope.",
        translationText: "출시 범위를 결정해야 합니다.",
        createdAt: 100,
      },
    ]);

    expect(hint).toContain("Translated conference transcript context:");
    expect(hint).toContain("출시 범위를 결정해야 합니다.");
    expect(hint).not.toContain("We should decide the launch scope.");
    expect(hint).not.toContain("Original:");
  });

  test("creates realtime response requests for Korean translation", () => {
    const event = createConferenceModeTranslationRequestEvent("We should decide the launch scope.");

    expect(event).toMatchObject({
      type: "response.create",
      response: expect.objectContaining({}),
    });
    expect(JSON.stringify(event)).toContain("Translate the following transcript segment into Korean");
    expect(JSON.stringify(event)).toContain("We should decide the launch scope.");
    expect(JSON.stringify(event)).not.toContain("modalities");
  });

  test("adds conference mode to the more menu and renders it as a dedicated view", () => {
    const renderMenuBody = extractFunctionBody("renderAppMenu");
    const chatViewBody = extractFunctionBody("renderChatView");
    const renderNowBody = extractFunctionBody("renderNow");

    expect(renderMenuBody).toContain("shouldShowRealtimeVoiceControls()");
    expect(renderMenuBody).toContain('data-menu-action="conference-toggle"');
    expect(renderMenuBody).toContain("getConferenceModeMenuLabel()");
    expect(renderMenuBody).toContain('renderUiIcon("audio-lines")');
    expect(chatViewBody).not.toContain("renderConferenceModePanel()");
    expect(renderNowBody).toContain('state.activeView === "conference"');
    expect(sidepanelSource).toContain("function renderConferenceModeView");
    expect(sidepanelSource).toContain("conference-view");
    expect(sidepanelSource).toContain("function bindConferenceModeControls");
    expect(sidepanelSource).toContain('id="conference-mode-start"');
    expect(sidepanelSource).toContain('id="conference-mode-stop"');
  });

  test("hides conference mode unless realtime voice is enabled for API-key auth", () => {
    const realtimeAvailabilityBody = extractFunctionBody("isRealtimeVoiceAvailableForAccount");
    const initializeBody = extractFunctionBody("initialize");
    const startBody = extractFunctionBody("startConferenceMode");

    expect(realtimeAvailabilityBody).toContain('state.accountStatus.authMode === "apikey"');
    expect(initializeBody).toContain("!shouldShowRealtimeVoiceControls() && state.activeView === \"conference\"");
    expect(startBody).toContain("!shouldShowRealtimeVoiceControls()");
  });

  test("starts a dedicated WebRTC text transcription session for captured tab or screen audio", () => {
    const startBody = extractFunctionBody("startConferenceMode");
    const offerIndex = sidepanelSource.indexOf("async function createConferenceModeWebRtcOffer");
    const offerBody = sidepanelSource.slice(offerIndex, offerIndex + 1200);
    const queueBody = extractFunctionBody("queueConferenceModeAudioFrame");

    expect(offerIndex).toBeGreaterThanOrEqual(0);
    expect(startBody).toContain("requestComputerAudioStreamForDictation()");
    expect(startBody).toContain("createConferenceModeWebRtcOffer(stream)");
    expect(startBody).toContain('type: "dictation.transcription.start"');
    expect(startBody).toContain('outputModality: "text"');
    expect(startBody).toContain("getConferenceModePrompt()");
    expect(sidepanelSource).toContain("Return transcript events only. Do not translate in this session.");
    expect(offerBody).toContain('createDataChannel("oai-events")');
    expect(offerBody).toContain("attachConferenceModeDataChannelHandlers");
    expect(queueBody).toContain('type: "dictation.transcription.append_audio"');
  });

  test("ignores stale conference start results after a new conference page cancels the previous recording", () => {
    const startBody = extractFunctionBody("startConferenceMode");
    const guardBody = extractFunctionBody("isCurrentConferenceModeStart");

    expect(startBody).toContain("const startSessionId = state.conferenceMode.sessionId");
    expect(startBody).toContain("isCurrentConferenceModeStart(startSessionId)");
    expect(startBody).toContain("sessionId: startSessionId");
    expect(startBody).toContain("pendingStream.getTracks().forEach((track) => track.stop())");
    expect(guardBody).toContain("state.conferenceMode.sessionId === sessionId");
    expect(guardBody).toContain("state.conferenceMode.starting");
  });

  test("does not create overlapping translation responses for completed source transcripts", () => {
    const doneBody = extractFunctionBody("applyConferenceModeTranscriptDone");
    const requestBody = extractFunctionBody("requestConferenceModeTranslation");
    const flushBody = extractFunctionBody("flushConferenceModePendingTranslationRequests");
    const cleanupBody = extractFunctionBody("cleanupConferenceModeResources");

    expect(sidepanelSource).toContain("let conferenceModeDataChannel: RTCDataChannel | null = null");
    expect(sidepanelSource).toContain("let conferenceModePendingTranslationRequests: string[] = []");
    expect(doneBody).toContain("requestConferenceModeTranslation(sourceText)");
    expect(doneBody).toContain('appendConferenceModeTranscript(value, "")');
    expect(requestBody).toContain("createConferenceModeTranslationRequestEvent");
    expect(requestBody).toContain("channel.send(JSON.stringify");
    expect(requestBody).toContain("conferenceModeTranslationInFlight");
    expect(sidepanelSource).toContain("let conferenceModeTranslationInFlight = false");
    expect(sidepanelSource).toContain("let conferenceModeActiveTranslationSource = \"\"");
    expect(sidepanelSource).toContain("function enqueueConferenceModeTranslationRequest");
    expect(flushBody).toContain("conferenceModePendingTranslationRequests.shift");
    expect(flushBody).toContain("requestConferenceModeTranslation(sourceText)");
    expect(sidepanelSource).toContain("channel.onopen = flushConferenceModePendingTranslationRequests");
    expect(cleanupBody).toContain("conferenceModeDataChannel = null");
    expect(cleanupBody).toContain("conferenceModePendingTranslationRequests = []");
    expect(cleanupBody).toContain("conferenceModeTranslationInFlight = false");
  });

  test("routes conference voice events away from live voice chat messages", () => {
    const listenerIndex = sidepanelSource.indexOf('if (event.type === "voice.output_audio.delta")');
    const conferenceIndex = sidepanelSource.indexOf("isConferenceModeVoiceEvent(event)");
    const liveIndex = sidepanelSource.indexOf('if (event.type === "voice.session.started")');

    expect(conferenceIndex).toBeGreaterThanOrEqual(0);
    expect(conferenceIndex).toBeGreaterThan(listenerIndex);
    expect(conferenceIndex).toBeLessThan(liveIndex);
    expect(sidepanelSource).toContain("handleConferenceModeVoiceEvent(event)");
  });

  test("injects conference transcript into the next chat prompt context", () => {
    const contextBody = extractFunctionBody("buildConversationContextHint");

    expect(contextBody).toContain("buildConferenceModeTranslatedContextHint");
    expect(contextBody).toContain("isConferenceModeQuestionContextActive()");
    expect(contextBody).toContain("state.conferenceMode.entries");
  });

  test("keeps conference mode questions scoped to translated transcript instead of tab context", () => {
    const sendPromptBody = extractFunctionBody("sendPrompt");
    const mentionBody = extractFunctionBody("getMentionOptionsForState");
    const attachmentActionBody = extractFunctionBody("handleAttachmentMenuAction");
    const contextActiveBody = extractFunctionBody("isConferenceModeQuestionContextActive");
    const conferenceViewBody = extractFunctionBody("renderConferenceModeView");

    expect(sendPromptBody).toContain("const conferenceQuestionContextActiveAtSubmit = isConferenceModeQuestionContextActive()");
    expect(sendPromptBody).toContain("const conferenceQuestionContextActive = conferenceQuestionContextActiveAtSubmit");
    expect(sendPromptBody).toContain('state.activeView = conferenceQuestionContextActiveAtSubmit ? "conference" : "chat"');
    expect(sendPromptBody).toContain("conferenceQuestionContextActive ? [] : Array.from(state.attachments)");
    expect(sendPromptBody).toContain("conferenceQuestionContextActive ? [] : state.selectedTabIds");
    expect(sendPromptBody).toContain("suppressPageContext: conferenceQuestionContextActive || isCurrentTabContextDismissed()");
    expect(mentionBody).toContain("isConferenceModeQuestionContextActive()");
    expect(attachmentActionBody).toContain("getConferenceModeContextOnlyMessage()");
    expect(contextActiveBody).toContain("state.conferenceMode.viewActive");
    expect(contextActiveBody.indexOf("state.conferenceMode.viewActive")).toBeLessThan(
      contextActiveBody.indexOf("state.conferenceMode.entries.some"),
    );
    expect(conferenceViewBody).toContain("renderConferenceQuestionStream()");
    expect(sidepanelSource).toContain("function renderConferenceQuestionStream");
    expect(sidepanelSource).toContain("conference-chat-stream");
  });

  test("retries conference translation when realtime response creation collides with an active response", () => {
    const messageBody = extractFunctionBody("handleConferenceModeDataChannelMessage");
    const errorBody = extractFunctionBody("isConferenceModeActiveResponseError");
    const cleanupBody = extractFunctionBody("cleanupConferenceModeResources");

    expect(sidepanelSource).toContain("let conferenceModeTranslationRetryTimer");
    expect(messageBody).toContain("isConferenceModeActiveResponseError(payload)");
    expect(messageBody).toContain("enqueueConferenceModeTranslationRequest(retrySource, { front: true })");
    expect(messageBody).toContain("scheduleConferenceModeTranslationFlush(900)");
    expect(errorBody).toContain("active response in progress");
    expect(cleanupBody).toContain("cancelConferenceModeTranslationRetry()");
  });

  test("keeps conference controls fixed while only transcript and chat panes scroll", () => {
    const panelBody = extractFunctionBody("renderConferenceModePanel");
    const renderBody = extractFunctionBody("renderNow");

    expect(panelBody).toContain('id="conference-transcript-scroll"');
    expect(renderBody).toContain("scrollConferenceTranscriptToBottom()");
    expect(sidepanelSource).toContain("function scrollConferenceTranscriptToBottom");
    expect(readFinalDeclaration(".conference-view", "overflow")).toBe("hidden");
    expect(readFinalDeclaration(".conference-mode-list", "overflow-y")).toBe("auto");
    expect(readFinalDeclaration(".conference-chat-stream", "overflow-y")).toBe("auto");
  });

  test("lets the chat menu exit conference mode without losing the transcript", () => {
    const menuViewBody = extractFunctionBody("switchMainViewFromMenu");
    const stopBody = extractFunctionBody("stopConferenceMode");
    const panelGateBody = extractFunctionBody("shouldRenderConferenceModePanel");

    expect(menuViewBody).toContain('view === "chat"');
    expect(menuViewBody).toContain("exitConferenceModeView");
    expect(stopBody).toContain("viewActive: options.keepViewActive");
    expect(stopBody).toContain("entries: options.preserveEntries ? state.conferenceMode.entries : []");
    expect(panelGateBody).toContain("state.conferenceMode.viewActive");
  });

  test("starts a fresh conference page from the header plus button", () => {
    const newConferenceBody = extractFunctionBody("startNewConferencePage");
    const stopBody = extractFunctionBody("stopConferenceMode");
    const clickIndex = sidepanelSource.indexOf('root.querySelector<HTMLButtonElement>("#new-chat")');
    const clickBody = sidepanelSource.slice(clickIndex, clickIndex + 650);

    expect(clickIndex).toBeGreaterThanOrEqual(0);
    expect(clickBody).toContain('state.activeView === "conference" || state.conferenceMode.viewActive');
    expect(clickBody).toContain("startNewConferencePage()");
    expect(newConferenceBody).toContain("stopConferenceMode({ notifyBridge: true, preserveEntries: false, keepViewActive: true })");
    expect(newConferenceBody).toContain('type: "conversation.new"');
    expect(newConferenceBody).toContain('state.activeView = "conference"');
    expect(newConferenceBody).toContain("createConferenceModeState()");
    expect(newConferenceBody).toContain("viewActive: true");
    expect(stopBody).toContain("cleanupConferenceModeResources()");
  });

  test("uses a compact transcript and translation layout without placeholder ellipses", () => {
    expect(readFinalDeclaration(".conference-mode-panel", "border")).toBe("1px solid var(--line)");
    expect(readFinalDeclaration(".conference-mode-entry", "grid-template-columns")).toBe("1fr");
    expect(readFinalDeclaration(".conference-mode-entry", "box-shadow")).toBe("none");
    expect(sidepanelSource).toContain("conference-mode-translation-pending");
    expect(sidepanelSource).not.toContain('entry.translationText || "…"');
  });

  test("shows a live audio waveform while conference mode is active", () => {
    const panelBody = extractFunctionBody("renderConferenceModePanel");
    const startBody = extractFunctionBody("startConferenceMode");
    const cleanupBody = extractFunctionBody("cleanupConferenceModeResources");

    expect(panelBody).toContain("conference-mode-waveform");
    expect(panelBody).toContain("renderComposerVoiceWaveform()");
    expect(startBody).toContain("startComposerVoiceWaveform(stream)");
    expect(cleanupBody).toContain("cleanupComposerVoiceWaveform()");
  });

  test("preserves realtime failure details instead of replacing them with a generic update error", () => {
    const errorBody = extractFunctionBody("handleConferenceModeError");
    const cleanupBody = extractFunctionBody("cleanupConferenceModeResources");
    const voiceErrorBody = extractFunctionBody("toUserFacingVoiceStartError");

    expect(errorBody).toContain("rememberChatgptRealtimeEndpointFailure(message)");
    expect(errorBody).toContain("cleanupConferenceModeResources(message)");
    expect(cleanupBody).toContain("cancelPendingVoiceAnswer(reason)");
    expect(voiceErrorBody).toContain('? "conference" : "live"');
    expect(voiceErrorBody).toContain('getRealtimeApiKeyRequiredMessage(');
  });

  test("uses the available sidepanel width for conference transcript and chat panes", () => {
    expect(readFinalDeclaration(".conference-view", "padding")).toBe("0 6px 10px");
    expect(readFinalDeclaration(".conference-view-shell", "gap")).toBe("10px");
    expect(readFinalDeclaration(".conference-chat-section", "min-height")).toBe("170px");
    expect(readFinalDeclaration(".conference-message-stream", "max-width")).toBe("none");
    expect(readFinalDeclaration(".conference-message-stream", "gap")).toBe("14px");
  });
});
