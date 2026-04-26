import type { ConversationMessage } from "../types.js";

export interface MessageReplayPlan {
  prompt: string;
  messagesBeforePrompt: ConversationMessage[];
  userMessageId: string;
}

export function prepareMessageReplay(
  messages: ConversationMessage[],
  anchorMessageId: string,
  editedPrompt?: string,
): MessageReplayPlan | null {
  const anchorIndex = messages.findIndex((message) => message.id === anchorMessageId);
  if (anchorIndex < 0) {
    return null;
  }

  const anchorMessage = messages[anchorIndex];
  const userIndex =
    anchorMessage?.role === "user"
      ? anchorIndex
      : findPreviousUserMessageIndex(messages, anchorIndex);
  if (userIndex < 0) {
    return null;
  }

  const userMessage = messages[userIndex];
  const prompt = (editedPrompt ?? userMessage?.text ?? "").trim();
  if (!prompt || !userMessage) {
    return null;
  }

  return {
    prompt,
    messagesBeforePrompt: messages.slice(0, userIndex),
    userMessageId: userMessage.id,
  };
}

function findPreviousUserMessageIndex(messages: ConversationMessage[], beforeIndex: number): number {
  for (let index = beforeIndex - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === "user") {
      return index;
    }
  }
  return -1;
}
