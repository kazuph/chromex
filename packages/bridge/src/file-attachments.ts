import { extname } from "node:path";

import type { UserFileAttachment } from "@codex-sidepanel/shared";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import readXlsxFile, { readSheetNames, type Row } from "read-excel-file/node";

export interface PreparedUserFileAttachments {
  sections: string[];
  uploadedImages: Array<{
    name: string;
    ref: string;
  }>;
}

const MAX_FILE_ATTACHMENTS = 6;
const MAX_FILE_ATTACHMENT_BYTES = 6 * 1024 * 1024;
const MAX_EXTRACTED_TEXT_CHARS = 12_000;
const MAX_SPREADSHEET_ROWS = 24;
const MAX_SPREADSHEET_COLUMNS = 8;

export async function prepareUserFileAttachments(
  attachments: UserFileAttachment[],
): Promise<PreparedUserFileAttachments> {
  if (attachments.length === 0) {
    return {
      sections: [],
      uploadedImages: [],
    };
  }

  if (attachments.length > MAX_FILE_ATTACHMENTS) {
    throw new Error(`Too many attached files. Limit: ${MAX_FILE_ATTACHMENTS}.`);
  }

  const sections: string[] = [];
  const uploadedImages: Array<{ name: string; ref: string }> = [];

  for (const [index, attachment] of attachments.entries()) {
    if (attachment.kind === "image" && isRemoteImageAttachment(attachment)) {
      uploadedImages.push({
        name: attachment.name,
        ref: attachment.sourceUrl,
      });
      sections.push(
        formatAttachmentSection(index, attachment, {
          handling:
            "Attached as a remote visual input. Prefer this web image when the user refers to an attached image or uploaded reference.",
          extractedText: "",
        }),
      );
      continue;
    }

    const buffer = decodeAttachmentBuffer(attachment);

    if (attachment.kind === "image") {
      uploadedImages.push({
        name: attachment.name,
        ref: createDataUrl(attachment.mimeType, attachment.base64),
      });
      sections.push(
        formatAttachmentSection(index, attachment, {
          handling:
            "Attached separately as an uploaded visual input. Prefer this file when the user refers to an attached image or uploaded reference.",
          extractedText: "",
        }),
      );
      continue;
    }

    if (attachment.kind === "text") {
      sections.push(
        formatAttachmentSection(index, attachment, {
          handling: "Parsed as plain text. Prefer this extracted content over general assumptions.",
          extractedText: truncateText(decodeTextBuffer(buffer)),
        }),
      );
      continue;
    }

    if (attachment.kind === "pdf") {
      sections.push(
        formatAttachmentSection(index, attachment, {
          handling: "Parsed from PDF text extraction. Preserve citations and note if structure appears incomplete.",
          extractedText: truncateText(await extractPdfText(buffer)),
        }),
      );
      continue;
    }

    if (attachment.kind === "docx") {
      sections.push(
        formatAttachmentSection(index, attachment, {
          handling: "Parsed from DOCX text extraction. Preserve headings and list structure when possible.",
          extractedText: truncateText(await extractDocxText(buffer)),
        }),
      );
      continue;
    }

    if (attachment.kind === "spreadsheet") {
      sections.push(
        formatAttachmentSection(index, attachment, {
          handling:
            "Parsed into a compact spreadsheet summary. Use visible rows and columns as evidence and call out when data may be truncated.",
          extractedText: truncateText(await extractSpreadsheetText(attachment, buffer)),
        }),
      );
      continue;
    }

    sections.push(
      formatAttachmentSection(index, attachment, {
        handling:
          "This binary file was not parsed automatically. Use its name and MIME type only, and ask for a convertible format if the contents are required.",
        extractedText: "",
      }),
    );
  }

  return {
    sections,
    uploadedImages,
  };
}

function isRemoteImageAttachment(attachment: UserFileAttachment): attachment is UserFileAttachment & { sourceUrl: string } {
  const sourceUrl = attachment.sourceUrl?.trim();
  if (!sourceUrl) {
    return false;
  }
  return /^https?:\/\//iu.test(sourceUrl);
}

