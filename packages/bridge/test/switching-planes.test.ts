import { describe, expect, test, vi } from "vitest";

import { detectBackendKind } from "../src/backend-kind.js";
import { CodexAppServerClient } from "../src/codex-app-server.js";
import { ActiveBackendRuntime, SwitchingCodexPlane } from "../src/switching-planes.js";
import type { BridgeCodexPlane, SessionParams } from "../src/types.js";

function createPlane(overrides: Partial<BridgeCodexPlane> = {}): BridgeCodexPlane {
  const base: BridgeCodexPlane = {
    accountStatus: async () => ({
      authMode: "chatgpt",
      codexAuthenticated: true,
      multimodalAvailable: false,
      openAiApiKeyConfigured: false,
      planType: "plus",
    }),
    login: async () => ({}),
    cancelLogin: async () => undefined,
    logout: async () => undefined,
    listModels: async () => [],
    listThreads: async () => [],
    readThread: async () => ({ id: "thread-1", title: "", preview: "", updatedAt: 0, status: "idle", cwd: "", messages: [] }),
    listTurns: async () => [],
    listSkills: async () => [],
    listApps: async () => [],
    listPlugins: async () => [],
    listMcpServers: async () => [],
    startMcpOauthLogin: async () => ({ authorizationUrl: "" }),
    callMcpTool: async () => ({ content: [] }),
    reloadMcpServers: async () => ({ ok: true }),
    readRateLimits: async () => null,
    setGoal: async () => ({ goal: null }),
    getGoal: async () => ({ goal: null }),
    clearGoal: async () => ({ cleared: true }),
    respondToUserInputRequest: async () => ({ ok: true }),
    openSession: async () => ({ threadId: "thread-1" }),
    resumeSession: async ({ threadId }) => ({ threadId }),
    sendPrompt: async () => ({ threadId: "thread-1", turnId: "turn-1" }),
    compactThread: async ({ threadId }) => ({ threadId: threadId ?? "thread-1", status: "completed" }),
    steerTurn: async ({ threadId }) => ({ threadId: threadId ?? "thread-1", turnId: "turn-1" }),
    interruptTurn: async ({ threadId, turnId }) => ({ threadId, turnId }),
  };

  return {
    ...base,
    ...overrides,
  };
}

describe("SwitchingCodexPlane", () => {
  test("keeps routing session.open to Copilot after a workspace-only config sync", async () => {
    const client = new CodexAppServerClient({
      resolveCommandImpl: async ({ configuredCommand }) => ({
        configuredCommand: configuredCommand ?? "",
        resolvedCommand: configuredCommand?.trim() || "/opt/homebrew/bin/codex",
        source: configuredCommand?.trim() ? "configured" : "path",
        configuredCommandInvalid: false,
      }),
    });

    const runtime = new ActiveBackendRuntime(async () => {
      const inspected = await client.inspectRuntime();
      return {
        workspaceRoot: "/tmp/project",
        codexBinPath: client.getConfiguredCommand(),
        resolvedCodexBinPath: inspected.resolvedCommand,
        codexBinSource: inspected.source,
        configuredCodexBinPathInvalid: inspected.configuredCommandInvalid,
        backendKind: detectBackendKind(inspected.resolvedCommand || client.getConfiguredCommand()),
      };
    });
    const codexOpenSession = vi.fn(async (_params: SessionParams) => ({ threadId: "codex-thread" }));
    const copilotOpenSession = vi.fn(async (_params: SessionParams) => ({ threadId: "copilot-thread" }));
    const switchingPlane = new SwitchingCodexPlane({
      runtime,
      codex: createPlane({ openSession: codexOpenSession }),
      copilot: createPlane({ openSession: copilotOpenSession }),
    });

    await client.configure({ command: "copilot" });
    await client.configure({});

    await expect(switchingPlane.openSession({ model: "gpt-5.4" })).resolves.toEqual({ threadId: "copilot-thread" });
    expect(copilotOpenSession).toHaveBeenCalledOnce();
    expect(codexOpenSession).not.toHaveBeenCalled();
  });
});
