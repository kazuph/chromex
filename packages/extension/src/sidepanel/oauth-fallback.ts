import type { CodexRateLimits } from "@codex-sidepanel/shared";
import type { UiInitPayload } from "../types.js";

const OAUTH_USAGE_EXHAUSTED_PATTERNS = [
  /usage\s+(limit|quota).*(reached|exceeded|exhausted|used)/iu,
  /(rate\s*limit|quota).*(reached|exceeded|exhausted)/iu,
  /(insufficient_quota|rate_limit_exceeded|billing_hard_limit)/iu,
  /(too many requests|429)/iu,
  /(limit|quota).*(reset|try again later)/iu,
  /(used|exhausted).*(allowance|quota|credits|usage)/iu,
];

export function shouldOfferApiKeyFallbackForError(input: {
  error: unknown;
  accountStatus: UiInitPayload["accountStatus"] | null;
  rateLimits: CodexRateLimits | null;
}): boolean {
  if (input.accountStatus?.authMode !== "chatgpt") {
    return false;
  }
  return isOAuthUsageExhaustedError(input.error) || hasExhaustedPrimaryRateLimit(input.rateLimits);
}

export function isOAuthUsageExhaustedError(error: unknown): boolean {
  const message = toErrorMessage(error);
  if (!message) {
    return false;
  }
  return OAUTH_USAGE_EXHAUSTED_PATTERNS.some((pattern) => pattern.test(message));
}

function hasExhaustedPrimaryRateLimit(rateLimits: CodexRateLimits | null): boolean {
  const buckets = [
    ...(rateLimits?.defaultBucket ? [rateLimits.defaultBucket] : []),
    ...(rateLimits?.buckets ?? []),
  ];
  return buckets.some((bucket) => (bucket.primary?.usedPercent ?? 0) >= 100);
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.trim();
  }
  if (typeof error === "string") {
    return error.trim();
  }
  try {
    return JSON.stringify(error);
  } catch {
    return "";
  }
}
