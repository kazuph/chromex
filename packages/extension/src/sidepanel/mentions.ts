import type { CodexAppOption, CodexPluginOption, CodexSkillOption } from "@codex-sidepanel/shared";

import { getTranslatedUiLocale, type UiLocale } from "./i18n.js";

export type ContextMentionId = "open-tabs";

export interface MentionOption {
  id: `context:${ContextMentionId}`;
  kind: "context";
  contextId: ContextMentionId;
  label: string;
  description: string;
}

export interface StructuredMentionCatalog {
  apps?: CodexAppOption[];
  plugins?: CodexPluginOption[];
  skills?: CodexSkillOption[];
}

type CopyPackLocale = "en" | "ko";

const LABELS: Record<CopyPackLocale, Record<ContextMentionId, string>> = {
  en: {
    "open-tabs": "Open tabs",
  },
  ko: {
    "open-tabs": "열린 탭",
  },
};

const DESCRIPTIONS: Record<CopyPackLocale, Record<ContextMentionId, string>> = {
  en: {
    "open-tabs": "Select tabs to compare or use as extra context",
  },
  ko: {
    "open-tabs": "비교하거나 추가 컨텍스트로 사용할 탭을 선택합니다",
  },
};

export function extractMentionQuery(value: string): string | null {
  const match = /(?:^|\s)@([\p{L}\p{N}-]*)$/iu.exec(value);
  if (!match) {
    return null;
  }
  return (match[1] ?? "").toLowerCase();
}

export function listMentionOptions(
  query: string,
  locale: UiLocale = "en",
  catalog: StructuredMentionCatalog = {},
): MentionOption[] {
  const translatedLocale = getCopyPackLocale(locale);
  const options: MentionOption[] = [
    ...(Object.entries(LABELS[translatedLocale]) as Array<[ContextMentionId, string]>).map(([id, label]) => ({
      id: `context:${id}` as const,
      kind: "context" as const,
      contextId: id,
      label,
      description: DESCRIPTIONS[translatedLocale][id],
    })),
  ];
  void catalog;
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return options;
  }

  return options.filter((option) => matchesMentionQuery(option, normalized));
}

function getCopyPackLocale(locale: UiLocale): CopyPackLocale {
  return getTranslatedUiLocale(locale) === "ko" ? "ko" : "en";
}

function matchesMentionQuery(option: MentionOption, normalizedQuery: string): boolean {
  const searchable = [option.contextId, option.label, option.description, "tabs", "tab", "탭"];
  return searchable.some((value) => value.toLowerCase().includes(normalizedQuery));
}
