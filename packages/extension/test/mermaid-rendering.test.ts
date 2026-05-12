import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const sidepanelSource = readFileSync(resolve(process.cwd(), "src/sidepanel/index.ts"), "utf8");
const messageContentSource = readFileSync(resolve(process.cwd(), "src/sidepanel/message-content.ts"), "utf8");
const mermaidRenderingSource = readFileSync(resolve(process.cwd(), "src/sidepanel/mermaid-rendering.ts"), "utf8");
const sidepanelCss = readFileSync(resolve(process.cwd(), "public/sidepanel.css"), "utf8");

describe("mermaid rendering integration", () => {
  test("renders mermaid code fences through the chat markdown renderer", () => {
    expect(messageContentSource).toContain('normalizedLanguage === "mermaid"');
    expect(messageContentSource).toContain('data-mermaid-definition="${escapeAttribute(code)}"');
    expect(messageContentSource).toContain('class="message-code-block message-mermaid-block"');
  });

  test("hydrates mermaid diagrams after message html is inserted", () => {
    expect(sidepanelSource).toContain('import { renderMermaidDiagramsIn } from "./mermaid-rendering.js";');
    expect(sidepanelSource).toContain("void renderMermaidDiagramsIn(root)");
    expect(sidepanelSource).toContain("void renderMermaidDiagramsIn(content)");
    expect(mermaidRenderingSource).toContain('import mermaid from "mermaid";');
    expect(mermaidRenderingSource).toContain('securityLevel: "strict"');
    expect(mermaidRenderingSource).toContain('container.dataset.mermaidState = "rendered"');
  });

  test("ships styles for rendered mermaid previews and fallback source blocks", () => {
    expect(sidepanelCss).toContain(".message-mermaid-diagram");
    expect(sidepanelCss).toContain(".message-mermaid-svg svg");
    expect(sidepanelCss).toContain('.message-mermaid-diagram[data-mermaid-state="rendered"] .message-mermaid-fallback');
  });
});
