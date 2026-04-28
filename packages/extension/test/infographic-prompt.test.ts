import { describe, expect, test } from "vitest";

import { buildInfographicPrompt } from "../src/infographic-prompt.js";

describe("buildInfographicPrompt", () => {
  test("builds a high-quality gpt-image-2 infographic prompt from current page data", () => {
    const prompt = buildInfographicPrompt({
      locale: "ko",
      pageTitle: "AI 시장 보고서",
      pageUrl: "https://example.com/report",
    });

    expect(prompt).toContain("gpt-image-2");
    expect(prompt).toContain("Use case: infographic-diagram");
    expect(prompt).toContain("1024x1536");
    expect(prompt).toContain("high quality");
    expect(prompt).toContain("PRIVATE PAGE CONTEXT");
    expect(prompt).toContain("Do not invent metrics");
    expect(prompt).toContain("readable typography");
    expect(prompt).toContain("Korean");
  });

  test("keeps source context separate from generation instructions", () => {
    const prompt = buildInfographicPrompt({
      locale: "en",
      pageTitle: "Quarterly revenue dashboard",
      pageUrl: "https://example.com/dashboard",
    });

    expect(prompt).toContain("Instructions:");
    expect(prompt).toContain("Source boundary:");
    expect(prompt).toContain('The page context is attached separately as "PRIVATE PAGE CONTEXT"');
    expect(prompt).not.toContain("<script");
  });

  test("uses a video storyboard prompt for YouTube pages", () => {
    const prompt = buildInfographicPrompt({
      locale: "ko",
      pageTitle: "State of the Claw",
      pageUrl: "https://www.youtube.com/watch?v=demo",
      adapterPayload: { platform: "youtube", currentTimeSeconds: 92, transcriptSegments: [] },
    });

    expect(prompt).toContain("Site template: YouTube video infographic");
    expect(prompt).toContain("chapters or timeline");
    expect(prompt).toContain("timestamp");
  });

  test("uses a paper explainer prompt for arxiv and PDF research pages", () => {
    const prompt = buildInfographicPrompt({
      locale: "en",
      pageTitle: "Attention Is All You Need",
      pageUrl: "https://arxiv.org/abs/1706.03762",
      adapterPayload: { platform: "arxiv", arxivId: "1706.03762" },
    });

    expect(prompt).toContain("Site template: research paper infographic");
    expect(prompt).toContain("problem, method, evidence, limitations");
    expect(prompt).toContain("Do not fabricate experimental results");
  });

  test("uses a news article prompt for news pages", () => {
    const prompt = buildInfographicPrompt({
      locale: "ko",
      pageTitle: "속보 기사",
      pageUrl: "https://news.naver.com/article/001/0000000000",
      adapterPayload: { platform: "news", region: "kr" },
    });

    expect(prompt).toContain("Site template: news article infographic");
    expect(prompt).toContain("who, what, when, where, why, how");
    expect(prompt).toMatch(/separate confirmed facts from implications/iu);
  });

  test("uses an information-architecture prompt for reference and work pages", () => {
    const prompt = buildInfographicPrompt({
      locale: "en",
      pageTitle: "Project workspace",
      pageUrl: "https://www.notion.so/team/project",
      adapterPayload: { platform: "notion" },
    });

    expect(prompt).toContain("Site template: information map infographic");
    expect(prompt).toContain("taxonomy, process, checklist, comparison");
    expect(prompt).toMatch(/turn scattered page sections into a navigable map/iu);
  });
});
