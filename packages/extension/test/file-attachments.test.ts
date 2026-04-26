import { describe, expect, test } from "vitest";

import {
  createRemoteImageAttachment,
  createFileChipLabel,
  extractWebImageUrlsFromDropData,
  planAttachmentSelection,
  MAX_FILE_ATTACHMENTS,
  MAX_FILE_ATTACHMENT_BYTES,
  MAX_TOTAL_FILE_ATTACHMENT_BYTES,
} from "../src/sidepanel/file-attachments.js";

describe("file attachment policy", () => {
  test("accepts supported files until limits are reached", () => {
    const plan = planAttachmentSelection([], [
      {
        name: "mockup.png",
        mimeType: "image/png",
        sizeBytes: 512_000,
        lastModified: 1,
      },
      {
        name: "brief.pdf",
        mimeType: "application/pdf",
        sizeBytes: 720_000,
        lastModified: 2,
      },
    ]);

    expect(plan.rejected).toEqual([]);
    expect(plan.accepted.map((attachment) => attachment.kind)).toEqual(["image", "pdf"]);
  });

  test("rejects duplicates and oversized files", () => {
    const existing = [
      {
        id: "file-1",
        name: "brief.pdf",
        mimeType: "application/pdf",
        sizeBytes: 100,
        lastModified: 1,
        base64: "ZmFrZQ==",
        kind: "pdf" as const,
      },
    ];
    const plan = planAttachmentSelection(existing, [
      {
        name: "brief.pdf",
        mimeType: "application/pdf",
        sizeBytes: 100,
        lastModified: 1,
      },
      {
        name: "huge.png",
        mimeType: "image/png",
        sizeBytes: MAX_FILE_ATTACHMENT_BYTES + 1,
        lastModified: 2,
      },
    ]);

    expect(plan.accepted).toEqual([]);
    expect(plan.rejected).toEqual(["duplicate:brief.pdf", "file-too-large:huge.png"]);
  });

  test("enforces total upload limits", () => {
    const existing = Array.from({ length: MAX_FILE_ATTACHMENTS - 1 }, (_, index) => ({
      id: `file-${index}`,
      name: `existing-${index}.txt`,
      mimeType: "text/plain",
      sizeBytes: Math.floor(MAX_TOTAL_FILE_ATTACHMENT_BYTES / MAX_FILE_ATTACHMENTS),
      lastModified: index,
      base64: "ZmFrZQ==",
      kind: "text" as const,
    }));

    const plan = planAttachmentSelection(existing, [
      {
        name: "overflow.txt",
        mimeType: "text/plain",
        sizeBytes: Math.floor(MAX_FILE_ATTACHMENT_BYTES / 2),
        lastModified: 99,
      },
    ]);

    expect(plan.accepted).toEqual([]);
    expect(plan.rejected).toEqual(["total-too-large:overflow.txt"]);
  });

  test("formats compact chip labels", () => {
    expect(createFileChipLabel({ name: "design.png", kind: "image" })).toBe("image: design.png");
    expect(createFileChipLabel({ name: "sheet.xlsx", kind: "spreadsheet" })).toBe("sheet: sheet.xlsx");
  });

  test("extracts web image urls from dropped html, uri-list, and plain text", () => {
    const dropData = {
      getData(type: string) {
        if (type === "text/html") {
          return '<img src="https://cdn.example.com/photo.webp"><a href="https://example.com/page">page</a>';
        }
        if (type === "text/uri-list") {
          return "# comment\nhttps://cdn.example.com/photo.webp\nhttps://cdn.example.com/diagram.png";
        }
        if (type === "text/plain") {
          return "https://cdn.example.com/diagram.png";
        }
        return "";
      },
    };

    expect(extractWebImageUrlsFromDropData(dropData)).toEqual([
      "https://cdn.example.com/photo.webp",
      "https://cdn.example.com/diagram.png",
    ]);
  });

  test("creates a remote web image attachment without downloading private bytes into extension storage", () => {
    const attachment = createRemoteImageAttachment("https://cdn.example.com/mockup.png?token=redacted", 2);

    expect(attachment).toMatchObject({
      id: expect.stringMatching(/^web-image-/u),
      name: "mockup.png",
      mimeType: "image/png",
      sizeBytes: 0,
      base64: "",
      kind: "image",
      sourceUrl: "https://cdn.example.com/mockup.png?token=redacted",
    });
  });
});
