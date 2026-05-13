import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const sidepanelSource = readFileSync(resolve(process.cwd(), "src/sidepanel/index.ts"), "utf8");
const backgroundSource = readFileSync(resolve(process.cwd(), "src/background/index.ts"), "utf8");

function getFunctionSource(source: string, name: string): string {
  const startMatch = new RegExp(`(?:async\\s+)?function\\s+${name}\\b`, "u").exec(source);
  const start = startMatch?.index ?? -1;
  if (start < 0) {
    return "";
  }
  const rest = source.slice(start + 1);
  const nextMatch = /\n(?:async\s+)?function\s+/u.exec(rest);
  return nextMatch ? source.slice(start, start + 1 + nextMatch.index) : source.slice(start);
}

describe("runtime backend toggle", () => {
  test("renders a backend section in the composer model menu", () => {
    const renderComposerModelDropdownSource = getFunctionSource(sidepanelSource, "renderComposerModelDropdown");
    const getRuntimeBackendMenuLabelSource = getFunctionSource(sidepanelSource, "getRuntimeBackendMenuLabel");

    expect(renderComposerModelDropdownSource).toContain("getRuntimeBackendMenuTitle");
    expect(renderComposerModelDropdownSource).toContain("data-composer-runtime-backend");
    expect(getRuntimeBackendMenuLabelSource).toContain("GitHub Copilot CLI");
    expect(getRuntimeBackendMenuLabelSource).toContain("Codex app-server");
  });

  test("switches backends through the background runtime handler", () => {
    const handleRuntimeBackendSelectSource = getFunctionSource(backgroundSource, "handleRuntimeBackendSelect");

    expect(backgroundSource).toContain('case "runtime.backend.select"');
    expect(handleRuntimeBackendSelectSource).toContain('bridge.request<RuntimeConfigSnapshot>("runtime.config.update"');
    expect(handleRuntimeBackendSelectSource).toContain("setPreferredCodexCommand");
    expect(handleRuntimeBackendSelectSource).toContain("setPreferredRuntimeBackend");
    expect(handleRuntimeBackendSelectSource).toContain("getPreferredCodexCommand");
    expect(handleRuntimeBackendSelectSource).toContain("clearPersistedConversationThreadId");
    expect(handleRuntimeBackendSelectSource).toContain("triggerCatalogRefresh");
    expect(handleRuntimeBackendSelectSource).toContain("getPreferredModelForRuntimeBackend");
  });
});
