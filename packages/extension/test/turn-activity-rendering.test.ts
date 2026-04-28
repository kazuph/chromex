import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const sidepanelSource = readFileSync(resolve(process.cwd(), "src/sidepanel/index.ts"), "utf8");
const i18nSource = readFileSync(resolve(process.cwd(), "src/sidepanel/i18n.ts"), "utf8");
const traceFormattingSource = readFileSync(resolve(process.cwd(), "src/sidepanel/message-trace-formatting.ts"), "utf8");
const stateSource = readFileSync(resolve(process.cwd(), "src/sidepanel/sidepanel-state.ts"), "utf8");
const typesSource = readFileSync(resolve(process.cwd(), "src/types.ts"), "utf8");
const stylesSource = readFileSync(resolve(process.cwd(), "public/sidepanel.css"), "utf8");

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
    expect(sidepanelSource).toContain("removeTurnTraceItems(plan.threadId, plan.turnId");
  });
});
