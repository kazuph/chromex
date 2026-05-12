import mermaid from "mermaid";

let mermaidRenderSequence = 0;
let configuredTheme = "";

function getMermaidTheme(): "default" | "dark" {
  return document.documentElement.dataset.theme === "light" ? "default" : "dark";
}

function ensureMermaidInitialized(): void {
  const theme = getMermaidTheme();
  if (configuredTheme === theme) {
    return;
  }
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "strict",
    theme,
    fontFamily: "inherit",
  });
  configuredTheme = theme;
}

async function renderMermaidDiagram(container: HTMLElement): Promise<void> {
  const source = container.dataset.mermaidDefinition?.trim() ?? "";
  if (!source || container.dataset.mermaidState === "rendered" || container.dataset.mermaidState === "rendering") {
    return;
  }

  container.dataset.mermaidState = "rendering";
  try {
    const { svg, bindFunctions } = await mermaid.render(`chromex-mermaid-${++mermaidRenderSequence}`, source);
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
  ensureMermaidInitialized();
  await Promise.all(diagrams.map((diagram) => renderMermaidDiagram(diagram)));
}
