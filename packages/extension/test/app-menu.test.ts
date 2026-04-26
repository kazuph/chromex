import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  APP_MENU_RECENT_CHAT_LIMIT,
  listAppMenuRecentChats,
  getAppMenuLabels,
  hasAppMenuMoreRecentChats,
} from "../src/sidepanel/app-menu.js";
import type { ConversationSummary } from "../src/types.js";

const css = readFileSync(resolve(process.cwd(), "public/sidepanel.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const sidepanelSource = readFileSync(resolve(process.cwd(), "src/sidepanel/index.ts"), "utf8");

function readFinalDeclaration(selector: string, property: string): string {
  const blockPattern = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  let value = "";

  while ((match = blockPattern.exec(css))) {
    const selectorList = (match[1] ?? "")
      .split(",")
      .map((item) => item.trim());
    if (!selectorList.includes(selector)) {
      continue;
    }

    const declarations = match[2] ?? "";
    for (const declaration of declarations.split(";")) {
      const [name, ...rawValue] = declaration.split(":");
      if (name?.trim() === property) {
        value = rawValue.join(":").trim();
      }
    }
  }

  return value;
}

function makeConversation(index: number): ConversationSummary {
  return {
    id: `chat-${index}`,
    title: `대화 ${index}`,
    profileId: "research",
    updatedAt: 1_700_000_000 + index,
  };
}

describe("top app menu", () => {
  test("keeps recent chat history compact in the top menu", () => {
    const chats = Array.from({ length: 9 }, (_, index) => makeConversation(index + 1));

    expect(listAppMenuRecentChats(chats).map((chat) => chat.id)).toEqual([
      "chat-1",
      "chat-2",
      "chat-3",
      "chat-4",
      "chat-5",
    ]);
    expect(hasAppMenuMoreRecentChats(chats)).toBe(true);
    expect(hasAppMenuMoreRecentChats(chats.slice(0, 5))).toBe(false);
  });

  test("expands hidden recent chats in place instead of opening settings", () => {
    expect(APP_MENU_RECENT_CHAT_LIMIT).toBe(5);
    expect(sidepanelSource).toContain("appMenuRecentChatLimit");
    expect(sidepanelSource).toContain('data-menu-action="show-more-recent-chats"');
    expect(sidepanelSource).toContain("state.appMenuRecentChatLimit += APP_MENU_RECENT_CHAT_LIMIT");
    expect(sidepanelSource).not.toContain('<button class="app-menu-row" data-menu-view="workspace" role="menuitem" ${disabledAttribute}>\n                <span class="app-menu-icon" aria-hidden="true">...</span>');
  });

  test("localizes menu destinations for Korean browser UI", () => {
    expect(getAppMenuLabels("ko")).toMatchObject({
      menu: "메뉴",
      recentChats: "최근 채팅",
      clearRecentChats: "전체 삭제",
      deleteChat: "채팅 삭제",
      more: "더보기",
      createInfographic: "인포그래픽 만들기",
      context: "컨텍스트",
      settingsHelp: "설정 및 도움말",
    });
  });

  test("localizes current-page infographic quick action", () => {
    expect(getAppMenuLabels("en")).toMatchObject({
      createInfographic: "Create infographic",
    });
  });

  test("does not expose unsupported new-tab continuation actions", () => {
    const koLabels = getAppMenuLabels("ko") as Record<string, string>;
    const enLabels = getAppMenuLabels("en") as Record<string, string>;

    expect(koLabels.openInNewTab).toBeUndefined();
    expect(enLabels.openInNewTab).toBeUndefined();
    expect(Object.values(koLabels)).not.toContain("새 탭에서 채팅 계속하기");
    expect(Object.values(enLabels)).not.toContain("Continue chat in new tab");
  });

  test("uses compact rows and labels for the recent-chat popover", () => {
    expect(readFinalDeclaration(".app-menu", "width")).toBe("min(304px, calc(100vw - 28px))");
    expect(readFinalDeclaration(".app-menu", "padding")).toBe("8px 0");
    expect(readFinalDeclaration(".app-menu-row", "min-height")).toBe("40px");
    expect(readFinalDeclaration(".app-menu-row", "padding")).toBe("0 16px");
    expect(readFinalDeclaration(".app-menu-label", "font-size")).toBe("13px");
    expect(readFinalDeclaration(".app-menu-delete-button", "width")).toBe("28px");
    expect(readFinalDeclaration(".app-menu-delete-button", "min-height")).toBe("40px");
  });

  test("does not show recent chat row backgrounds until hover or keyboard focus", () => {
    expect(readFinalDeclaration(".recent-chat", "background")).toBe("transparent");
    expect(readFinalDeclaration(".recent-chat:hover", "background")).toBe("rgba(255, 255, 255, 0.055)");
    expect(readFinalDeclaration(".recent-chat:focus-visible", "background")).toBe("rgba(255, 255, 255, 0.055)");
  });
});
