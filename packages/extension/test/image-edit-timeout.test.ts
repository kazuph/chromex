import { describe, expect, test } from "vitest";

import { buildImageEditTimeoutMessage, IMAGE_EDIT_TIMEOUT_MS } from "../src/background/image-edit-timeout.js";

describe("image edit timeout policy", () => {
  test("waits up to 20 minutes for long Codex image generation jobs", () => {
    expect(IMAGE_EDIT_TIMEOUT_MS).toBe(20 * 60 * 1000);
  });

  test("explains the 20 minute image generation timeout to the user", () => {
    expect(buildImageEditTimeoutMessage()).toContain("20 minutes");
    expect(buildImageEditTimeoutMessage()).toContain("20분");
  });
});
