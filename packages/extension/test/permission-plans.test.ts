import { describe, expect, test } from "vitest";

import {
  getPermissionRequestForMessage,
  getPermissionRequestForRuntimeResponse,
  isRestrictedBrowserUrl,
  toOriginPermissionPattern,
} from "../src/permission-plans.js";

describe("permission plans", () => {
  test("maps a regular tab URL to an origin permission pattern", () => {
    expect(toOriginPermissionPattern("https://example.org/path?q=1")).toBe("https://example.org/*");
    expect(toOriginPermissionPattern("http://localhost:3000/app")).toBe("http://localhost:3000/*");
  });

  test("treats browser-internal pages as restricted", () => {
    expect(isRestrictedBrowserUrl("chrome://extensions")).toBe(true);
    expect(toOriginPermissionPattern("chrome://extensions")).toBeNull();
  });

  test("treats the Chrome extensions gallery as restricted even though it uses https", () => {
    expect(isRestrictedBrowserUrl("https://chromewebstore.google.com/detail/example/abc")).toBe(true);
    expect(toOriginPermissionPattern("https://chromewebstore.google.com/detail/example/abc")).toBeNull();
    expect(isRestrictedBrowserUrl("https://chrome.google.com/webstore/detail/example/abc")).toBe(true);
    expect(toOriginPermissionPattern("https://chrome.google.com/webstore/detail/example/abc")).toBeNull();
    expect(isRestrictedBrowserUrl("https://chrome.google.com/search?q=codex")).toBe(false);
  });

  test("requests history permission only for history search", () => {
    expect(getPermissionRequestForMessage({ type: "context.history.search" })).toEqual({
      permissions: ["history"],
      rationale: "Allow Codex to search your browser history only when you ask for it.",
    });
  });

  test("requests tabs permission only when the user asks for cross-tab context", () => {
    expect(getPermissionRequestForMessage({ type: "context.tabs.list" })).toEqual({
      permissions: ["tabs"],
      rationale: "Allow Codex to list your open tabs only when you ask for cross-tab context.",
    });
  });

  test("does not pre-request site access before prompt sends", () => {
    expect(
      getPermissionRequestForMessage(
        {
          type: "prompt.send",
          payload: {
            attachments: ["current-page"],
            readStrategyOverride: "dom",
          },
        },
        "https://example.org/docs",
      ),
    ).toBeNull();
  });

  test("does not pre-request site access before multimodal prompt sends", () => {
    expect(
      getPermissionRequestForMessage(
        {
          type: "prompt.send",
          payload: {
            attachments: ["current-page", "image"],
            readStrategyOverride: "hybrid",
          },
        },
        "https://example.org/docs",
      ),
    ).toBeNull();
  });

  test("does not pre-request tabs or site access before agentic prompt routing", () => {
    expect(
      getPermissionRequestForMessage(
        {
          type: "prompt.send",
          payload: {
            attachments: ["current-page", "open-tabs"],
            readStrategyOverride: "dom",
          },
        },
        "https://example.org/docs",
      ),
    ).toBeNull();
  });

  test("does not keyword-infer tabs permission before the agentic router runs", () => {
    expect(
      getPermissionRequestForMessage(
        {
          type: "prompt.send",
          payload: {
            message: "열린 탭들을 비교해줘.",
            attachments: [],
            readStrategyOverride: "auto",
          },
        },
        "https://example.org/docs",
      ),
    ).toBeNull();
  });

  test("does not pre-request site access for page actions on normal pages", () => {
    expect(
      getPermissionRequestForMessage(
        {
          type: "page.navigate",
        },
        "https://example.org/docs",
      ),
    ).toBeNull();
  });

  test("treats current-page infographic generation as a current-page read action", () => {
    expect(
      getPermissionRequestForMessage(
        {
          type: "image.infographic.start",
        },
        "https://mail.google.com/mail/u/0/#inbox",
      ),
    ).toBeNull();

    expect(
      getPermissionRequestForMessage(
        {
          type: "image.infographic.start",
        },
        "chrome://extensions",
      ),
    ).toEqual({
      rationale: "Allow Codex to read the current page before creating an infographic.",
      blockedReason: "This page is a restricted browser page, so Codex cannot read or modify it.",
    });
  });

  test("treats YouTube seek as a current-page action", () => {
    expect(
      getPermissionRequestForMessage(
        {
          type: "youtube.seek",
        },
        "https://www.youtube.com/watch?v=abc123",
      ),
    ).toBeNull();

    expect(
      getPermissionRequestForMessage(
        {
          type: "youtube.seek",
        },
        "chrome://extensions",
      ),
    ).toEqual({
      rationale: "Allow Codex to interact with the current page that you are already viewing.",
      blockedReason: "This page is a restricted browser page, so Codex cannot read or modify it.",
    });
  });

  test("reports restricted pages instead of asking for impossible permissions", () => {
    expect(
      getPermissionRequestForMessage(
        {
          type: "page.navigate",
        },
        "chrome://extensions",
      ),
    ).toEqual({
      rationale: "Allow Codex to interact with the current page that you are already viewing.",
      blockedReason: "This page is a restricted browser page, so Codex cannot read or modify it.",
    });
  });

  test("does not block plain prompting when the current tab is restricted", () => {
    expect(
      getPermissionRequestForMessage(
        {
          type: "prompt.send",
          payload: {
            attachments: ["current-page"],
            readStrategyOverride: "dom",
          },
        },
        "chrome://extensions",
      ),
    ).toBeNull();
  });

  test("maps structured runtime permission responses to UI permission prompts", () => {
    expect(
      getPermissionRequestForRuntimeResponse({
        error: "Codex needs access to this site before it can read this tab.",
        requiresPermission: true,
        permission: {
          origins: ["https://example.org/*"],
        },
        rationale: "Allow Codex to read this site.",
      }),
    ).toEqual({
      origins: ["https://example.org/*"],
      rationale: "Allow Codex to read this site.",
    });
  });
});
