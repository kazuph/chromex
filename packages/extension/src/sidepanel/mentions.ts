import type { CodexAppOption, CodexPluginOption, CodexSkillOption } from "@codex-sidepanel/shared";

import { getUiStrings, type UiLocale } from "./i18n.js";

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
  const strings = getUiStrings(locale);
  const options: MentionOption[] = [
    {
      id: "context:open-tabs",
      kind: "context",
      contextId: "open-tabs",
      label: strings.labels.openTabs,
      description: strings.permissions.openTabs,
    },
  ];
  void catalog;
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    return options;
  }

  return options.filter((option) => matchesMentionQuery(option, normalized));
}

function matchesMentionQuery(option: MentionOption, normalizedQuery: string): boolean {
  const searchable = [option.contextId, option.label, option.description, "tabs", "tab"];
  return searchable.some((value) => value.toLowerCase().includes(normalizedQuery));
}
