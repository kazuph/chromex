import type { UiInitPayload } from "../types.js";

export function shouldShowAuthOnboarding(accountStatus: UiInitPayload["accountStatus"] | null): boolean {
  return accountStatus !== null && !accountStatus.codexAuthenticated;
}

export function shouldShowUsageNoticeOnboarding(input: {
  accountStatus: UiInitPayload["accountStatus"] | null;
  usageNoticeAccepted: boolean;
}): boolean {
  return Boolean(input.accountStatus?.codexAuthenticated) && !input.usageNoticeAccepted;
}
