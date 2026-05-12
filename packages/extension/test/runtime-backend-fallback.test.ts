import { describe, expect, test } from "vitest";

import {
  COPILOT_FIXED_MODEL_ID,
  getPreferredModelForRuntimeBackend,
  shouldAutoSwitchToCopilotBackend,
} from "../src/background/runtime-backend-fallback.js";

describe("runtime backend fallback", () => {
  test("auto-switches to Copilot on Codex usage limit errors", () => {
    expect(
      shouldAutoSwitchToCopilotBackend({
        runtimeConfig: { workspaceRoot: "", codexBinPath: "", resolvedCodexBinPath: "", codexBinSource: "path", configuredCodexBinPathInvalid: false, backendKind: "codex" },
        error: new Error("You've hit your Codex usage limit. Try again after tomorrow."),
      }),
    ).toBe(true);
  });

  test("auto-switches to Copilot on HTTP 500 runtime failures", () => {
    expect(
      shouldAutoSwitchToCopilotBackend({
        runtimeConfig: { workspaceRoot: "", codexBinPath: "", resolvedCodexBinPath: "", codexBinSource: "path", configuredCodexBinPathInvalid: false, backendKind: "codex" },
        error: new Error("HTTP 500: Internal Server Error"),
      }),
    ).toBe(true);
  });

  test("does not auto-switch when already on Copilot", () => {
    expect(
      shouldAutoSwitchToCopilotBackend({
        runtimeConfig: { workspaceRoot: "", codexBinPath: "copilot", resolvedCodexBinPath: "copilot", codexBinSource: "configured", configuredCodexBinPathInvalid: false, backendKind: "copilot" },
        error: new Error("HTTP 500: Internal Server Error"),
      }),
    ).toBe(false);
  });

  test("pins Copilot backend to gpt-5.4", () => {
    expect(
      getPreferredModelForRuntimeBackend({
        workspaceRoot: "",
        codexBinPath: "copilot",
        resolvedCodexBinPath: "copilot",
        codexBinSource: "configured",
        configuredCodexBinPathInvalid: false,
        backendKind: "copilot",
      }),
    ).toBe(COPILOT_FIXED_MODEL_ID);
  });
});
