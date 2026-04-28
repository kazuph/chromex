import { describe, expect, test } from "vitest";

import { shouldSendComposerAsTurnSteer } from "../src/sidepanel/turn-steer-routing.js";

describe("turn steer routing", () => {
  test("routes a non-empty composer draft into the active turn", () => {
    expect(
      shouldSendComposerAsTurnSteer({
        draft: "방금 답변을 더 짧게 정리해줘",
        resetThread: false,
        threadId: "thread-1",
        activeTurn: { threadId: "thread-1", turnId: "turn-1" },
      }),
    ).toBe(true);
  });

  test("keeps empty drafts and reset sends out of the steer path", () => {
    expect(
      shouldSendComposerAsTurnSteer({
        draft: "   ",
        resetThread: false,
        threadId: "thread-1",
        activeTurn: { threadId: "thread-1", turnId: "turn-1" },
      }),
    ).toBe(false);
    expect(
      shouldSendComposerAsTurnSteer({
        draft: "새로 시작해",
        resetThread: true,
        threadId: "thread-1",
        activeTurn: { threadId: "thread-1", turnId: "turn-1" },
      }),
    ).toBe(false);
  });

  test("does not steer into another conversation turn", () => {
    expect(
      shouldSendComposerAsTurnSteer({
        draft: "추가 지시",
        resetThread: false,
        threadId: "thread-2",
        activeTurn: { threadId: "thread-1", turnId: "turn-1" },
      }),
    ).toBe(false);
  });
});
