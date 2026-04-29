import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

function readNormalizedSource(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8").replace(/\r\n/g, "\n");
}

const sidepanelSource = readNormalizedSource("src/sidepanel/index.ts");
const i18nSource = readNormalizedSource("src/sidepanel/i18n.ts");
const traceFormattingSource = readNormalizedSource("src/sidepanel/message-trace-formatting.ts");
const stateSource = readNormalizedSource("src/sidepanel/sidepanel-state.ts");
const typesSource = readNormalizedSource("src/types.ts");
const stylesSource = readNormalizedSource("public/sidepanel.css");

describe("turn activity rendering", () => {
  test("renders sanitized Codex work activity as inline text rather than a separate card", () => {
    expect(typesSource).toContain("ConversationMessageTraceItem");
    expect(sidepanelSource).toContain("turn.activity");
    expect(sidepanelSource).toContain("upsertTurnActivityTrace");
    expect(sidepanelSource).toContain("renderMessageTrace");
    expect(sidepanelSource).toContain("message-trace-text");
    expect(sidepanelSource).toContain("formatTraceSummary");
    expect(sidepanelSource).not.toContain('<details class="message-trace"');
    expect(stylesSource).toContain("trace-text-sheen");
    expect(stylesSource).toContain(".message-trace-line.running");
    expect(sidepanelSource).not.toContain("hidden chain-of-thought</");
    expect(sidepanelSource).not.toContain("추론 요약");
    expect(traceFormattingSource).toContain("return trace.plan;");
    expect(i18nSource).toContain('plan: "계획"');
  });

  test("keeps active turn trace under the current prompt activity instead of above it", () => {
    expect(sidepanelSource).toContain("isActiveTurnTraceMessage");
    expect(sidepanelSource).toContain(
      "return isActiveTurnTraceMessage(message) || isCurrentPromptActivityPendingImageMessage(message) || isCurrentStreamingAssistantMessage(message);",
    );
    expect(sidepanelSource).toContain("createTurnTraceMessageId(activeTurn.threadId, activeTurn.turnId)");
    expect(sidepanelSource).toContain("isCurrentStreamingAssistantMessage");
    expect(sidepanelSource).toContain("state.streamingAssistantMessageIds.has(message.id)");
  });

  test("anchors the active prompt row before all current assistant output", () => {
    expect(sidepanelSource).toContain("activePromptUserMessageId");
    expect(sidepanelSource).toContain("findPromptActivityAnchorIndex(messages)");
    expect(sidepanelSource).toContain("beforePromptActivityMessages: messages.slice(0, promptAnchorIndex + 1)");
    expect(sidepanelSource).toContain("afterPromptActivityMessages: messages.slice(promptAnchorIndex + 1)");
    expect(sidepanelSource).toContain("setActivePromptUserMessageId(resolveActivePromptUserMessageIdForSend(userMessageId, sendAsTurnSteer))");
    expect(sidepanelSource).toContain('message.id === state.activePromptUserMessageId');
  });

  test("keeps steer messages inside the existing active turn group", () => {
    expect(sidepanelSource).toContain("activePromptUserMessageIdsByConversationId");
    expect(sidepanelSource).toContain("resolveActivePromptUserMessageIdForSend");
    expect(sidepanelSource).toContain("if (!sendAsTurnSteer)");
    expect(sidepanelSource).toContain("return findLatestUserMessageId(state.messages) ?? userMessageId");
    expect(sidepanelSource).toContain("clearActivePromptUserMessageId()");
  });

  test("merges multiple streamed assistant items into one response for the active turn", () => {
    expect(sidepanelSource).toContain("assistantResponseMessageIdsByGroupKey");
    expect(sidepanelSource).toContain("assistantResponseItemOrderByMessageId");
    expect(sidepanelSource).toContain("assistantResponseItemTextsByMessageId");
    expect(sidepanelSource).toContain("assistantResponseGroupKeysByTurnKey");
    expect(sidepanelSource).toContain("resolveAssistantResponseMessageId(itemId, event)");
    expect(sidepanelSource).toContain("const promptGroupKey = `prompt:${state.promptActivity.clientRequestId}`;");
    expect(sidepanelSource).toContain("rememberAssistantResponseTurnGroup");
    expect(sidepanelSource).toContain("createAssistantResponseTurnKey");
    expect(sidepanelSource).toContain('.join("\\n\\n")');
  });

  test("deduplicates completed assistant text recovered under a second item id", () => {
    expect(sidepanelSource).toContain("normalizeAssistantResponseTextSegment");
    expect(sidepanelSource).toContain("duplicateItemId");
    expect(sidepanelSource).toContain("order.splice(order.indexOf(itemId), 1)");
  });

  test("keeps a completed assistant text segment below prompt activity until the turn completes", () => {
    expect(sidepanelSource).toContain("if (!state.promptActivity && !state.activeTurn?.turnId)");
    expect(sidepanelSource).toContain("state.streamingAssistantMessageIds.delete(messageId)");
    expect(sidepanelSource).toContain("state.streamingAssistantMessageIds.clear()");
  });

  test("does not render unresolved or detached conversation events into the visible chat", () => {
    expect(sidepanelSource).toContain("shouldDropUnresolvedConversationScopedBridgeEvent(event.type, eventConversationId)");
    expect(sidepanelSource).toContain("bufferUnresolvedConversationScopedBridgeEvent(event)");
    expect(sidepanelSource).toContain("isConversationScopedBridgeEventType(eventType)");
    expect(sidepanelSource).toContain('case "message.delta":');
    expect(sidepanelSource).toContain('case "turn.plan.updated":');
    expect(sidepanelSource).toContain('case "model.rerouted":');
    expect(sidepanelSource).toContain("return Boolean(conversationId && (!state.currentConversationId || conversationId === state.currentConversationId))");
    expect(sidepanelSource).toContain("upsertAssistantMessageForConversation(eventConversationId, itemId, event.delta ?? \"\", true)");
  });

  test("buffers unresolved thread events so later conversation mapping can persist them", () => {
    expect(sidepanelSource).toContain("unresolvedConversationBridgeEventsByThreadId");
    expect(sidepanelSource).toContain("MAX_UNRESOLVED_CONVERSATION_BRIDGE_EVENTS_PER_THREAD");
    expect(sidepanelSource).toContain("flushBufferedConversationBridgeEvents(normalizedConversationId, normalizedThreadId)");
    expect(sidepanelSource).toContain("applyBufferedConversationBridgeEvent(conversationId, event)");
    expect(sidepanelSource).toContain('case "message.completed":');
    expect(sidepanelSource).toContain("upsertTurnActivityTraceForConversation(conversationId");
  });

  test("lets the active visible prompt receive streaming before conversation thread mapping catches up", () => {
    expect(sidepanelSource).toContain("shouldTreatUnresolvedBridgeEventAsCurrent(event, eventConversationId)");
    expect(sidepanelSource).toContain("unresolvedEventBelongsToCurrentConversation || isBridgeEventForCurrentConversation");
    expect(sidepanelSource).toContain("rememberCurrentConversationThreadForBridgeEvent(event)");
    expect(sidepanelSource).toContain("hasCurrentPromptInFlight()");
    expect(sidepanelSource).toContain("promptSubmissionBootstrapInFlight ||");
    expect(sidepanelSource).toContain("state.promptActivity ||");
    expect(sidepanelSource).toContain("if (!threadId) {\n    return true;\n  }");
  });

  test("claims the first unresolved thread for the current prompt even when the stored thread is stale", () => {
    expect(sidepanelSource).toContain("getCurrentClaimedBridgeEventThreadId()");
    expect(sidepanelSource).toContain("const claimedThreadId = getCurrentClaimedBridgeEventThreadId()");
    expect(sidepanelSource).toContain("if (claimedThreadId) {\n    return threadId === claimedThreadId;\n  }");
    expect(sidepanelSource).toContain("return Boolean(state.promptActivity || promptSubmissionBootstrapInFlight)");
  });

  test("routes nested plan, diff, and reroute events by thread before rendering logs", () => {
    expect(sidepanelSource).toContain("event.plan?.threadId");
    expect(sidepanelSource).toContain("event.diff?.threadId");
    expect(sidepanelSource).toContain("event.reroute?.threadId");
    expect(sidepanelSource).toContain("upsertTurnPlanTraceForConversation(eventConversationId, event.plan)");
    expect(sidepanelSource).toContain("upsertTurnDiffTraceForConversation(eventConversationId, event.diff)");
    expect(sidepanelSource).toContain("if (!isCurrentConversationEvent) {\n      renderConversationListIfVisible();\n      return;\n    }\n    state.latestReroute");
  });

  test("flushes pending streamed deltas before taking a conversation switch snapshot", () => {
    expect(sidepanelSource).toContain("flushStreamingAssistantDeltas();\n  rememberCurrentConversationSnapshot();");
  });

  test("keeps background turn traces attached to their conversation for later resume", () => {
    expect(sidepanelSource).toContain("upsertTurnActivityTraceForConversation(eventConversationId");
    expect(sidepanelSource).toContain("upsertTurnPlanTraceForConversation(eventConversationId, event.plan)");
    expect(sidepanelSource).toContain("upsertTurnDiffTraceForConversation(eventConversationId, event.diff)");
    expect(sidepanelSource).toContain("completeTurnTraceForConversation(eventConversationId, event.threadId, event.turnId ?? \"\")");
  });

  test("keeps Codex work activity in arrival order instead of timestamp-resorting it above prior lines", () => {
    expect(sidepanelSource).toContain("const MAX_TRACE_ITEMS");
    expect(sidepanelSource).not.toContain(".sort((left, right) => left.timestampMs - right.timestampMs)");
  });

  test("collapses trace details without leaving large vertical gaps", () => {
    expect(sidepanelSource).toContain('class="message-trace-text"${shouldOpen ? " open" : ""}');
    expect(traceFormattingSource).toContain('return items.some((item) => item.status === "running")');
    expect(stylesSource).toContain(".message-trace-text:not([open])");
    expect(stylesSource).toContain(".message-trace-text:not([open]) .message-trace-summary");
  });

  test("remembers trace open state across streaming rerenders", () => {
    expect(sidepanelSource).toContain("messageTraceOpenByMessageId");
    expect(sidepanelSource).toContain('data-message-trace-id="${escapeAttribute(messageId)}"');
    expect(sidepanelSource).toContain('root.querySelectorAll<HTMLDetailsElement>("[data-message-trace-id]")');
    expect(sidepanelSource).toContain("messageTraceOpenByMessageId.set(messageId, details.open)");
  });

  test("auto-completes active trace rows when the final response arrives", () => {
    expect(sidepanelSource).toContain("markActiveTurnTraceItemsCompleted()");
    expect(sidepanelSource).toContain("completeTurnTrace(event.threadId, event.turnId ?? \"\")");
    expect(sidepanelSource).toContain("status: \"completed\"");
  });

  test("renders each running trace row as one shimmer text unit", () => {
    expect(sidepanelSource).toContain("message-trace-line-text");
    expect(stylesSource).toContain(".message-trace-line.running .message-trace-line-text");
    expect(stylesSource).not.toContain(
      ".message-trace-line.running .message-trace-line-main,\n.message-trace-line.running .message-trace-line-detail",
    );
  });

  test("labels completed Korean trace groups as finished instead of still ambiguous", () => {
    expect(traceFormattingSource).toContain("strings.summaryDone");
    expect(traceFormattingSource).toContain("formatCount(webCount, strings.search)");
    expect(i18nSource).toContain('summaryDone: "탐색 마침"');
    expect(i18nSource).toContain('search: "검색"');
  });

  test("does not persist transient trace-only progress as chat history", () => {
    expect(stateSource).toContain("normalizeMessageTrace");
    expect(stateSource).toContain("serializeConversationTraceForStorage");
    expect(stateSource).toContain("isTraceOnlyProgressMessage");
    expect(stateSource).toContain(".filter((message) => !isTraceOnlyProgressMessage(message))");
  });

  test("filters noisy private-work placeholders from visible trace rows", () => {
    expect(traceFormattingSource).toContain("isNoisyTraceText");
    expect(traceFormattingSource).toContain("reviewing the request and planning the next step.");
    expect(traceFormattingSource).toContain("preparing the user-facing response.");
    expect(sidepanelSource).toContain("removeTurnTraceItemsInMessages(messages, plan.threadId, plan.turnId");
  });
});
