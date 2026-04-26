import { homedir } from "node:os";
import { basename, posix, win32 } from "node:path";

export type RuntimePlatform = NodeJS.Platform;

export interface PlatformPathOptions {
  platformName?: RuntimePlatform;
  env?: NodeJS.ProcessEnv;
  homeDirectory?: string;
}

export interface HookShellCommand {
  command: string;
  args: string[];
}

export function resolveCodexSidepanelConfigDir(options: PlatformPathOptions = {}): string {
  const platformName = options.platformName ?? process.platform;
  const env = options.env ?? process.env;
  const homeDirectory = options.homeDirectory ?? homedir();
  const path = getPathApi(platformName);

  if (platformName === "darwin") {
    return path.resolve(homeDirectory, "Library", "Application Support", "CodexSidepanel");
  }
  if (platformName === "win32") {
    return path.resolve(env.LOCALAPPDATA || env.APPDATA || path.resolve(homeDirectory, "AppData", "Local"), "CodexSidepanel");
  }
  return path.resolve(env.XDG_CONFIG_HOME || path.resolve(homeDirectory, ".config"), "codex-sidepanel");
}

export function resolveCodexSidepanelDataDir(options: PlatformPathOptions = {}): string {
  const platformName = options.platformName ?? process.platform;
  const env = options.env ?? process.env;
  const homeDirectory = options.homeDirectory ?? homedir();
  const path = getPathApi(platformName);

  if (platformName === "darwin") {
    return resolveCodexSidepanelConfigDir({ platformName, env, homeDirectory });
  }
  if (platformName === "win32") {
    return path.resolve(env.LOCALAPPDATA || env.APPDATA || path.resolve(homeDirectory, "AppData", "Local"), "CodexSidepanel");
  }
  return path.resolve(env.XDG_DATA_HOME || path.resolve(homeDirectory, ".local", "share"), "codex-sidepanel");
}

export function resolveDefaultSecretStorePath(options: PlatformPathOptions = {}): string {
  return getPathApi(options.platformName ?? process.platform).join(resolveCodexSidepanelConfigDir(options), "secrets.json");
}

export function resolveDefaultDiagnosticLogDir(options: PlatformPathOptions = {}): string {
  return getPathApi(options.platformName ?? process.platform).join(resolveCodexSidepanelDataDir(options), "Logs");
}

export function resolveDefaultGeneratedImageDir(options: PlatformPathOptions = {}): string {
  return getPathApi(options.platformName ?? process.platform).join(resolveCodexSidepanelDataDir(options), "Generated Images");
}

export function resolveOpenFolderCommand(
  folder: string,
  platformName: RuntimePlatform = process.platform,
): { command: string; args: string[] } {
  if (platformName === "darwin") {
    return { command: "open", args: [folder] };
  }
  if (platformName === "win32") {
    return { command: "explorer.exe", args: [folder] };
  }
  return { command: "xdg-open", args: [folder] };
}

export function resolveHookShellCommand(
  commandText: string,
  options: PlatformPathOptions = {},
): HookShellCommand {
  const platformName = options.platformName ?? process.platform;
  const env = options.env ?? process.env;

  if (platformName === "win32") {
    return {
      command: env.ComSpec || win32.join(env.SystemRoot || "C:\\Windows", "System32", "cmd.exe"),
      args: ["/d", "/s", "/c", commandText],
    };
  }

  const shell = env.SHELL || "/bin/bash";
  const shellName = basename(shell).toLowerCase();
  return {
    command: shell,
    args: shellName.includes("bash") || shellName.includes("zsh") || shellName.includes("fish")
      ? ["-lc", commandText]
      : ["-c", commandText],
  };
}

function getPathApi(platformName: RuntimePlatform): typeof posix | typeof win32 {
  return platformName === "win32" ? win32 : posix;
}
