import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const sidepanelSource = readFileSync(resolve(process.cwd(), "src/sidepanel/index.ts"), "utf8");
const backgroundSource = readFileSync(resolve(process.cwd(), "src/background/index.ts"), "utf8");
const css = readFileSync(resolve(process.cwd(), "public/sidepanel.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

function readFinalDeclaration(selector: string, property: string): string {
  const blockPattern = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  let value = "";

  while ((match = blockPattern.exec(css))) {
    const selectorList = (match[1] ?? "")
      .split(",")
      .map((item) => item.trim());
    if (!selectorList.includes(selector)) {
      continue;
    }

    const declarations = match[2] ?? "";
    for (const declaration of declarations.split(";")) {
      const [name, ...rawValue] = declaration.split(":");
      if (name?.trim() === property) {
        value = rawValue.join(":").trim();
      }
    }
  }

  return value;
}

describe("Codex skill toggles", () => {
  test("renders Codex app-server skills as persistent on/off toggles", () => {
    expect(sidepanelSource).toContain("renderContextView");
    expect(sidepanelSource).toContain("renderCodexSkillToggle");
    expect(sidepanelSource).toContain("data-codex-skill-toggle=");
    expect(sidepanelSource).toContain("toggleCodexSkillEnabled");
    expect(sidepanelSource).not.toContain("data-app-server-skill-id=");
    expect(sidepanelSource).not.toContain("renderCodexSkillSettings");
    expect(css).not.toContain(".settings-codex-skill-list");
  });

  test("sends only enabled Codex skills to the prompt runtime", () => {
    expect(sidepanelSource).toContain("getPromptStructuredInputs()");
    expect(sidepanelSource).toContain("mergeStructuredInputsWithEnabledCodexSkills");
    expect(backgroundSource).toContain("mergeStructuredInputsWithEnabledCodexSkills");
  });

  test("uses compact settings-style rows for Codex skill switches", () => {
    expect(readFinalDeclaration(".codex-skill-list", "display")).toBe("grid");
    expect(readFinalDeclaration(".codex-skill-toggle", "display")).toBe("flex");
    expect(readFinalDeclaration(".codex-skill-toggle.enabled", "border-color")).toBe("rgba(169, 199, 255, 0.24)");
  });

  test("blocks install-required automation skills unless the local runtime is enabled", () => {
    expect(sidepanelSource).toContain("getCodexSkillRuntimeRequirement");
    expect(sidepanelSource).toContain("isCodexSkillRuntimeBlocked");
    expect(sidepanelSource).toContain("isRuntimeGatedStructuredInput");
    expect(sidepanelSource).not.toContain("isPlaywrightSkillOption");
    expect(sidepanelSource).not.toContain("isPlaywrightStructuredInput");
  });
});
