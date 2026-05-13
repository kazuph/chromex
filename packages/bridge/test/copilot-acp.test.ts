import { describe, expect, test, vi } from "vitest";

import { COPILOT_FIXED_MODEL_ID, createCopilotProcessEnv, normalizeCopilotModel } from "../src/copilot-acp.js";

describe("normalizeCopilotModel", () => {
  test("pins the Copilot backend to gpt-5.4 when no model is selected", () => {
    expect(normalizeCopilotModel("")).toBe(COPILOT_FIXED_MODEL_ID);
    expect(normalizeCopilotModel(undefined)).toBe(COPILOT_FIXED_MODEL_ID);
  });

  test("pins the Copilot backend to gpt-5.4 even when another model is requested", () => {
    expect(normalizeCopilotModel("gpt-5.5")).toBe(COPILOT_FIXED_MODEL_ID);
    expect(normalizeCopilotModel("o3")).toBe(COPILOT_FIXED_MODEL_ID);
  });
});

describe("createCopilotProcessEnv", () => {
  test("preserves an existing auth token env without modification", () => {
    expect(createCopilotProcessEnv({ GH_TOKEN: "existing-token" }).GH_TOKEN).toBe("existing-token");
  });

  test("hydrates GH_TOKEN from gh auth token when no Copilot token env is present", () => {
    const spawnSyncImpl = vi.fn().mockReturnValue({
      status: 0,
      stdout: "gh-from-cli\n",
      stderr: "",
      output: [],
      pid: 0,
      signal: null,
    } as never);
    expect(createCopilotProcessEnv({ HOME: "/Users/example", PATH: "/usr/bin:/bin" }, { spawnSyncImpl }).GH_TOKEN).toBe("gh-from-cli");
  });
});
