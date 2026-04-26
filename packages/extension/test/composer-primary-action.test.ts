import { describe, expect, test } from "vitest";

import { resolveComposerPrimaryAction } from "../src/sidepanel/composer-primary-action.js";

describe("composer primary action", () => {
  test("starts live mode when the composer is empty", () => {
    expect(
      resolveComposerPrimaryAction({
        composerDraft: "   ",
        currentWorkActive: false,
        liveActive: false,
      }),
    ).toBe("start-live");
  });

  test("sends a message when the composer has text", () => {
    expect(
      resolveComposerPrimaryAction({
        composerDraft: "현재 페이지 설명해줘",
        currentWorkActive: false,
        liveActive: false,
      }),
    ).toBe("send");
  });

  test("stops live mode while live voice is active", () => {
    expect(
      resolveComposerPrimaryAction({
        composerDraft: "",
        currentWorkActive: false,
        liveActive: true,
      }),
    ).toBe("stop-live");
  });

  test("keeps stop-turn as the highest-priority action while work is running", () => {
    expect(
      resolveComposerPrimaryAction({
        composerDraft: "다음 질문",
        currentWorkActive: true,
        liveActive: true,
      }),
    ).toBe("stop-turn");
  });
});
