import {
  normalizeCodexRealtimeVoice,
  type BrowserActionPermissionMode,
  type ProfileTemplate,
} from "@codex-sidepanel/shared";

import type { ConversationSummary, ExtensionSettings, SavedConversation } from "../types.js";
import { normalizeStoredProfiles } from "../profile-templates.js";
import type { SkillOption } from "../sidepanel/skills.js";
import { normalizeUiLanguageSetting } from "../ui-language.js";
import { normalizeEnabledCodexSkillIds } from "../codex-skill-settings.js";
import { normalizeCustomSiteSuggestions } from "../custom-site-suggestions.js";
import {
  clearConversationHistoryState,
  deleteConversationHistoryEntry,
} from "./conversation-history.js";

const STORAGE_KEYS = {
  settings: "codex.sidepanel.settings",
  conversations: "codex.sidepanel.conversations",
  currentConversationId: "codex.sidepanel.currentConversationId",
  selectedProfileId: "codex.sidepanel.selectedProfileId",
  selectedModel: "codex.sidepanel.selectedModel",
  selectedReasoningEffort: "codex.sidepanel.selectedReasoningEffort",
  selectedServiceTier: "codex.sidepanel.selectedServiceTier",
  skills: "codex.sidepanel.skills",
  profiles: "codex.sidepanel.profiles",
  deletedProfileIds: "codex.sidepanel.deletedProfileIds",
} as const;

export const DEFAULT_SETTINGS: ExtensionSettings = {
  uiLanguage: "auto",
  usageNoticeAccepted: false,
  shareCurrentTabByDefault: false,
  rememberChats: false,
  liveCaptions: true,
  allowVoiceNavigation: true,
  allowBrowserActions: true,
  browserActionPermissionMode: "ask",
  preferredVoice: "",
  workspaceRoot: "",
  codexBinPath: "",
  enabledCodexSkillIds: [],
  autoCompactConversations: true,
  customSiteSuggestions: [],
};

const CONVERSATION_KEYS = [STORAGE_KEYS.conversations, STORAGE_KEYS.currentConversationId] as const;

export async function getStoredSettings(): Promise<ExtensionSettings> {
  const result = (await chrome.storage.local.get(STORAGE_KEYS.settings))[STORAGE_KEYS.settings] as
    | ExtensionSettings
    | undefined;
  const settings = { ...DEFAULT_SETTINGS, ...result };
  return {
    ...settings,
    allowBrowserActions: true,
    uiLanguage: normalizeUiLanguageSetting(settings.uiLanguage),
    preferredVoice: normalizeCodexRealtimeVoice(settings.preferredVoice),
    browserActionPermissionMode: normalizeBrowserActionPermissionMode(settings.browserActionPermissionMode),
    enabledCodexSkillIds: normalizeEnabledCodexSkillIds(settings.enabledCodexSkillIds),
    customSiteSuggestions: normalizeCustomSiteSuggestions(settings.customSiteSuggestions),
  };
}

export async function updateStoredSettings(patch: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
  const current = await getStoredSettings();
  const next = {
    ...current,
    ...patch,
    allowBrowserActions: true,
    uiLanguage: normalizeUiLanguageSetting(patch.uiLanguage ?? current.uiLanguage),
    preferredVoice: normalizeCodexRealtimeVoice(patch.preferredVoice ?? current.preferredVoice),
    browserActionPermissionMode: normalizeBrowserActionPermissionMode(
      patch.browserActionPermissionMode ?? current.browserActionPermissionMode,
    ),
    enabledCodexSkillIds: normalizeEnabledCodexSkillIds(
      patch.enabledCodexSkillIds ?? current.enabledCodexSkillIds,
    ),
    customSiteSuggestions: normalizeCustomSiteSuggestions(
      patch.customSiteSuggestions ?? current.customSiteSuggestions,
    ),
  };
  await chrome.storage.local.set({ [STORAGE_KEYS.settings]: next });
  if (current.rememberChats !== next.rememberChats) {
    await migrateConversationRetention(next.rememberChats);
  }
  return next;
}

function normalizeBrowserActionPermissionMode(value: unknown): BrowserActionPermissionMode {
  return value === "auto-review" || value === "full" || value === "ask" ? value : "ask";
}

export async function resetStoredSettings(): Promise<ExtensionSettings> {
  await chrome.storage.local.set({ [STORAGE_KEYS.settings]: DEFAULT_SETTINGS });
  await chrome.storage.local.remove(STORAGE_KEYS.deletedProfileIds);
  await migrateConversationRetention(DEFAULT_SETTINGS.rememberChats);
  return getStoredSettings();
}

