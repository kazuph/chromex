import { describe, expect, test } from "vitest";

import { prepareMessageReplay } from "../src/sidepanel/message-actions.js";
import type { ConversationMessage } from "../src/types.js";

const messages: ConversationMessage[] = [
  { id: "user-1", role: "user", text: "첫 질문" },
  { id: "assistant-1", role: "assistant", text: "첫 답변" },
  { id: "user-2", role: "user", text: "두 번째 질문" },
  { id: "assistant-2", role: "assistant", text: "두 번째 답변" },
];

describe("message actions", () => {
  test("regenerates an assistant answer from the previous user message and drops later messages", () => {
    expect(prepareMessageReplay(messages, "assistant-2")).toEqual({
      prompt: "두 번째 질문",
      messagesBeforePrompt: messages.slice(0, 2),
      userMessageId: "user-2",
    });
  });

  test("resends an edited user message from that point and drops the old branch", () => {
    expect(prepareMessageReplay(messages, "user-1", "수정한 첫 질문")).toEqual({
      prompt: "수정한 첫 질문",
      messagesBeforePrompt: [],
      userMessageId: "user-1",
    });
  });

  test("rejects empty edited messages", () => {
    expect(prepareMessageReplay(messages, "user-2", "   ")).toBeNull();
  });
});
