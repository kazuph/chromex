import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const sidepanelSource = readFileSync(resolve(process.cwd(), "src/sidepanel/index.ts"), "utf8");
const backgroundSource = readFileSync(resolve(process.cwd(), "src/background/index.ts"), "utf8");

describe("sequential image generation UI", () => {
  test("renders all preview refs returned from one Codex image-generation turn", () => {
    expect(backgroundSource).toContain("previewRefs");
    expect(backgroundSource).toContain('case "image.slides.start"');
    expect(backgroundSource).toContain("buildSlideDeckImagePrompt");
    expect(sidepanelSource).toContain("normalizeImagePreviewRefs");
    expect(sidepanelSource).toContain("hydrateConversationImages");
    expect(sidepanelSource).toContain("previewRefs.map");
    expect(sidepanelSource).toContain("isSlideImageGenerationActionCard");
    expect(sidepanelSource).toContain("createSlideImagesFromCurrentPage");
  });

  test("keeps direct image generation results scoped to the originating conversation", () => {
    expect(sidepanelSource).toContain("promptRequestConversationIds.set(clientRequestId, conversationIdAtStart)");
    expect(sidepanelSource).toContain("conversationId: conversationIdAtStart");
    expect(sidepanelSource).toContain("hydrateGeneratedImagesForDetachedConversation");
    expect(backgroundSource).toContain("conversationId: normalizeOptionalConversationId(conversationIdInput)");
  });
});