export async function getSelectedProfileId(): Promise<string | null> {
  const result = (await chrome.storage.local.get(STORAGE_KEYS.selectedProfileId))[STORAGE_KEYS.selectedProfileId];
  return typeof result === "string" ? result : null;
}

export async function setSelectedProfileId(profileId: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.selectedProfileId]: profileId });
}

export async function getSelectedModel(): Promise<string> {
  const result = (await chrome.storage.local.get(STORAGE_KEYS.selectedModel))[STORAGE_KEYS.selectedModel];
  return typeof result === "string" ? result : "";
}

export async function setSelectedModel(model: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.selectedModel]: model });
}

export async function getSelectedReasoningEffort(): Promise<string> {
  const result = (await chrome.storage.local.get(STORAGE_KEYS.selectedReasoningEffort))[
    STORAGE_KEYS.selectedReasoningEffort
  ];
  return typeof result === "string" ? result : "";
}

export async function setSelectedReasoningEffort(reasoningEffort: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.selectedReasoningEffort]: reasoningEffort });
}

export async function getSelectedServiceTier(): Promise<string> {
  const result = (await chrome.storage.local.get(STORAGE_KEYS.selectedServiceTier))[STORAGE_KEYS.selectedServiceTier];
  return typeof result === "string" ? result : "";
}

export async function setSelectedServiceTier(serviceTier: string): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.selectedServiceTier]: serviceTier });
}

export async function listCustomProfiles(): Promise<ProfileTemplate[]> {
  const result = (await chrome.storage.local.get(STORAGE_KEYS.profiles))[STORAGE_KEYS.profiles] as
    | ProfileTemplate[]
    | undefined;
  return normalizeStoredProfiles(Array.isArray(result) ? result : []);
}

export async function saveCustomProfile(profile: ProfileTemplate): Promise<ProfileTemplate[]> {
  const current = await listCustomProfiles();
  const next = normalizeStoredProfiles([profile, ...current.filter((item) => item.id !== profile.id)]);
  await chrome.storage.local.set({ [STORAGE_KEYS.profiles]: next });
  await undeleteProfileId(profile.id);
  return next;
}

export async function deleteCustomProfile(profileId: string, options: { hideBuiltin?: boolean } = {}): Promise<ProfileTemplate[]> {
  const current = await listCustomProfiles();
  const next = normalizeStoredProfiles(current.filter((item) => item.id !== profileId));
  await chrome.storage.local.set({ [STORAGE_KEYS.profiles]: next });
  if (options.hideBuiltin) {
    await setDeletedProfileIds([...(await listDeletedProfileIds()), profileId]);
  }
  return next;
}

export async function listDeletedProfileIds(): Promise<string[]> {
  const result = (await chrome.storage.local.get(STORAGE_KEYS.deletedProfileIds))[STORAGE_KEYS.deletedProfileIds] as
    | string[]
    | undefined;
  return normalizeProfileIds(result ?? []);
}

async function undeleteProfileId(profileId: string): Promise<void> {
  const deleted = (await listDeletedProfileIds()).filter((id) => id !== profileId);
  await chrome.storage.local.set({ [STORAGE_KEYS.deletedProfileIds]: deleted });
}

async function setDeletedProfileIds(profileIds: string[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.deletedProfileIds]: normalizeProfileIds(profileIds) });
}

export async function listSkills(): Promise<SkillOption[]> {
  const result = (await chrome.storage.local.get(STORAGE_KEYS.skills))[STORAGE_KEYS.skills] as SkillOption[] | undefined;
  return normalizeStoredSkills(result ?? []);
}

export async function saveSkill(skill: SkillOption): Promise<SkillOption[]> {
  const current = ((await chrome.storage.local.get(STORAGE_KEYS.skills))[STORAGE_KEYS.skills] as SkillOption[] | undefined) ?? [];
  const filtered = normalizeStoredSkills(current).filter((item) => item.id !== skill.id);
  const next = [...filtered, { ...skill, source: "saved" as const }]
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((item) => ({
      ...item,
      source: item.source ?? "saved",
    }));
  await chrome.storage.local.set({ [STORAGE_KEYS.skills]: next });
  return next;
}

export async function deleteSkill(skillId: string): Promise<SkillOption[]> {
  const current = normalizeStoredSkills(
    ((await chrome.storage.local.get(STORAGE_KEYS.skills))[STORAGE_KEYS.skills] as SkillOption[] | undefined) ?? [],
  );
  const next = current.filter((item) => item.id !== skillId);
  await chrome.storage.local.set({ [STORAGE_KEYS.skills]: next });
  return next;
}

