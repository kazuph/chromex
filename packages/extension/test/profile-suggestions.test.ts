import { describe, expect, test } from "vitest";

import {
  createProfileSuggestionCards,
  getSuggestionCardSource,
  mergeProfileAndSiteSuggestionCards,
} from "../src/sidepanel/profile-suggestions.js";

const marketingProfile = {
  id: "marketing-strategist",
  name: "Marketing Strategist",
  systemPrompt: "",
  defaultContextPolicy: {
    attachCurrentPageByDefault: true,
    allowedReadStrategies: ["dom" as const],
  },
  allowedSources: ["current-page" as const],
  preferredActions: ["draft-blog-post"],
  adapterHints: [],
};

describe("profile suggestions", () => {
  test("does not add profile examples for the default profile", () => {
    expect(
      createProfileSuggestionCards({
        profile: { ...marketingProfile, id: "default", name: "Default" },
        currentTab: {
          tabId: 1,
          title: "Example",
          url: "https://example.com/",
          pinned: false,
          audible: false,
        },
        locale: "ko",
      }),
    ).toEqual([]);
  });

  test("creates profile-specific examples using the current site context", () => {
    const cards = createProfileSuggestionCards({
      profile: marketingProfile,
      currentTab: {
        tabId: 2,
        title: "Launch Lessons - YouTube",
        url: "https://www.youtube.com/watch?v=demo",
        pinned: false,
        audible: false,
      },
      locale: "ko",
    });

    expect(cards.map((card) => card.title)).toContain("콘텐츠 훅 뽑기");
    expect(cards[0]?.prompt).toContain("Launch Lessons");
    expect(cards[0]?.prompt).toContain("마케팅");
  });

  test("prioritizes profile examples while preserving site suggestions", () => {
    const merged = mergeProfileAndSiteSuggestionCards(
      [
        {
          id: "profile-marketing-strategist-primary",
          title: "콘텐츠 훅 뽑기",
          description: "profile",
          kind: "prompt",
          prompt: "profile prompt",
        },
      ],
      [
        {
          id: "youtube-summary-question",
          title: "영상 핵심 요약",
          description: "site",
          kind: "prompt",
          prompt: "site prompt",
        },
      ],
      4,
    );

    expect(merged.map((card) => card.id)).toEqual(["profile-marketing-strategist-primary", "youtube-summary-question"]);
    expect(getSuggestionCardSource(merged[0]!)).toBe("profile");
    expect(getSuggestionCardSource(merged[1]!)).toBe("site");
  });

  test("uses up to three user-defined profile suggestions", () => {
    const cards = createProfileSuggestionCards({
      profile: {
        ...marketingProfile,
        suggestedPrompts: [
          "Analyze {title} on {site}",
          "Write campaign ideas",
          "Find objections",
          "Ignored",
        ],
      },
      currentTab: {
        tabId: 3,
        title: "Pricing Page",
        url: "https://example.com/pricing",
        pinned: false,
        audible: false,
      },
      locale: "en",
    });

    expect(cards).toHaveLength(3);
    expect(cards[0]?.prompt).toBe("Analyze Pricing Page on example.com");
  });

  test("creates three built-in examples for expanded professional profiles", () => {
    const cards = createProfileSuggestionCards({
      profile: {
        ...marketingProfile,
        id: "product-manager",
        name: "Product Manager",
      },
      currentTab: {
        tabId: 4,
        title: "Feature Request",
        url: "https://example.com/feature",
        pinned: false,
        audible: false,
      },
      locale: "en",
    });

    expect(cards.map((card) => card.title)).toEqual([
      "Draft PRD",
      "Assess opportunity",
      "Roadmap decision",
    ]);
  });

  test("creates metacognitive critique examples with safety-oriented labels", () => {
    const roastCards = createProfileSuggestionCards({
      profile: {
        ...marketingProfile,
        id: "roast-coach",
        name: "Roast Coach",
      },
      currentTab: {
        tabId: 5,
        title: "Launch Post",
        url: "https://example.com/post",
        pinned: false,
        audible: false,
      },
      locale: "ko",
    });
    const harshCards = createProfileSuggestionCards({
      profile: {
        ...marketingProfile,
        id: "harsh-comment-simulator",
        name: "Harsh Comment Simulator",
      },
      currentTab: {
        tabId: 6,
        title: "Product Announcement",
        url: "https://example.com/announce",
        pinned: false,
        audible: false,
      },
      locale: "ko",
    });

    expect(roastCards.map((card) => card.title)).toContain("날카롭게 까줘");
    expect(roastCards.some((card) => card.prompt?.includes("공격이 아니라 개선 포인트"))).toBe(true);
    expect(harshCards.map((card) => card.title)).toContain("악플 시뮬레이션");
    expect(harshCards[0]?.prompt).toContain("진짜 우려");
  });

  test("creates slide-making examples that request sequential same-turn images", () => {
    const cards = createProfileSuggestionCards({
      profile: {
        ...marketingProfile,
        id: "slide-maker",
        name: "Slide Production Expert",
      },
      currentTab: {
        tabId: 7,
        title: "Quarterly Report",
        url: "https://example.com/report",
        pinned: false,
        audible: false,
      },
      locale: "en",
    });

    expect(cards.map((card) => card.title)).toEqual([
      "Create slide images",
      "Storyboard deck",
      "Turn into executive slides",
    ]);
    expect(cards[0]?.prompt).toContain("sequentially in this same Codex turn");
    expect(cards[0]?.prompt).toContain("meaningful parts");
    expect(cards[0]?.prompt).toContain("one representative slide image for each part");
    expect(cards[0]?.prompt).toContain("design direction");
    expect(cards[0]?.prompt).toContain("one source-grounded image prompt");
    expect(cards[0]?.prompt).toContain("previous generated slide image path");
    expect(cards[0]?.prompt).toContain("Quarterly Report");
    expect(cards[2]?.prompt).toContain("source's meaningful parts");
    expect(cards[2]?.prompt).toContain("source-part storyboard");
    expect(cards[2]?.prompt).toContain("previous slide prompt summary");
    expect(cards[2]?.prompt).toContain("Do not stop at an outline");
  });
});
