import { describe, expect, test } from "vitest";

import type { PageContextEnvelope, ProfileTemplate } from "@codex-sidepanel/shared";
import { mapModels, mapThreadTranscript } from "../src/app-server-mappers.js";
import { createCodexTurnInput } from "../src/index.js";

const profile: ProfileTemplate = {
  id: "marketing-copilot",
  name: "Marketing Copilot",
  systemPrompt: "Write with the AIDA framework and include strong hooks.",
  defaultContextPolicy: {
    attachCurrentPageByDefault: false,
    allowedReadStrategies: ["dom"],
  },
  allowedSources: ["current-page"],
  preferredActions: [],
  adapterHints: [],
};

const context: PageContextEnvelope = {
  metadata: {
    url: "https://example.com",
    title: "Example",
    domain: "example.com",
  },
  selectionText: "",
  domSummary: "Private page facts.",
  visionAssets: [],
  adapterPayload: null,
  privacyFlags: {
    containsSensitiveFormData: false,
    userConsentedToHistory: false,
  },
};

describe("mapThreadTranscript", () => {
  test("preserves app-server model tool capability metadata", () => {
    expect(
      mapModels([
        {
          id: "gpt-5.4",
          model: "gpt-5.4",
          displayName: "GPT-5.4",
          description: "Frontier model",
          supportsParallelToolCalls: true,
          supportsSearchTool: true,
        },
      ] as never)[0],
    ).toMatchObject({
      id: "gpt-5.4",
      supportsParallelToolCalls: true,
      supportsSearchTool: true,
    });
  });

  test("shows only the user request for side-panel chat messages", () => {
    const input = createCodexTurnInput({
      profile,
      message: "랜딩페이지 훅을 5개 만들어줘.",
      contexts: [context],
    });

    const transcript = mapThreadTranscript({
      id: "thread-1",
      turns: [
        {
          id: "turn-1",
          items: [
            {
              type: "userMessage",
              id: "user-1",
              content: [{ type: "text", text: input }],
            },
          ],
        },
      ],
    });

    expect(transcript.messages[0]?.text).toBe("랜딩페이지 훅을 5개 만들어줘.");
    expect(transcript.messages[0]?.text).not.toContain("PRIVATE INSTRUCTION PROFILE");
    expect(transcript.messages[0]?.text).not.toContain(profile.systemPrompt);
    expect(transcript.messages[0]?.text).not.toContain("PRIVATE PAGE CONTEXT");
  });
});
