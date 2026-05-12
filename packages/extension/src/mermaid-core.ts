import mermaid from "mermaid";

export type MermaidRenderTheme = "default" | "dark";

let mermaidRenderSequence = 0;
let configuredTheme = "";

export function getMermaidThemeFromDocument(doc: Document = document): MermaidRenderTheme {
  return doc.documentElement.dataset.theme === "light" ? "default" : "dark";
}

function ensureMermaidInitialized(theme: MermaidRenderTheme): void {
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

export async function renderMermaidToSvg(
  definition: string,
  options: { theme?: MermaidRenderTheme } = {},
): Promise<{ svg: string; bindFunctions?: (element: Element) => void }> {
  const theme = options.theme ?? getMermaidThemeFromDocument();
  ensureMermaidInitialized(theme);
  return mermaid.render(`chromex-mermaid-${++mermaidRenderSequence}`, definition);
}
