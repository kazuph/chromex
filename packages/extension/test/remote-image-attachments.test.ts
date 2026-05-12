import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test, vi } from "vitest";

import { materializeRemoteImageAttachments } from "../src/background/remote-image-attachments.js";

describe("materializeRemoteImageAttachments", () => {
  test("materializes remote prompt image attachments while keeping local files unchanged", async () => {
    const resolveVisibleCandidate = vi.fn(async () => ({
      url: "https://uploads.linear.app/private.png",
      viewportRect: { left: 0, top: 0, width: 120, height: 80 },
      viewportWidth: 1280,
      viewportHeight: 720,
    }));
    const materializeAttachment = vi.fn(async (attachment) => ({
      ...attachment,
      base64: "ZmFrZQ==",
      mimeType: "image/png",
      sizeBytes: 4,
      lastModified: 42,
    }));

    const result = await materializeRemoteImageAttachments([
      {
        id: "remote-1",
        name: "private.png",
        mimeType: "image/*",
        sizeBytes: 0,
        lastModified: 0,
        base64: "",
        kind: "image",
        sourceUrl: "https://uploads.linear.app/private.png",
      },
      {
        id: "local-1",
        name: "local.png",
        mimeType: "image/png",
        sizeBytes: 8,
        lastModified: 1,
        base64: "ZmFrZQ==",
        kind: "image",
      },
    ], {
      resolveVisibleCandidate,
      materializeAttachment,
    });

    expect(resolveVisibleCandidate).toHaveBeenCalledWith("https://uploads.linear.app/private.png");
    expect(materializeAttachment).toHaveBeenCalledTimes(1);
    expect(result[0]).toMatchObject({
      id: "remote-1",
      sourceUrl: "https://uploads.linear.app/private.png",
      base64: "ZmFrZQ==",
    });
    expect(result[1]).toMatchObject({
      id: "local-1",
      base64: "ZmFrZQ==",
    });
  });

  test("keeps the original attachment when materialization fails", async () => {
    const onMaterializationError = vi.fn();
    const attachment = {
      id: "remote-1",
      name: "private.png",
      mimeType: "image/*",
      sizeBytes: 0,
      lastModified: 0,
      base64: "",
      kind: "image" as const,
      sourceUrl: "https://uploads.linear.app/private.png",
    };

    const result = await materializeRemoteImageAttachments([attachment], {
      resolveVisibleCandidate: async () => null,
      materializeAttachment: async () => {
        throw new Error("401");
      },
      onMaterializationError,
    });

    expect(result).toEqual([attachment]);
    expect(onMaterializationError).toHaveBeenCalledWith("https://uploads.linear.app/private.png", expect.any(Error));
  });

  test("wires prompt building through the remote image materializer", () => {
    const backgroundSource = readFileSync(resolve(process.cwd(), "src/background/index.ts"), "utf8");

    expect(backgroundSource).toContain("materializePromptRemoteImageAttachments(activeTab, automaticFileAttachments)");
    expect(backgroundSource).toContain("createEditableImageInputFromPromptSource");
    expect(backgroundSource).toContain("findPromptImageCandidateForSourceUrl");
  });
});
