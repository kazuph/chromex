import type { RuntimeConfigSnapshot } from "../types.js";

export const COPILOT_FIXED_MODEL_ID = "gpt-5.4";

const AUTO_COPILOT_FALLBACK_ERROR_RE =
  /(?:you['’]ve hit your codex usage limit|codex usage limit|try again after|http\s*500|internal server error)/iu;

export function shouldAutoSwitchToCopilotBackend(input: {
  runtimeConfig: RuntimeConfigSnapshot | null | undefined;
  error: unknown;
}): boolean {
  if (input.runtimeConfig?.backendKind === "copilot") {
    return false;
  }
  return AUTO_COPILOT_FALLBACK_ERROR_RE.test(toErrorMessage(input.error));
}

export function getPreferredModelForRuntimeBackend(
  runtimeConfig: RuntimeConfigSnapshot | null | undefined,
  fallbackModel = "",
): string {
  return runtimeConfig?.backendKind === "copilot" ? COPILOT_FIXED_MODEL_ID : fallbackModel;
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error ?? "");
}