function decodeAttachmentBuffer(attachment: UserFileAttachment): Buffer {
  const buffer = Buffer.from(attachment.base64, "base64");
  if (buffer.byteLength > MAX_FILE_ATTACHMENT_BYTES || attachment.sizeBytes > MAX_FILE_ATTACHMENT_BYTES) {
    throw new Error(`Attached file is too large: ${attachment.name}`);
  }
  return buffer;
}

function formatAttachmentSection(
  index: number,
  attachment: UserFileAttachment,
  details: { handling: string; extractedText: string },
): string {
  const lines = [
    `ATTACHED FILE ${index + 1}`,
    `Name: ${attachment.name}`,
    `Kind: ${attachment.kind}`,
    `Mime Type: ${attachment.mimeType || "(unknown)"}`,
    `Size Bytes: ${attachment.sizeBytes}`,
    `Handling: ${details.handling}`,
  ];

  if (details.extractedText.trim()) {
    lines.push("Extracted Content:", details.extractedText.trim());
  }

  return lines.join("\n");
}

function createDataUrl(mimeType: string, base64: string): string {
  const safeMimeType = mimeType.trim() || "application/octet-stream";
  return `data:${safeMimeType};base64,${base64}`;
}

function decodeTextBuffer(buffer: Buffer): string {
  return normalizeExtractedText(new TextDecoder("utf-8", { fatal: false }).decode(buffer));
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    return normalizeExtractedText(result.text ?? "");
  } finally {
    await parser.destroy();
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return normalizeExtractedText(result.value ?? "");
}

async function extractSpreadsheetText(attachment: UserFileAttachment, buffer: Buffer): Promise<string> {
  const extension = extname(attachment.name).toLowerCase();
  if (extension === ".csv" || extension === ".tsv") {
    return summarizeDelimitedText(decodeTextBuffer(buffer), extension === ".tsv" ? "\t" : ",");
  }

  if (extension === ".xlsx" || extension === ".xlsm") {
    const sheetNames = (await readSheetNames(buffer)).slice(0, 3);
    const sheetSummaries = await Promise.all(
      sheetNames.map(async (sheetName) => summarizeWorksheet(sheetName, await readXlsxFile(buffer, { sheet: sheetName }))),
    );
    return normalizeExtractedText(sheetSummaries.join("\n\n"));
  }

  return normalizeExtractedText(
    "Structured parsing is limited for this spreadsheet format. Convert it to .xlsx, .csv, or .tsv for higher-fidelity analysis.",
  );
}

function summarizeDelimitedText(text: string, delimiter: string): string {
  const rows = text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, MAX_SPREADSHEET_ROWS)
    .map((line) => line.split(delimiter).slice(0, MAX_SPREADSHEET_COLUMNS));

  if (rows.length === 0) {
    return "(empty spreadsheet)";
  }

  return rows.map((row) => row.join(" | ")).join("\n");
}

function summarizeWorksheet(sheetName: string, rowsInput: Row[]): string {
  const rows: string[] = [];

  for (const [rowIndex, row] of rowsInput.slice(0, MAX_SPREADSHEET_ROWS).entries()) {
    const cells = row
      .slice(0, MAX_SPREADSHEET_COLUMNS)
      .map((cell) => stringifySpreadsheetCell(cell))
      .filter((value) => value.length > 0);

    if (cells.length > 0) {
      rows.push(`${rowIndex + 1}. ${cells.join(" | ")}`);
    }
  }

  if (rows.length === 0) {
    return `${sheetName}\n(empty sheet)`;
  }

  return `${sheetName}\n${rows.join("\n")}`;
}

function stringifySpreadsheetCell(cell: Row[number] | undefined): string {
  if (cell === null || cell === undefined) {
    return "";
  }

  if (typeof cell === "string" || typeof cell === "number" || typeof cell === "boolean") {
    return String(cell);
  }

  if (cell instanceof Date) {
    return cell.toISOString();
  }

  return JSON.stringify(cell);
}

function truncateText(text: string): string {
  if (text.length <= MAX_EXTRACTED_TEXT_CHARS) {
    return text;
  }

  return `${text.slice(0, MAX_EXTRACTED_TEXT_CHARS)}\n...[truncated]`;
}

function normalizeExtractedText(text: string): string {
  return text.replace(/\u0000/gu, "").replace(/\r\n/gu, "\n").replace(/\n{3,}/gu, "\n\n").trim();
}
