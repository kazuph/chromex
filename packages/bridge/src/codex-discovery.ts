import { access } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import { homedir, platform } from "node:os";
import { delimiter, posix, win32 } from "node:path";

export type CodexCommandSource = "configured" | "env" | "path" | "common" | "missing";

export interface CodexCommandResolution {
  configuredCommand: string;
  resolvedCommand: string;
  source: CodexCommandSource;
  configuredCommandInvalid: boolean;
}

export async function resolveCodexCommand(options: {
  configuredCommand?: string | null;
  envCommand?: string | null;
  pathValue?: string | undefined;
  homeDirectory?: string;
  platformName?: NodeJS.Platform;
  isExecutable?: (path: string) => Promise<boolean>;
} = {}): Promise<CodexCommandResolution> {
  const configuredCommand = options.configuredCommand?.trim() ?? "";
  const envCommand = options.envCommand?.trim() ?? "";
  const pathValue = options.pathValue ?? process.env.PATH ?? "";
  const homeDirectory = options.homeDirectory ?? homedir();
  const platformName = options.platformName ?? platform();
  const isExecutable = options.isExecutable ?? isExecutableFile;

  if (configuredCommand) {
    const resolvedConfigured = await findExecutable(configuredCommand, { pathValue, platformName, isExecutable });
    if (resolvedConfigured) {
      return {
        configuredCommand,
        resolvedCommand: resolvedConfigured,
        source: "configured",
        configuredCommandInvalid: false,
      };
    }
  }

  if (envCommand) {
    const resolvedEnv = await findExecutable(envCommand, { pathValue, platformName, isExecutable });
    if (resolvedEnv) {
      return {
        configuredCommand,
        resolvedCommand: resolvedEnv,
        source: "env",
        configuredCommandInvalid: Boolean(configuredCommand),
      };
    }
  }

  const resolvedPathCommand = await findExecutable("codex", { pathValue, platformName, isExecutable });
  if (resolvedPathCommand) {
    return {
      configuredCommand,
      resolvedCommand: resolvedPathCommand,
      source: "path",
      configuredCommandInvalid: Boolean(configuredCommand),
    };
  }

  for (const candidate of commonCodexCandidates(homeDirectory, platformName)) {
    const resolvedCandidate = await findExecutable(candidate, { pathValue, platformName, isExecutable });
    if (resolvedCandidate) {
      return {
        configuredCommand,
        resolvedCommand: resolvedCandidate,
        source: "common",
        configuredCommandInvalid: Boolean(configuredCommand),
      };
    }
  }

  return {
    configuredCommand,
    resolvedCommand: "",
    source: "missing",
    configuredCommandInvalid: Boolean(configuredCommand),
  };
}

async function findExecutable(
  candidate: string,
  options: {
    pathValue: string;
    platformName: NodeJS.Platform;
    isExecutable: (path: string) => Promise<boolean>;
  },
): Promise<string | null> {
  const trimmed = candidate.trim();
  const pathApi = getPathApi(options.platformName);
  const pathDelimiter = options.platformName === "win32" ? ";" : ":";
  if (!trimmed) {
    return null;
  }

  if (looksLikePath(trimmed, options.platformName)) {
    const absoluteCandidate = pathApi.isAbsolute(trimmed) ? trimmed : pathApi.resolve(trimmed);
    return (await options.isExecutable(absoluteCandidate)) ? absoluteCandidate : null;
  }

  for (const pathEntry of options.pathValue.split(pathDelimiter).filter(Boolean)) {
    for (const variant of commandVariants(trimmed, options.platformName)) {
      const absoluteCandidate = pathApi.join(pathEntry, variant);
      if (await options.isExecutable(absoluteCandidate)) {
        return absoluteCandidate;
      }
    }
  }

  return null;
}

function looksLikePath(candidate: string, platformName: NodeJS.Platform): boolean {
  return candidate.includes("/") || candidate.includes("\\") || (platformName === "win32" && /^[a-zA-Z]:/.test(candidate));
}

function commandVariants(command: string, platformName: NodeJS.Platform): string[] {
  if (platformName !== "win32") {
    return [command];
  }

  const lower = command.toLowerCase();
  if (lower.endsWith(".exe") || lower.endsWith(".cmd") || lower.endsWith(".bat")) {
    return [command];
  }

  return [command, `${command}.exe`, `${command}.cmd`, `${command}.bat`];
}

function commonCodexCandidates(homeDirectory: string, platformName: NodeJS.Platform): string[] {
  if (platformName === "win32") {
    return [
      win32.resolve(homeDirectory, "AppData", "Local", "Programs", "Codex", "codex.exe"),
      win32.resolve(homeDirectory, "scoop", "shims", "codex.cmd"),
    ];
  }

  return [
    "/Applications/Codex.app/Contents/Resources/codex",
    "/Applications/Codex.app/Contents/MacOS/codex",
    posix.resolve(homeDirectory, "Applications/Codex.app/Contents/Resources/codex"),
    posix.resolve(homeDirectory, "Applications/Codex.app/Contents/MacOS/codex"),
    "/opt/homebrew/bin/codex",
    "/usr/local/bin/codex",
    "/usr/bin/codex",
    posix.resolve(homeDirectory, ".local/bin/codex"),
    posix.resolve(homeDirectory, "bin/codex"),
  ];
}

function getPathApi(platformName: NodeJS.Platform): typeof posix | typeof win32 {
  return platformName === "win32" ? win32 : posix;
}

async function isExecutableFile(path: string): Promise<boolean> {
  try {
    await access(path, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}
