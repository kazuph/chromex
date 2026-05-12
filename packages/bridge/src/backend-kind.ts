export type BridgeBackendKind = "codex" | "copilot";

export function detectBackendKind(command: string | null | undefined): BridgeBackendKind {
  const basename = String(command ?? "")
    .trim()
    .replace(/\\/gu, "/")
    .split("/")
    .pop()
    ?.toLowerCase()
    .replace(/\.(?:exe|cmd|bat|com)$/iu, "") ?? "";
  if (basename === "copilot" || basename === "github-copilot") {
    return "copilot";
  }
  return "codex";
}

export function isCopilotBackendCommand(command: string | null | undefined): boolean {
  return detectBackendKind(command) === "copilot";
}
