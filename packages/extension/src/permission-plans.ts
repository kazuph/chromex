import type { PromptRequestPayload } from "./types.js";

export interface PermissionRequestPlan {
  permissions?: chrome.runtime.ManifestPermission[];
  origins?: string[];
  rationale: string;
  blockedReason?: string;
}

export interface CurrentPageSupport {
  available: boolean;
  blockedReason: string;
}

type RuntimeMessageLike = {
  type?: string;
  payload?: Partial<PromptRequestPayload>;
};

type RuntimePermissionResponseLike = {
  requiresPermission?: unknown;
  permission?: {
    permissions?: unknown;
    origins?: unknown;
  };
  rationale?: unknown;
};

const RESTRICTED_BROWSER_PROTOCOLS = new Set([
  "about:",
  "chrome:",
  "chrome-extension:",
  "chrome-search:",
  "devtools:",
  "edge:",
  "moz-extension:",
  "view-source:",
]);

const RESTRICTED_EXTENSION_GALLERY_HOSTS = new Set(["chrome.google.com", "chromewebstore.google.com"]);
const PROTECTED_BROWSER_PAGE_REASON =
  "Chrome blocks extensions from reading or modifying this protected browser page. Open a normal web page, then try again.";
const CHROME_WEB_STORE_REASON =
  "Chrome Web Store pages cannot be scripted by extensions. Open the target site in a normal tab, then try again.";
const UNSUPPORTED_SCHEME_REASON =
  "This page uses an unsupported URL scheme for page reading. Open an http, https, or file page, then try again.";
const NO_ACTIVE_PAGE_REASON = "No active browser page is available right now.";
const FILE_URL_ACCESS_HELP_MESSAGE =
  "Local file pages require Chrome's Allow access to file URLs setting for Chromex. Open chrome://extensions, choose Chromex Details, enable Allow access to file URLs, reload the file page, then try again.";

export function isRestrictedBrowserUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (RESTRICTED_BROWSER_PROTOCOLS.has(parsed.protocol)) {
      return true;
    }
    return isRestrictedExtensionGalleryUrl(parsed);
  } catch {
    return true;
  }
}

export function isFileUrl(url: string | undefined): boolean {
  if (!url) {
    return false;
  }
  try {
    return new URL(url).protocol === "file:";
  } catch {
    return false;
  }
}

export function getFileUrlAccessHelpMessage(): string {
  return FILE_URL_ACCESS_HELP_MESSAGE;
}

function isRestrictedExtensionGalleryUrl(parsed: URL): boolean {
  if (!/^https?:$/.test(parsed.protocol) || !RESTRICTED_EXTENSION_GALLERY_HOSTS.has(parsed.hostname)) {
    return false;
  }
  return parsed.hostname === "chromewebstore.google.com" || parsed.pathname.startsWith("/webstore");
}

export function toOriginPermissionPattern(url: string): string | null {
  if (isRestrictedBrowserUrl(url)) {
    return null;
  }

  const parsed = new URL(url);
  if (!/^https?:$/.test(parsed.protocol)) {
    return null;
  }

  const portSuffix = parsed.port ? `:${parsed.port}` : "";
  return `${parsed.protocol}//${parsed.hostname}${portSuffix}/*`;
}

export function getPermissionRequestForMessage(
  message: RuntimeMessageLike,
  activeTabUrl?: string,
): PermissionRequestPlan | null {
  switch (message.type) {
    case "context.tabs.list":
      return null;
    case "context.history.search":
      return {
        permissions: ["history"],
        rationale: "Allow Codex to search your browser history only when you ask for it.",
      };
    case "image.infographic.start":
      return buildCurrentPageGuardPlan(activeTabUrl, "Allow Codex to read the current page before creating an infographic.");
    case "image.slides.start":
      return buildCurrentPageGuardPlan(activeTabUrl, "Allow Codex to read the current page before creating slide images.");
    case "image.edit.start":
      return null;
    case "youtube.seek":
    case "page.apply-image-overlay":
    case "page.clear-image-overlay":
    case "page.dom.perform":
    case "page.dictation.insert":
    case "page.navigate":
      return buildCurrentPageGuardPlan(activeTabUrl, "Allow Codex to interact with the current page that you are already viewing.");
    case "prompt.send":
    case "turn.steer":
      return null;
    default:
      return null;
  }
}

export function getPermissionRequestForRuntimeResponse(
  response: RuntimePermissionResponseLike,
): PermissionRequestPlan | null {
  if (response.requiresPermission !== true || !response.permission) {
    return null;
  }

  const permissions = Array.isArray(response.permission.permissions)
    ? response.permission.permissions.filter((value): value is chrome.runtime.ManifestPermission => typeof value === "string")
    : [];
  const origins = Array.isArray(response.permission.origins)
    ? response.permission.origins.filter((value): value is string => typeof value === "string")
    : [];

  if (permissions.length === 0 && origins.length === 0) {
    return null;
  }

  return {
    ...(permissions.length ? { permissions } : {}),
    ...(origins.length ? { origins } : {}),
    rationale:
      typeof response.rationale === "string" && response.rationale.trim()
        ? response.rationale.trim()
        : "Allow Codex to access the requested browser context.",
  };
}

function buildCurrentPageGuardPlan(activeTabUrl: string | undefined, rationale: string): PermissionRequestPlan | null {
  const support = getCurrentPageSupport(activeTabUrl);
  if (!support.available) {
    return {
      rationale,
      blockedReason: support.blockedReason,
    };
  }

  return null;
}

export function getCurrentPageSupport(activeTabUrl: string | undefined): CurrentPageSupport {
  if (!activeTabUrl) {
    return {
      available: false,
      blockedReason: NO_ACTIVE_PAGE_REASON,
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(activeTabUrl);
  } catch {
    return {
      available: false,
      blockedReason: NO_ACTIVE_PAGE_REASON,
    };
  }

  if (isRestrictedExtensionGalleryUrl(parsed)) {
    return {
      available: false,
      blockedReason: CHROME_WEB_STORE_REASON,
    };
  }

  if (RESTRICTED_BROWSER_PROTOCOLS.has(parsed.protocol)) {
    return {
      available: false,
      blockedReason: PROTECTED_BROWSER_PAGE_REASON,
    };
  }

  if (/^https?:$/u.test(parsed.protocol) || parsed.protocol === "file:") {
    return {
      available: true,
      blockedReason: "",
    };
  }

  return {
    available: false,
    blockedReason: UNSUPPORTED_SCHEME_REASON,
  };
}
