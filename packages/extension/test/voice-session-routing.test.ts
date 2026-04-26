import { describe, expect, test } from "vitest";

import { buildVoiceSessionStartParams, buildVoiceSessionStopParams } from "../src/background/voice-session-routing.js";

describe("background realtime voice routing", () => {
  test("does not reuse the active chat thread for voice start", () => {
    expect(buildVoiceSessionStartParams({ sdp: "offer-sdp" }, "chat-thread")).toEqual({
      sdp: "offer-sdp",
      outputModality: "audio",
    });
  });

  test("preserves an explicit realtime voice thread id", () => {
    expect(buildVoiceSessionStartParams({ threadId: "voice-thread", sdp: "offer-sdp" }, "chat-thread")).toEqual({
      threadId: "voice-thread",
      sdp: "offer-sdp",
      outputModality: "audio",
    });
  });

  test("passes only Codex app-server supported voices", () => {
    expect(buildVoiceSessionStartParams({ sdp: "offer-sdp", voice: "ballad" }, "chat-thread")).toEqual({
      sdp: "offer-sdp",
      outputModality: "audio",
      voice: "ballad",
    });
    expect(buildVoiceSessionStartParams({ sdp: "offer-sdp", voice: "Google US English" }, "chat-thread")).toEqual({
      sdp: "offer-sdp",
      outputModality: "audio",
    });
  });

  test("does not reuse the active chat thread for voice stop", () => {
    expect(buildVoiceSessionStopParams({}, "chat-thread")).toEqual({});
    expect(buildVoiceSessionStopParams({ threadId: "voice-thread" }, "chat-thread")).toEqual({ threadId: "voice-thread" });
  });
});
