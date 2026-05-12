import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

import {
  COPILOT_FIXED_MODEL_ID,
  getPreferredModelForRuntimeBackend,
  shouldAutoSwitchToCopilotBackend,
} from "../src/background/runtime-backend-fallback.js";

const backgroundSource = readFileSync(resolve(process.cwd(), "src/background/index.ts"), "utf8");

function getFunctionSource(source: string, name: string): string {
  const startMatch = new RegExp(`(?:async\\s+)?function\\s+${name}\\b`, "u").exec(source);
  const start = startMatch?.index ?? -1;
  if (start < 0) {
    return "";
  }
  const rest = source.slice(start + 1);
  const nextMatch = /\n(?:async\s+)?function\s+/u.exec(rest);
  return nextMatch ? source.slice(start, start + 1 + nextMatch.index) : source.slice(start);
}

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

  test("captures turn.failed events from prompt.send before deciding fallback", () => {
    const requestPromptSendSource = getFunctionSource(backgroundSource, "requestPromptSendWithAssistantCapture");
    const collectFailedTurnErrorSource = getFunctionSource(backgroundSource, "collectFailedTurnError");

    expect(requestPromptSendSource).toContain("isFailedTurnEvent");
    expect(requestPromptSendSource).toContain("collectFailedTurnError");
    expect(collectFailedTurnErrorSource).toContain('event.clientRequestId === clientRequestId');
  });
});
