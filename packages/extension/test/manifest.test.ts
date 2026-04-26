import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

describe("extension manifest", () => {
  test("keeps intrusive permissions optional and uses a stable public key for unpacked native host installs", () => {
    const manifestPath = resolve(dirname(fileURLToPath(import.meta.url)), "../public/manifest.json");
    const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
      action?: {
        default_icon?: Record<string, string>;
        default_title?: string;
      };
      icons?: Record<string, string>;
      key?: string;
      name?: string;
      permissions?: string[];
      optional_permissions?: string[];
      web_accessible_resources?: unknown[];
    };

    expect(manifest.name).toBe("__MSG_extensionName__");
    expect(manifest.icons?.["128"]).toBe("icons/codex-128.png");
    expect(manifest.action?.default_title).toBe("__MSG_actionOpenSidePanel__");
    expect(manifest.action?.default_icon?.["32"]).toBe("icons/codex-32.png");
    expect(manifest.key).toBe("MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuP+A4d/pFvVoYH/4yByEMq1JknmBMcsBo5hbyjFDRthp9GrAWTnksc0X/dP5kftZ45O+IlfP6rfg5w7ktNDt7tuJ0TpslnQEUvzC9D0CkEWzj6OmuWgY7nCtmnuHHItp1xJR9RsCDMNg9qFf54EiCf6eyTDrkJnn1yeIx/rIZRcbqnFjBLrVsuSz18L21/b+zQ8o+xzPWWhOYGVnuxuQvL57/MiDfSJ5zI0xgnYgMP/OXhdRTKmJeu/0pdEcrk2y1WgAE2LfI0jKjF6VIjKmDHabJRlP3/UZy6siRFHPZs2Q5Eh+Wxb0MtfiXN2r64R9p7MjGOkaw71GH+itEiAxuwIDAQAB");
    expect(manifest.permissions ?? []).not.toContain("tabs");
    expect(manifest.optional_permissions ?? []).toContain("tabs");
    expect(manifest.optional_permissions ?? []).not.toContain("tabCapture");
    expect(manifest.web_accessible_resources).toBeUndefined();
  });

  test("ships Chromex localized name and icon assets", () => {
    const publicDir = resolve(dirname(fileURLToPath(import.meta.url)), "../public");
    const englishMessages = JSON.parse(
      readFileSync(resolve(publicDir, "_locales/en/messages.json"), "utf8"),
    ) as { extensionName?: { message?: string } };
    const koreanMessages = JSON.parse(
      readFileSync(resolve(publicDir, "_locales/ko/messages.json"), "utf8"),
    ) as { extensionName?: { message?: string } };

    expect(englishMessages.extensionName?.message).toBe("Chromex");
    expect(koreanMessages.extensionName?.message).toBe("Chromex");
    for (const size of [16, 24, 32, 48, 128]) {
      expect(existsSync(resolve(publicDir, `icons/codex-${size}.png`))).toBe(true);
    }
    expect(existsSync(resolve(publicDir, "icons/codex-source.jpeg"))).toBe(true);
    expect(existsSync(resolve(publicDir, "icons/chromex-source.png"))).toBe(true);
    expect(existsSync(resolve(publicDir, "icons/chromex-line-source.png"))).toBe(true);
    expect(existsSync(resolve(publicDir, "icons/codex-mono-128.png"))).toBe(true);
  });
});
