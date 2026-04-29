import { describe, expect, test } from "vitest";

import { createSubmittedComposerFileAttachmentState } from "../src/sidepanel/composer-attachment-submit.js";

describe("composer attachment submission", () => {
  test("keeps submitted files in the request snapshot and visible message snapshot but clears composer attachments", () => {
    const image = {
      id: "image-1",
      name: "mockup.png",
      mimeType: "image/png",
      sizeBytes: 128,
      lastModified: 1,
      base64: "ZmFrZQ==",
      kind: "image" as const,
    };
    const generated = {
      id: "generated-1",
      name: "previous.png",
      mimeType: "image/png",
      sizeBytes: 256,
      lastModified: 2,
      base64: "ZmFrZQ==",
      kind: "image" as const,
    };

    expect(createSubmittedComposerFileAttachmentState([image], [generated])).toEqual({
      requestFileAttachments: [image, generated],
      messageFileAttachments: [image],
      composerFileAttachments: [],
    });
  });

  test("does not render generated request-only attachments as newly submitted user previews", () => {
    const generated = {
      id: "generated-followup-1",
      name: "previous.png",
      mimeType: "image/png",
      sizeBytes: 256,
      lastModified: 2,
      base64: "ZmFrZQ==",
      kind: "image" as const,
    };

    expect(createSubmittedComposerFileAttachmentState([], [generated])).toEqual({
      requestFileAttachments: [generated],
      messageFileAttachments: [],
      composerFileAttachments: [],
    });
  });
});
