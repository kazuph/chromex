import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const sidepanelSource = readFileSync(resolve(process.cwd(), "src/sidepanel/index.ts"), "utf8");

describe("turn steer sidepanel wiring", () => {
  test("routes active-turn composer sends through turn.steer", () => {
    expect(sidepanelSource).toContain("shouldSendComposerAsTurnSteer");
    expect(sidepanelSource).toContain('type: sendAsTurnSteer ? "turn.steer" : "prompt.send"');
  });

  test("preserves the active turn after a steer response is accepted", () => {
    expect(sidepanelSource).toContain('from "./active-turn-after-send.js"');
    expect(sidepanelSource).toContain("const acceptedActiveTurn = resolveAcceptedPromptActiveTurn({");
    expect(sidepanelSource).toContain("state.activeTurn = acceptedActiveTurn;");
  });
});
