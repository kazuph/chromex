import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const sidepanelSource = readFileSync(resolve(process.cwd(), "src/sidepanel/index.ts"), "utf8");

function functionBody(name: string): string {
  const start = sidepanelSource.indexOf(`function ${name}`);
  if (start < 0) {
    return "";
  }

  const nextFunction = sidepanelSource.indexOf("\nfunction ", start + 1);
  return nextFunction < 0 ? sidepanelSource.slice(start) : sidepanelSource.slice(start, nextFunction);
}

describe("voice activation sequencing", () => {
  test("does not send microphone audio until the app-server reports realtime started", () => {
    const startBody = functionBody("startRealtimeVoiceSession");
    const eventBlockIndex = sidepanelSource.indexOf('event.type === "voice.session.started"');

    expect(sidepanelSource).toContain("activateRealtimeVoiceSession");
    expect(startBody).not.toContain("startRealtimeAudioInput(stream)");
    expect(startBody).toContain("waitForRealtimeVoiceStarted");
    expect(sidepanelSource.slice(eventBlockIndex, eventBlockIndex + 500)).toContain("activateRealtimeVoiceSession");
  });
});
