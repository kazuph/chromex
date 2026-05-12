import { describe, expect, test } from "vitest";

import { COPILOT_FIXED_MODEL_ID, normalizeCopilotModel } from "../src/copilot-acp.js";

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
