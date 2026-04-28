import { readFileSync } from "node:fs";

import { describe, expect, test } from "vitest";

const storageSource = readFileSync(new URL("../src/background/storage.ts", import.meta.url), "utf8");
const sidepanelSource = readFileSync(new URL("../src/sidepanel/index.ts", import.meta.url), "utf8");
const i18nSource = readFileSync(new URL("../src/sidepanel/i18n.ts", import.meta.url), "utf8");
const sidepanelCss = readFileSync(new URL("../public/sidepanel.css", import.meta.url), "utf8");
const micPermissionCss = readFileSync(new URL("../public/mic-permission.css", import.meta.url), "utf8");

describe("theme integration", () => {
  test("persists the theme setting and exposes it in the settings UI", () => {
    expect(storageSource).toContain('uiTheme: "system"');
    expect(storageSource).toContain("normalizeUiThemeSetting");
    expect(sidepanelSource).toContain("renderThemeSelect");
    expect(sidepanelSource).toContain("data-theme-choice");
    expect(sidepanelSource).toContain('role="radiogroup"');
    expect(sidepanelSource).toContain("syncDocumentTheme");
    expect(i18nSource).toContain("themeSystem");
    expect(i18nSource).toContain("themeLight");
  });

  test("ships light/system CSS instead of a dark-only panel", () => {
    expect(sidepanelCss).toContain(':root[data-theme="light"]');
    expect(sidepanelCss).toContain('[data-theme-setting="system"]');
    expect(sidepanelCss).toContain(".theme-choice-grid");
    expect(sidepanelCss).toContain(".theme-preview-system");
    expect(sidepanelCss).toContain(':root[data-theme="light"] .view-return-header');
    expect(sidepanelCss).toContain(':root[data-theme="light"] .message-code-block');
    expect(sidepanelCss).toContain(':root[data-theme="light"] .tab-mention-header');
    expect(sidepanelCss).toContain(':root[data-theme="light"] .composer-model-trigger-label');
    expect(sidepanelCss).toContain("color-scheme: light");
    expect(micPermissionCss).toContain("@media (prefers-color-scheme: light)");
  });
});
