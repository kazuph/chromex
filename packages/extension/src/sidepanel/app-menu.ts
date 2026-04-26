import type { ConversationSummary } from "../types.js";
import type { UiLocale } from "./i18n.js";

export const APP_MENU_RECENT_CHAT_LIMIT = 5;

export type AppMenuLabels = {
  menu: string;
  chat: string;
  context: string;
  settingsHelp: string;
  recentChats: string;
  compactConversation: string;
  createInfographic: string;
  clearRecentChats: string;
  deleteChat: string;
  more: string;
  noRecentChats: string;
};

export function listAppMenuRecentChats(
  recentChats: ConversationSummary[],
  limit = APP_MENU_RECENT_CHAT_LIMIT,
): ConversationSummary[] {
  return recentChats.slice(0, Math.max(0, limit));
}

export function hasAppMenuMoreRecentChats(
  recentChats: ConversationSummary[],
  limit = APP_MENU_RECENT_CHAT_LIMIT,
): boolean {
  return recentChats.length > Math.max(0, limit);
}

export function getAppMenuLabels(locale: UiLocale): AppMenuLabels {
  if (locale === "ko") {
    return {
      menu: "메뉴",
      chat: "채팅",
      context: "컨텍스트",
      settingsHelp: "설정 및 도움말",
      recentChats: "최근 채팅",
      compactConversation: "대화 압축",
      createInfographic: "인포그래픽 만들기",
      clearRecentChats: "전체 삭제",
      deleteChat: "채팅 삭제",
      more: "더보기",
      noRecentChats: "최근 채팅이 없습니다",
    };
  }

  return {
    menu: "Menu",
    chat: "Chat",
    context: "Context",
    settingsHelp: "Settings and help",
    recentChats: "Recent chats",
    compactConversation: "Compact conversation",
    createInfographic: "Create infographic",
    clearRecentChats: "Clear all",
    deleteChat: "Delete chat",
    more: "More",
    noRecentChats: "No recent chats yet",
  };
}
