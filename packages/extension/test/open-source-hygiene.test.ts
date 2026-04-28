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

  test("documents the public packaging flow without exposing internal release rules", () => {
    const publicReleaseScript = readRepoFile("scripts/package-public-release.mjs");
    const readme = readRepoFile("README.md");
    const koreanReadme = readRepoFile("README.ko.md");

    expect(publicReleaseScript).toContain("/^docs\\//u");
    expect(readme).toContain("npm run package:public");
    expect(koreanReadme).toContain("npm run package:public");
    expect(readme).not.toContain(["What", "Is", "Not", "Published"].join(" "));
    expect(koreanReadme).not.toContain(["공개하지", "않는", "항목"].join(" "));
    expect(readme).not.toContain(["intentionally", "excludes"].join(" "));
    expect(koreanReadme).not.toContain(["의도적으로", "제외"].join(" "));
    expect(readme).not.toContain("docs/");
    expect(koreanReadme).not.toContain("docs/");
    expect(readme).not.toContain(["CONTRIBUTING", "md"].join("."));
    expect(koreanReadme).not.toContain(["CONTRIBUTING", "md"].join("."));
  });

  test("keeps private maintainer rules out of public-facing documents", () => {
    const readme = readRepoFile("README.md");
    const koreanReadme = readRepoFile("README.ko.md");
    const publicReleaseScript = readRepoFile("scripts/package-public-release.mjs");

    expect(publicReleaseScript).toContain("(?:CODEX|CLAUDE|AGENTS|GEMINI|MEMORY)");

    expect(readme).not.toMatch(/legacy personal account/iu);
    expect(koreanReadme).not.toMatch(/과거 개인 계정/iu);
    expect(readme).not.toMatch(/clean public history/iu);
    expect(koreanReadme).not.toMatch(/공개 커밋 이력/iu);
    expect(readme).not.toMatch(/non-user release rules/iu);
    expect(koreanReadme).not.toContain(["내부", "배포", "규칙"].join(" "));
  });

  test("provides clean public packaging and git-history audit scripts", () => {
    const packageJson = JSON.parse(readRepoFile("package.json")) as { scripts?: Record<string, string> };

    expect(packageJson.scripts?.["package:public"]).toContain("scripts/package-public-release.mjs");
    expect(packageJson.scripts?.["release:audit:history"]).toBe("node scripts/audit-git-history.mjs");
    expect(existsSync(resolve(repoRoot, "scripts/package-public-release.mjs"))).toBe(true);
    expect(existsSync(resolve(repoRoot, "scripts/audit-git-history.mjs"))).toBe(true);
  });

  test("does not allow legacy extension ids in the native-host installer by default", () => {
    const installer = readRepoFile("scripts/install-native-host.mjs");

    expect(installer).toContain("--include-legacy-extension-ids");
    expect(installer).toContain("includeLegacyExtensionIds ? LEGACY_EXTENSION_IDS : []");
    expect(installer).not.toContain("[extensionId, ...LEGACY_EXTENSION_IDS, ...discoveredExtensionIds]");
  });
});
