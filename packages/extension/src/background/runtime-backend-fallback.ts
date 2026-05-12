import type { RuntimeConfigSnapshot } from "../types.js";

export const COPILOT_FIXED_MODEL_ID = "gpt-5.4";

const AUTO_COPILOT_FALLBACK_ERROR_RE =
  /(?:you['’]ve hit your codex usage limit|codex usage limit|try again after|http\s*500|internal server error)/iu;
const CODEX_BRANDED_FAILURE_RE = /(?:you['’]ve hit your codex usage limit|codex usage limit|try again after)/iu;

export function shouldAutoSwitchToCopilotBackend(input: {
  runtimeConfig: RuntimeConfigSnapshot | null | undefined;
  error: unknown;
}): boolean {
  const message = toErrorMessage(input.error);
  if (input.runtimeConfig?.backendKind === "copilot" && !CODEX_BRANDED_FAILURE_RE.test(message)) {
    return false;
  }
  return AUTO_COPILOT_FALLBACK_ERROR_RE.test(message);
}

export function getPreferredModelForRuntimeBackend(
  runtimeConfig: RuntimeConfigSnapshot | null | undefined,
  fallbackModel = "",
): string {
  return runtimeConfig?.backendKind === "copilot" ? COPILOT_FIXED_MODEL_ID : fallbackModel;
}

export function forceCopilotRuntimeConfig(
  runtimeConfig: RuntimeConfigSnapshot | null | undefined,
  workspaceRoot = "",
): RuntimeConfigSnapshot {
  const configuredCommand = runtimeConfig?.codexBinPath?.trim() || "copilot";
  return {
    workspaceRoot: runtimeConfig?.workspaceRoot?.trim() || workspaceRoot,
    codexBinPath: configuredCommand,
    resolvedCodexBinPath: runtimeConfig?.resolvedCodexBinPath?.trim() || configuredCommand,
    codexBinSource: runtimeConfig?.codexBinSource ?? "configured",
    configuredCodexBinPathInvalid: runtimeConfig?.configuredCodexBinPathInvalid ?? false,
    backendKind: "copilot",
  };
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error ?? "");
}
