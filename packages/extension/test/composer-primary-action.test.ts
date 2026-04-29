import { describe, expect, test } from "vitest";

import {
  didComposerPrimaryActionChangeForDraftInput,
  resolveComposerPrimaryAction,
} from "../src/sidepanel/composer-primary-action.js";

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

  test("keeps stop-turn while work is running and the composer is empty", () => {
    expect(
      resolveComposerPrimaryAction({
        composerDraft: "   ",
        currentWorkActive: true,
        liveActive: true,
      }),
    ).toBe("stop-turn");
  });

  test("sends a steer instruction while work is running and the composer has text", () => {
    expect(
      resolveComposerPrimaryAction({
        composerDraft: "방금 답변은 더 짧게 정리해줘",
        currentWorkActive: true,
        liveActive: true,
      }),
    ).toBe("send");
  });

  test("marks the composer for re-render when typing changes live into send", () => {
    expect(
      didComposerPrimaryActionChangeForDraftInput({
        previousComposerDraft: "",
        nextComposerDraft: "현재 페이지 설명해줘",
        currentWorkActive: false,
        liveActive: false,
      }),
    ).toBe(true);
  });

  test("does not re-render the primary action while text changes within the same send state", () => {
    expect(
      didComposerPrimaryActionChangeForDraftInput({
        previousComposerDraft: "현재 페이지",
        nextComposerDraft: "현재 페이지 설명해줘",
        currentWorkActive: false,
        liveActive: false,
      }),
    ).toBe(false);
  });

  test("does not re-render the primary action during IME composition", () => {
    expect(
      didComposerPrimaryActionChangeForDraftInput({
        previousComposerDraft: "",
        nextComposerDraft: "ㅇ",
        currentWorkActive: false,
        liveActive: false,
        compositionInProgress: true,
      }),
    ).toBe(false);
  });
});
