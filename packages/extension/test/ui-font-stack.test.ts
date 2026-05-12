import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const sidepanelCss = readFileSync(resolve(process.cwd(), "public/sidepanel.css"), "utf8");
const micPermissionCss = readFileSync(resolve(process.cwd(), "public/mic-permission.css"), "utf8");

describe("Japanese UI font stack", () => {
  test("uses a Japanese-friendly system font stack in the sidepanel window", () => {
    expect(sidepanelCss).toContain("--font-ui:");
    expect(sidepanelCss).toContain('"Hiragino Sans"');
    expect(sidepanelCss).toContain('"Yu Gothic UI"');
    expect(sidepanelCss).toContain("font-family: var(--font-ui);");
  });

  test("uses the same Japanese-friendly font stack in the mic permission window", () => {
    expect(micPermissionCss).toContain("--font-ui:");
    expect(micPermissionCss).toContain('"Hiragino Sans"');
    expect(micPermissionCss).toContain('"Yu Gothic UI"');
    expect(micPermissionCss).toContain("font-family: var(--font-ui);");
  });
});
