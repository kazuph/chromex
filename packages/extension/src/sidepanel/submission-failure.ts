import type { ConversationMessage } from "../types.js";
import type { UiLocale } from "./i18n.js";

export function createAssistantFailureMessage(
  errorMessage: string,
  locale: UiLocale,
  id = `assistant-error-${Date.now()}`,
): ConversationMessage {
  const trimmed = errorMessage.trim();
  return {
    id,
    role: "assistant",
    text:
      locale === "ko"
        ? `요청을 완료하지 못했습니다.${trimmed ? ` ${trimmed}` : ""}`
        : `I couldn't complete the request.${trimmed ? ` ${trimmed}` : ""}`,
  };
}
