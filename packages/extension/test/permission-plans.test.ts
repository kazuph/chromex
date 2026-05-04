import { describe, expect, test } from "vitest";

import {
  getCurrentPageSupport,
  getFileUrlAccessHelpMessage,
  getPermissionRequestForMessage,
  getPermissionRequestForRuntimeResponse,
  isFileUrl,
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
    expect(getCurrentPageSupport("chrome://extensions")).toEqual({
      available: false,
      blockedReason:
        "Chrome blocks extensions from reading or modifying this protected browser page. Open a normal web page, then try again.",
    });
  });

  test("treats the Chrome extensions gallery as restricted even though it uses https", () => {
    expect(isRestrictedBrowserUrl("https://chromewebstore.google.com/detail/example/abc")).toBe(true);
    expect(toOriginPermissionPattern("https://chromewebstore.google.com/detail/example/abc")).toBeNull();
    expect(isRestrictedBrowserUrl("https://chrome.google.com/webstore/detail/example/abc")).toBe(true);
    expect(toOriginPermissionPattern("https://chrome.google.com/webstore/detail/example/abc")).toBeNull();
    expect(isRestrictedBrowserUrl("https://chrome.google.com/search?q=codex")).toBe(false);
    expect(getCurrentPageSupport("https://chromewebstore.google.com/detail/example/abc")).toEqual({
      available: false,
      blockedReason:
        "Chrome Web Store pages cannot be scripted by extensions. Open the target site in a normal tab, then try again.",
    });
  });

  test("allows local file pages to proceed so Chrome file access settings can be honored", () => {
    expect(isFileUrl("file:///Users/test/page.html")).toBe(true);
    expect(isRestrictedBrowserUrl("file:///Users/test/page.html")).toBe(false);
    expect(toOriginPermissionPattern("file:///Users/test/page.html")).toBeNull();
    expect(getCurrentPageSupport("file:///Users/test/page.html")).toEqual({
      available: true,
      blockedReason: "",
    });
    expect(getFileUrlAccessHelpMessage()).toContain("Allow access to file URLs");
  });

  test("separates unsupported schemes from browser-internal pages", () => {
    expect(getCurrentPageSupport("mailto:test@example.com")).toEqual({
      available: false,
      blockedReason:
        "This page uses an unsupported URL scheme for page reading. Open an http, https, or file page, then try again.",
    });
  });

  test("requests history permission only for history search", () => {
    expect(getPermissionRequestForMessage({ type: "context.history.search" })).toEqual({
      permissions: ["history"],
      rationale: "Allow Codex to search your browser history only when you ask for it.",
    });
  });

  test("does not request tabs permission because tab context is a core install permission", () => {
    expect(getPermissionRequestForMessage({ type: "context.tabs.list" })).toBeNull();
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
      blockedReason:
        "Chrome blocks extensions from reading or modifying this protected browser page. Open a normal web page, then try again.",
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
      blockedReason:
        "Chrome blocks extensions from reading or modifying this protected browser page. Open a normal web page, then try again.",
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
      blockedReason:
        "Chrome blocks extensions from reading or modifying this protected browser page. Open a normal web page, then try again.",
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
