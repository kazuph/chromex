import { getPromptOutputLanguageName } from "./ui-language.js";

export interface InfographicPromptInput {
  locale: string;
  pageTitle: string;
  pageUrl: string;
  adapterPayload?: Record<string, unknown> | null;
}

type InfographicSiteTemplate = "youtube" | "paper" | "news" | "information" | "default";

export function buildInfographicPrompt(input: InfographicPromptInput): string {
  const outputLanguage = getPromptOutputLanguageName(input.locale);
  const title = input.pageTitle.trim() || "Current page";
  const url = input.pageUrl.trim() || "unknown URL";
  const siteTemplate = inferInfographicSiteTemplate(input);

  return [
    "Instructions:",
    "Use gpt-image-2 to generate exactly one polished infographic image from the attached current-page data.",
    "Use case: infographic-diagram",
    "Output target: 1024x1536 vertical poster, high quality, mobile-readable.",
    `Output language: ${outputLanguage}.`,
    "Source boundary:",
    'The page context is attached separately as "PRIVATE PAGE CONTEXT". Use only that current-page DOM/adapter data as source material.',
    "Do not invent metrics, quotes, product claims, dates, citations, or causal relationships. If exact numbers are unavailable, use qualitative callouts instead of fake numbers.",
    "Content plan:",
    "- Extract one clear headline, three to five key insights, and up to one hero statistic only if a real number exists in the source.",
    "- Prefer compact labels, short captions, timeline/cards/comparison blocks, and visible hierarchy over dense paragraphs.",
    "- If the page is a video/article/report, show the core story, evidence, and practical takeaway rather than a generic summary.",
    ...createSiteTemplatePrompt(siteTemplate),
    "Visual direction:",
    "- Use readable typography, high contrast, generous whitespace, precise alignment, and clean editorial composition.",
    "- Use simple chart-like blocks, callouts, arrows, dividers, icons, and section headers where helpful.",
    "- Keep all in-image text crisp, correctly spelled, and large enough to read on a phone.",
    "- No watermark, no fake logo, no browser chrome, no UI frame, no decorative filler that hides the information.",
    "Page metadata:",
    `Title: ${title}`,
    `URL: ${url}`,
  ].join("\n");
}

function inferInfographicSiteTemplate(input: InfographicPromptInput): InfographicSiteTemplate {
  const platform = getString(input.adapterPayload?.platform);
  if (platform === "youtube") {
    return "youtube";
  }
  if (platform === "arxiv" || platform === "pdf-document" || platform === "research") {
    return "paper";
  }
  if (platform === "news") {
    return "news";
  }
  if (isInformationPlatform(platform)) {
    return "information";
  }

  const parsed = parseUrl(input.pageUrl);
  const hostname = parsed?.hostname.replace(/^www\./iu, "").toLowerCase() ?? "";
  const pathname = parsed?.pathname.toLowerCase() ?? "";
  if (hostname === "youtube.com" || hostname.endsWith(".youtube.com") || hostname === "youtu.be") {
    return "youtube";
  }
  if (hostname === "arxiv.org" || pathname.endsWith(".pdf") || /\b(?:doi|paper|journal|research)\b/iu.test(hostname + pathname)) {
    return "paper";
  }
  if (/\b(?:news|article|press|media|journal)\b/iu.test(hostname + pathname)) {
    return "news";
  }
  if (/\b(?:docs|notion|wiki|help|guide|dashboard|report|manual|learn|support)\b/iu.test(hostname + pathname)) {
    return "information";
  }
  return "default";
}

function createSiteTemplatePrompt(template: InfographicSiteTemplate): string[] {
  switch (template) {
    case "youtube":
      return [
        "Site template: YouTube video infographic.",
        "- Build a video storyboard: hook, chapters or timeline, key moments, evidence from transcript/description, and final takeaway.",
        "- Use timestamp labels only when actual timestamps or current playback time exist in the attached context.",
        "- Do not invent chapter names, speaker quotes, view counts, or timestamps.",
      ];
    case "paper":
      return [
        "Site template: research paper infographic.",
        "- Structure as problem, method, evidence, limitations, and implications.",
        "- Prefer a visual pipeline, comparison matrix, or concept diagram over a generic summary poster.",
        "- Do not fabricate experimental results, benchmarks, author claims, equations, citations, or statistical significance.",
      ];
    case "news":
      return [
        "Site template: news article infographic.",
        "- Organize the story by who, what, when, where, why, how, then add a concise impact/next-step section.",
        "- Separate confirmed facts from implications, background, and open questions.",
        "- Do not add unsourced dates, numbers, quotes, political claims, or causal explanations.",
      ];
    case "information":
      return [
        "Site template: information map infographic.",
        "- Use taxonomy, process, checklist, comparison, or decision-tree structure based on the page content.",
        "- Turn scattered page sections into a navigable map with grouped labels and clear next actions.",
        "- If the page contains a dashboard or report, chart only real values found in the source context.",
      ];
    case "default":
      return [
        "Site template: general page infographic.",
        "- Choose the clearest structure from summary cards, timeline, comparison, checklist, or concept map.",
        "- Favor practical takeaways and source-grounded hierarchy over decorative filler.",
      ];
  }
}

function isInformationPlatform(platform: string): boolean {
  return new Set([
    "google-docs",
    "google-sheets",
    "google-slides",
    "google-drive",
    "google-keep",
    "github",
    "notion",
    "figma",
    "shopping",
    "travel",
    "gmail",
    "korean-mail",
    "slack",
    "google-chat",
    "teams",
    "kakaowork",
    "naver-works",
    "flow",
    "asana",
    "clickup",
    "jira",
    "trello",
    "evernote",
    "onenote",
    "samsung-notes",
    "korean-writing",
    "korean-work",
    "korean-community",
    "korean-hiring",
  ]).has(platform);
}

function getString(value: unknown): string {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}
