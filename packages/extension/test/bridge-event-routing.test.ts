import { describe, expect, test } from "vitest";

import { resolveBridgeEventConversationId } from "../src/background/bridge-event-routing.js";

describe("resolveBridgeEventConversationId", () => {
  test("uses explicit conversation ids when bridge events already carry them", () => {
    expect(
      resolveBridgeEventConversationId(
        {
          type: "message.completed",
          conversationId: "conversation-explicit",
          threadId: "thread-a",
        },
        {
          findConversationIdForThread: () => "conversation-thread",
        },
      ),
    ).toBe("conversation-explicit");
  });

  test("routes streamed message events by thread id for detached conversations", () => {
    expect(
      resolveBridgeEventConversationId(
        {
          type: "message.delta",
          threadId: "thread-b",
          turnId: "turn-b",
          itemId: "assistant",
          delta: "partial",
        },
        {
          findConversationIdForThread: (threadId) => (threadId === "thread-b" ? "conversation-b" : null),
        },
      ),
    ).toBe("conversation-b");
  });

  test("routes nested turn events with the same resolver", () => {
    expect(
      resolveBridgeEventConversationId(
        {
          type: "turn.started",
          activeTurn: {
            threadId: "thread-c",
            turnId: "turn-c",
          },
        },
        {
          findConversationIdForThread: (threadId) => (threadId === "thread-c" ? "conversation-c" : null),
        },
      ),
    ).toBe("conversation-c");
  });
});
