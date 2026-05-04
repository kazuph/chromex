import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const installerSource = readFileSync(resolve(process.cwd(), "../../scripts/install-native-host.mjs"), "utf8");

describe("native host installer", () => {
  test("registers Windows native messaging hosts in both registry views", () => {
    expect(installerSource).toContain("registerWindowsNativeHost");
    expect(installerSource).toContain('"/reg:32"');
    expect(installerSource).toContain('"/reg:64"');
  });

  test("prints Windows verification commands for both registry views", () => {
    expect(installerSource).toContain("/reg:32");
    expect(installerSource).toContain("/reg:64");
  });
});
