import { describe, expect, test } from "vitest";

import { resolveCodexCommand } from "../src/codex-discovery.js";

function createExecutableProbe(paths: string[]) {
  const known = new Set(paths);
  return async (path: string) => known.has(path);
}

describe("resolveCodexCommand", () => {
  test("falls back to PATH detection when a configured command is invalid", async () => {
    const result = await resolveCodexCommand({
      configuredCommand: "/missing/codex",
      pathValue: "/opt/homebrew/bin:/usr/bin",
      platformName: "darwin",
      homeDirectory: "/Users/example",
      isExecutable: createExecutableProbe(["/opt/homebrew/bin/codex"]),
    });

    expect(result).toEqual({
      configuredCommand: "/missing/codex",
      resolvedCommand: "/opt/homebrew/bin/codex",
      source: "path",
      configuredCommandInvalid: true,
    });
  });

  test("returns missing when no configured, env, path, or common command exists", async () => {
    const result = await resolveCodexCommand({
      configuredCommand: "",
      envCommand: "",
      pathValue: "",
      platformName: "darwin",
      homeDirectory: "/Users/empty-home",
      isExecutable: createExecutableProbe([]),
    });

    expect(result).toEqual({
      configuredCommand: "",
      resolvedCommand: "",
      source: "missing",
      configuredCommandInvalid: false,
    });
  });

  test("finds the macOS Codex app bundle when Chrome native messaging provides a minimal PATH", async () => {
    const result = await resolveCodexCommand({
      configuredCommand: "",
      envCommand: "",
      pathValue: "/usr/bin:/bin:/usr/sbin:/sbin",
      platformName: "darwin",
      homeDirectory: "/Users/example",
      isExecutable: createExecutableProbe(["/Applications/Codex.app/Contents/Resources/codex"]),
    });

    expect(result).toEqual({
      configuredCommand: "",
      resolvedCommand: "/Applications/Codex.app/Contents/Resources/codex",
      source: "common",
      configuredCommandInvalid: false,
    });
  });

  test("resolves Windows absolute commands and PATH variants with Windows path semantics", async () => {
    const result = await resolveCodexCommand({
      configuredCommand: "C:\\Users\\example\\AppData\\Local\\Programs\\Codex\\codex.exe",
      pathValue: "C:\\Tools;C:\\Windows\\System32",
      platformName: "win32",
      homeDirectory: "C:\\Users\\example",
      isExecutable: createExecutableProbe(["C:\\Users\\example\\AppData\\Local\\Programs\\Codex\\codex.exe"]),
    });

    expect(result).toEqual({
      configuredCommand: "C:\\Users\\example\\AppData\\Local\\Programs\\Codex\\codex.exe",
      resolvedCommand: "C:\\Users\\example\\AppData\\Local\\Programs\\Codex\\codex.exe",
      source: "configured",
      configuredCommandInvalid: false,
    });
  });
});
