import { getMermaidThemeFromDocument, renderMermaidToSvg } from "../mermaid-core.js";

async function renderMermaidDiagram(container: HTMLElement): Promise<void> {
  const source = container.dataset.mermaidDefinition?.trim() ?? "";
  if (!source || container.dataset.mermaidState === "rendered" || container.dataset.mermaidState === "rendering") {
    return;
  }

  container.dataset.mermaidState = "rendering";
  try {
    const { svg, bindFunctions } = await renderMermaidToSvg(source, {
      theme: getMermaidThemeFromDocument(container.ownerDocument ?? document),
    });
    const preview = document.createElement("div");
    preview.className = "message-mermaid-svg";
    preview.innerHTML = svg;
    preview.querySelector("svg")?.removeAttribute("height");
    container.querySelector(".message-mermaid-svg")?.remove();
    container.prepend(preview);
    bindFunctions?.(preview);
    container.dataset.mermaidState = "rendered";
  } catch {
    container.dataset.mermaidState = "error";
  }
}

export async function renderMermaidDiagramsIn(scope: ParentNode): Promise<void> {
  const diagrams = Array.from(scope.querySelectorAll<HTMLElement>("[data-mermaid-definition]"));
  if (!diagrams.length) {
    return;
  }
  await Promise.all(diagrams.map((diagram) => renderMermaidDiagram(diagram)));
}
