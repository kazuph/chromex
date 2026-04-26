import { describe, expect, test } from "vitest";

import {
  clearConversationHistoryState,
  deleteConversationHistoryEntry,
} from "../src/background/conversation-history.js";
import type { SavedConversation } from "../src/types.js";

function makeConversation(id: string): SavedConversation {
  return {
    id,
    title: id,
    profileId: "default",
    messages: [],
    attachments: [],
    structuredInputs: [],
    selectedTabIds: [],
    historyQuery: "",
    readStrategyOverride: "auto",
    updatedAt: Date.now(),
  };
}

describe("conversation history helpers", () => {
  test("deletes one conversation without changing another active conversation", () => {
    const result = deleteConversationHistoryEntry({
      conversations: [makeConversation("a"), makeConversation("b")],
      conversationId: "a",
      currentConversationId: "b",
    });

    expect(result.conversations.map((conversation) => conversation.id)).toEqual(["b"]);
    expect(result.currentConversationId).toBe("b");
  });

  test("clears the active conversation pointer when deleting the active conversation", () => {
    const result = deleteConversationHistoryEntry({
      conversations: [makeConversation("a"), makeConversation("b")],
      conversationId: "a",
      currentConversationId: "a",
    });

    expect(result.conversations.map((conversation) => conversation.id)).toEqual(["b"]);
    expect(result.currentConversationId).toBeNull();
  });

  test("clears all local conversation history", () => {
    expect(clearConversationHistoryState()).toEqual({
      conversations: [],
      currentConversationId: null,
    });
  });
});
