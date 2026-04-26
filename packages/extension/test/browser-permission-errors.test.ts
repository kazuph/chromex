import { describe, expect, test } from "vitest";

import {
  BrowserPermissionRequiredError,
  isBrowserPermissionRequiredError,
} from "../src/browser-permission-errors.js";

describe("browser permission errors", () => {
  test("keeps optional permission requests structured for the side panel", () => {
    const error = new BrowserPermissionRequiredError(
      { permissions: ["tabs"] },
      "Allow Codex to list your open tabs only when you ask for cross-tab context.",
    );

    expect(isBrowserPermissionRequiredError(error)).toBe(true);
    expect(error.permission).toEqual({ permissions: ["tabs"] });
    expect(error.rationale).toBe("Allow Codex to list your open tabs only when you ask for cross-tab context.");
  });

  test("does not classify plain errors as permission requests", () => {
    expect(isBrowserPermissionRequiredError(new Error("network failed"))).toBe(false);
  });
});
