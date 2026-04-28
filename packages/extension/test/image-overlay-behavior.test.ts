import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const backgroundSource = readFileSync(resolve(process.cwd(), "src/background/index.ts"), "utf8");
const sidepanelSource = readFileSync(resolve(process.cwd(), "src/sidepanel/index.ts"), "utf8");

describe("generated image page overlays", () => {
  test("does not automatically apply generated or edited images over the active Chrome page", () => {
    expect(backgroundSource).not.toContain(
      'sendMessageToActiveTab({ type: "page.apply-image-overlay", previewRef: result.previewRef });',
    );
    expect(sidepanelSource).not.toContain(
      ['type: "page.apply-image-overlay",', "        previewRef: result.previewRef,"].join("\n"),
    );
  });
});
