import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, test } from "vitest";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readRepoFile(path: string): string {
  return readFileSync(resolve(repoRoot, path), "utf8");
}

describe("open-source repository hygiene", () => {
  test("ships a root license for public distribution", () => {
    const licensePath = resolve(repoRoot, "LICENSE");
    const packageJson = JSON.parse(readRepoFile("package.json")) as { license?: string };
    const workspacePackages = ["packages/shared", "packages/bridge", "packages/native-host", "packages/extension"];

    expect(existsSync(licensePath)).toBe(true);
    expect(readRepoFile("LICENSE")).toContain("MIT License");
    expect(packageJson.license).toBe("MIT");
    for (const workspacePath of workspacePackages) {
      const workspacePackageJson = JSON.parse(readRepoFile(`${workspacePath}/package.json`)) as { license?: string };
      expect(workspacePackageJson.license).toBe("MIT");
    }
  });

  test("keeps generated local artifacts out of source control", () => {
    const gitignore = readRepoFile(".gitignore");

    expect(gitignore).toContain(".codex-sidepanel/");
    expect(gitignore).toContain("packages/*/dist/");
    expect(gitignore).toContain("tmp-smoke-debug.png");
    expect(gitignore).toContain("codex-sidepanel-backups/");
    expect(gitignore).toContain(".env");
    expect(gitignore).toContain("coverage/");
  });

  test("documents the release backup and verification flow", () => {
    const checklistPath = resolve(repoRoot, "docs/open-source-release-checklist.md");

    expect(existsSync(checklistPath)).toBe(true);
    expect(readRepoFile("docs/open-source-release-checklist.md")).toContain("Backup");
    expect(readRepoFile("README.md")).toContain("open-source release checklist");
  });

  test("does not allow legacy extension ids in the native-host installer by default", () => {
    const installer = readRepoFile("scripts/install-native-host.mjs");

    expect(installer).toContain("--include-legacy-extension-ids");
    expect(installer).toContain("includeLegacyExtensionIds ? LEGACY_EXTENSION_IDS : []");
    expect(installer).not.toContain("[extensionId, ...LEGACY_EXTENSION_IDS, ...discoveredExtensionIds]");
  });
});
