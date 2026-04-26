import { getTranslatedUiLocale, type UiLocale } from "./i18n.js";

export type SettingsSectionId = "general" | "connection" | "permissions" | "voice";

export type SettingsSection = {
  id: SettingsSectionId;
  label: string;
};

type CopyPackLocale = "en" | "ko";

const SECTION_LABELS: Record<CopyPackLocale, Record<SettingsSectionId, string>> = {
  en: {
    general: "General",
    connection: "Connection",
    permissions: "Permissions",
    voice: "Voice",
  },
  ko: {
    general: "일반",
    connection: "연결",
    permissions: "권한",
    voice: "음성",
  },
};

const SECTION_ORDER: SettingsSectionId[] = ["general", "connection", "permissions", "voice"];

export function listSettingsSections(locale: UiLocale): SettingsSection[] {
  const translatedLocale = getCopyPackLocale(locale);
  return SECTION_ORDER.map((id) => ({
    id,
    label: SECTION_LABELS[translatedLocale][id],
  }));
}

function getCopyPackLocale(locale: UiLocale): CopyPackLocale {
  return getTranslatedUiLocale(locale) === "ko" ? "ko" : "en";
}
