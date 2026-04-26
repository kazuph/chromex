import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const sidepanelSource = readFileSync(resolve(process.cwd(), "src/sidepanel/index.ts"), "utf8");
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
    expect(sidepanelSource).toContain('"작업 계획"');
  });

  test("keeps Codex work activity in arrival order instead of timestamp-resorting it above prior lines", () => {
    expect(sidepanelSource).toContain("const MAX_TRACE_ITEMS");
    expect(sidepanelSource).not.toContain(".sort((left, right) => left.timestampMs - right.timestampMs)");
  });

  test("collapses trace details without leaving large vertical gaps", () => {
    expect(sidepanelSource).toContain('class="message-trace-text"${shouldOpen ? " open" : ""}');
    expect(sidepanelSource).toContain('const shouldOpen = items.some((item) => item.status === "running")');
    expect(stylesSource).toContain(".message-trace-text:not([open])");
    expect(stylesSource).toContain(".message-trace-text:not([open]) .message-trace-summary");
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
    expect(sidepanelSource).toContain('"탐색 마침"');
    expect(sidepanelSource).toContain("`검색 ${webCount}건`");
  });

  test("does not persist transient trace-only progress as chat history", () => {
    expect(stateSource).toContain("normalizeMessageTrace");
    expect(stateSource).toContain("serializeConversationTraceForStorage");
    expect(stateSource).toContain("isTraceOnlyProgressMessage");
    expect(stateSource).toContain(".filter((message) => !isTraceOnlyProgressMessage(message))");
  });

  test("filters noisy private-work placeholders from visible trace rows", () => {
    expect(sidepanelSource).toContain("isNoisyTraceText");
    expect(sidepanelSource).toContain("reviewing the request and planning the next step.");
    expect(sidepanelSource).toContain("preparing the user-facing response.");
    expect(sidepanelSource).toContain("removeTurnTraceItems(plan.threadId, plan.turnId");
  });
});
