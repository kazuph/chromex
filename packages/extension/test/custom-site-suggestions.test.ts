import { describe, expect, test } from "vitest";

import {
  createCustomSiteSuggestion,
  inferCustomSiteSuggestionCards,
  normalizeCustomSiteSuggestions,
  resolveCustomSiteSuggestionKey,
} from "../src/custom-site-suggestions.js";

describe("custom site suggestions", () => {
  test("creates a safe current-site suggestion and matches future visits on the same host", () => {
    const suggestion = createCustomSiteSuggestion(
      {
        title: "Quarterly planning - Gmail",
        url: "https://mail.google.com/mail/u/0/#inbox",
      },
      "이 메일에 대한 답장 초안을 작성해줘.",
      1_000,
    );

    expect(suggestion).toMatchObject({
      siteKey: "mail.google.com",
      siteLabel: "mail.google.com",
      prompt: "이 메일에 대한 답장 초안을 작성해줘.",
      createdAt: 1_000,
    });

    const cards = inferCustomSiteSuggestionCards(
      {
        title: "Different message - Gmail",
        url: "https://mail.google.com/mail/u/1/#sent",
      },
      [suggestion],
    );

    expect(cards).toEqual([
      expect.objectContaining({
        id: `custom-site-${suggestion.id}`,
        title: "이 메일에 대한 답장 초안을 작성해줘.",
        kind: "prompt",
        prompt: "이 메일에 대한 답장 초안을 작성해줘.",
      }),
    ]);
  });

  test("does not match unrelated hosts and rejects restricted browser pages", () => {
    const suggestion = createCustomSiteSuggestion(
      { title: "Gmail", url: "https://mail.google.com/mail/u/0/#inbox" },
      "읽지 않은 메일을 업무 우선순위로 정리해줘.",
    );

    expect(resolveCustomSiteSuggestionKey("chrome://extensions")).toBeNull();
    expect(
      inferCustomSiteSuggestionCards(
        { title: "Calendar", url: "https://calendar.google.com/calendar/u/0/r" },
        [suggestion],
      ),
    ).toEqual([]);
  });

  test("normalizes stored suggestions before settings render or prompt routing", () => {
    const normalized = normalizeCustomSiteSuggestions([
      {
        id: "bad id !",
        siteKey: "https://www.Example.com/path",
        siteLabel: " Example ",
        prompt: "  요약해줘  ",
        createdAt: Number.NaN,
      },
      {
        id: "empty",
        siteKey: "https://example.com",
        siteLabel: "Example",
        prompt: "",
        createdAt: 1,
      },
    ]);

    expect(normalized).toEqual([
      {
        id: "bad-id",
        siteKey: "example.com",
        siteLabel: "Example",
        prompt: "요약해줘",
        createdAt: expect.any(Number),
      },
    ]);
  });
});
