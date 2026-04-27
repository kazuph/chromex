import { describe, expect, test } from "vitest";

import { getUiStrings } from "../src/sidepanel/i18n.js";
import { listSupportedUiLanguageOptions } from "../src/ui-language.js";

describe("side panel i18n", () => {
  test("labels the tab picker as open tabs instead of recent tabs", () => {
    expect(getUiStrings("en").labels.recentTabs).toBe("Open tabs");
    expect(getUiStrings("ko").labels.recentTabs).toBe("열려 있는 탭");
  });

  test("uses public-facing Codex OAuth and suggested-question wording", () => {
    expect(getUiStrings("en").actions.chatgptLogin).toBe("Codex OAuth login");
    expect(getUiStrings("ko").actions.chatgptLogin).toBe("Codex OAuth 로그인");
    expect(getUiStrings("en").labels.actionCards).toBe("Suggested questions");
    expect(getUiStrings("ko").labels.actionCards).toBe("추천 질문");
    expect(getUiStrings("en").settings.uiTheme).toBe("Theme");
    expect(getUiStrings("ko").settings.themeLight).toBe("화이트");
    expect(getUiStrings("ko").help.emptyActions).toContain("추천 질문");
  });

  test("localizes core shell copy for every language exposed in settings", () => {
    const locales = listSupportedUiLanguageOptions()
      .map((option) => option.locale)
      .filter((locale) => locale !== "auto");

    for (const locale of locales) {
      const strings = getUiStrings(locale);
      expect(strings.labels.settings, locale).toBeTruthy();
      expect(strings.actions.send, locale).toBeTruthy();
      expect(strings.composerPlaceholder, locale).toBeTruthy();
      expect(strings.usageNotice.startCta, locale).toBeTruthy();
    }

    expect(getUiStrings("fr").labels.settings).toBe("Paramètres");
    expect(getUiStrings("ar").actions.send).toBe("إرسال");
    expect(getUiStrings("ja").composerPlaceholder).toContain("質問");
  });
});