export async function listConversations(): Promise<SavedConversation[]> {
  const area = await getConversationStorageArea();
  const result = (await area.get(STORAGE_KEYS.conversations))[STORAGE_KEYS.conversations] as
    | SavedConversation[]
    | undefined;
  return (result ?? [])
    .map((conversation) => ({
      ...conversation,
      structuredInputs: conversation.structuredInputs ?? [],
    }))
    .sort((left, right) => right.updatedAt - left.updatedAt);
}

export async function getCurrentConversation(): Promise<SavedConversation | null> {
  const conversations = await listConversations();
  const currentConversationId = await getCurrentConversationId();
  return conversations.find((item) => item.id === currentConversationId) ?? null;
}

export async function createConversation(profileId: string, model: string): Promise<SavedConversation> {
  const conversation: SavedConversation = {
    id: crypto.randomUUID(),
    title: "New chat",
    profileId,
    model,
    messages: [],
    attachments: [],
    structuredInputs: [],
    selectedTabIds: [],
    historyQuery: "",
    readStrategyOverride: "auto",
    updatedAt: Date.now(),
  };
  await saveConversation(conversation);
  await setCurrentConversationId(conversation.id);
  return conversation;
}

export async function saveConversation(conversation: SavedConversation): Promise<SavedConversation> {
  const conversations = await listConversations();
  const area = await getConversationStorageArea();
  const nextConversation = {
    ...conversation,
    title: buildConversationTitle(conversation),
    updatedAt: Date.now(),
  };
  const next = [nextConversation, ...conversations.filter((item) => item.id !== conversation.id)].slice(0, 20);
  await area.set({ [STORAGE_KEYS.conversations]: next });
  return nextConversation;
}

export async function deleteConversation(conversationId: string): Promise<SavedConversation[]> {
  const area = await getConversationStorageArea();
  const conversations = await listConversations();
  const currentConversationId = await getCurrentConversationId();
  const next = deleteConversationHistoryEntry({
    conversations,
    conversationId,
    currentConversationId,
  });
  await area.set({ [STORAGE_KEYS.conversations]: next.conversations });
  await setCurrentConversationId(next.currentConversationId);
  return next.conversations;
}

export async function clearConversations(): Promise<void> {
  const area = await getConversationStorageArea();
  const next = clearConversationHistoryState();
  await area.set({
    [STORAGE_KEYS.conversations]: next.conversations,
    [STORAGE_KEYS.currentConversationId]: next.currentConversationId,
  });
}

export async function setCurrentConversationId(conversationId: string | null): Promise<void> {
  const area = await getConversationStorageArea();
  await area.set({ [STORAGE_KEYS.currentConversationId]: conversationId });
}

export async function getCurrentConversationId(): Promise<string | null> {
  const area = await getConversationStorageArea();
  const result = (await area.get(STORAGE_KEYS.currentConversationId))[STORAGE_KEYS.currentConversationId];
  return typeof result === "string" ? result : null;
}

export async function normalizeConversationRetention(): Promise<void> {
  const settings = await getStoredSettings();
  if (settings.rememberChats) {
    return;
  }

  await chrome.storage.local.remove([...CONVERSATION_KEYS]);
}

export function toConversationSummary(conversation: SavedConversation): ConversationSummary {
  return {
    id: conversation.id,
    title: conversation.title,
    profileId: conversation.profileId,
    updatedAt: conversation.updatedAt,
  };
}

function buildConversationTitle(conversation: SavedConversation): string {
  const firstUserMessage = conversation.messages.find((message) => message.role === "user")?.text.trim();
  if (!firstUserMessage) {
    return "New chat";
  }

  return firstUserMessage.length <= 48 ? firstUserMessage : `${firstUserMessage.slice(0, 47).trimEnd()}…`;
}

function normalizeStoredSkills(skills: SkillOption[]): SkillOption[] {
  return skills.map((skill) => ({
    ...skill,
    source: skill.source ?? "saved",
  }));
}

function normalizeProfileIds(profileIds: string[]): string[] {
  return Array.from(
    new Set(profileIds.map((id) => (typeof id === "string" ? id.trim() : "")).filter((id) => /^[a-z0-9][a-z0-9-]{0,80}$/iu.test(id))),
  );
}

async function getConversationStorageArea(): Promise<chrome.storage.StorageArea> {
  return (await getStoredSettings()).rememberChats ? chrome.storage.local : chrome.storage.session;
}

async function migrateConversationRetention(rememberChats: boolean): Promise<void> {
  const source = rememberChats ? chrome.storage.session : chrome.storage.local;
  const destination = rememberChats ? chrome.storage.local : chrome.storage.session;
  const snapshot = await source.get([...CONVERSATION_KEYS]);

  if (Object.keys(snapshot).length) {
    await destination.set(snapshot);
  }

  await source.remove([...CONVERSATION_KEYS]);
}
