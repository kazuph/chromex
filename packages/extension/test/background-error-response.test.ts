import { describe, expect, test } from "vitest";

import { BrowserPermissionRequiredError } from "../src/browser-permission-errors.js";
import { SitePermissionRequiredError } from "../src/page-access.js";
import {
  shouldLogBackgroundMessageError,
  toExpectedPermissionErrorResponse,
} from "../src/background/background-error-response.js";

describe("background error responses", () => {
  test("converts expected site permission errors without treating them as failures", () => {
    const error = new SitePermissionRequiredError("https://example.com/post");

    expect(toExpectedPermissionErrorResponse(error)).toEqual({
      error: error.message,
      requiresPermission: true,
      permission: { origins: ["https://example.com/*"] },
      rationale: error.rationale,
    });
    expect(shouldLogBackgroundMessageError(error)).toBe(false);
  });

  test("converts expected browser permission errors without treating them as failures", () => {
    const error = new BrowserPermissionRequiredError(
      { permissions: ["history"] },
      "Allow Codex to search your browser history only when you ask for it.",
    );

    expect(toExpectedPermissionErrorResponse(error)).toEqual({
      error: error.message,
      requiresPermission: true,
      permission: { permissions: ["history"] },
      rationale: error.rationale,
    });
    expect(shouldLogBackgroundMessageError(error)).toBe(false);
  });

  test("recognizes serialized permission errors from runtime boundaries", () => {
    expect(
      shouldLogBackgroundMessageError({
        name: "SitePermissionRequiredError",
        message: "Codex needs access to this site before it can read this tab.",
        permission: { origins: ["https://example.com/*"] },
        rationale: "Codex needs access to this site before it can read this tab.",
      }),
    ).toBe(false);
    expect(
      shouldLogBackgroundMessageError({
        name: "BrowserPermissionRequiredError",
        message: "Allow Codex to search your browser history only when you ask for it.",
        permission: { permissions: ["history"] },
        rationale: "Allow Codex to search your browser history only when you ask for it.",
      }),
    ).toBe(false);
  });

  test("keeps expected stale thread and image asset failures out of noisy background logs", () => {
    expect(shouldLogBackgroundMessageError(new Error("thread not found: 019dc610-b810-73a1-ae21-7c9efa2d88ca"))).toBe(
      false,
    );
    expect(shouldLogBackgroundMessageError(new Error("Generated image asset is no longer available."))).toBe(false);
  });

  test("keeps automatic tab-frame detachments out of noisy background logs", () => {
    expect(shouldLogBackgroundMessageError(new Error("Frame with ID 0 was removed."))).toBe(false);
  });

  test("keeps Chrome extensions gallery script restrictions out of noisy background logs", () => {
    expect(shouldLogBackgroundMessageError(new Error("The extensions gallery cannot be scripted."))).toBe(false);
  });

  test("keeps unexpected errors visible in diagnostics", () => {
    expect(toExpectedPermissionErrorResponse(new Error("boom"))).toBeNull();
    expect(shouldLogBackgroundMessageError(new Error("boom"))).toBe(true);
  });
});
