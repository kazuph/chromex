import type {
  ActionCard,
  CodexAppOption,
  CodexMcpServerOption,
  CodexModelOption,
  CodexPluginOption,
  CodexSkillOption,
  CodexStructuredInput,
  CodexThreadSummary,
  PageContextEnvelope,
  ProfileTemplate,
  ReadStrategy,
} from "@codex-sidepanel/shared";

import type {
  ConversationMessage,
  ConversationMessageAttachment,
  ConversationMessageImage,
  ConversationMessageProfile,
  ConversationMessageStructuredInput,
  ConversationSummary,
  SavedConversation,
} from "../types.js";
import type { SkillOption } from "./skills.js";

const MAX_STORED_DATA_IMAGE_URL_CHARS = 128 * 1024;

export interface SidepanelCollections {
  models: CodexModelOption[];
  profiles: ProfileTemplate[];
  actionCards: ActionCard[];
  skills: SkillOption[];
  appServerSkills: CodexSkillOption[];
  connectedApps: CodexAppOption[];
  appServerPlugins: CodexPluginOption[];
  mcpServers: CodexMcpServerOption[];
  recentChats: ConversationSummary[];
  serverThreads: CodexThreadSummary[];
}

export function normalizeSidepanelCollections(input: Partial<SidepanelCollections>): SidepanelCollections {
  return {
    models: arrayOrEmpty(input.models),
    profiles: arrayOrEmpty(input.profiles),
    actionCards: arrayOrEmpty(input.actionCards),
    skills: arrayOrEmpty(input.skills),
    appServerSkills: arrayOrEmpty(input.appServerSkills),
    connectedApps: arrayOrEmpty(input.connectedApps),
    appServerPlugins: arrayOrEmpty(input.appServerPlugins),
    mcpServers: arrayOrEmpty(input.mcpServers),
    recentChats: arrayOrEmpty(input.recentChats),
    serverThreads: arrayOrEmpty(input.serverThreads),
  };
}

export function normalizePanelConversation(
  conversation: Partial<SavedConversation> | null | undefined,
): SavedConversation | null {
  if (!conversation) {
    return null;
  }

  return {
    id: stringOrDefault(conversation.id, ""),
    title: stringOrDefault(conversation.title, "New chat"),
    profileId: stringOrDefault(conversation.profileId, "default"),
    ...(typeof conversation.model === "string" ? { model: conversation.model } : {}),
    ...(typeof conversation.threadId === "string" ? { threadId: conversation.threadId } : {}),
    messages: normalizeMessages(conversation.messages),
    attachments: arrayOrEmpty(conversation.attachments),
    structuredInputs: arrayOrEmpty<CodexStructuredInput>(conversation.structuredInputs),
    selectedTabIds: arrayOrEmpty(conversation.selectedTabIds).filter((value) => Number.isFinite(value)),
    historyQuery: stringOrDefault(conversation.historyQuery, ""),
    readStrategyOverride: normalizeReadStrategy(conversation.readStrategyOverride),
    updatedAt: Number.isFinite(conversation.updatedAt) ? Number(conversation.updatedAt) : Date.now(),
  };
}

function normalizeMessages(messages: SavedConversation["messages"] | undefined): ConversationMessage[] {
  return arrayOrEmpty(messages)
    .map((message, index) => {
      const images = normalizeMessageImages(message.images);
      const attachments = normalizeMessageAttachments(message.attachments);
      const structuredInputs = normalizeMessageStructuredInputs(message.structuredInputs);
      const normalized = {
        id: stringOrDefault(message.id, `message-${index + 1}`),
        role: message.role === "user" ? "user" : "assistant",
        text: stringOrDefault(message.text, ""),
        ...normalizeMessageNotice(message.notice),
        ...normalizeMessageDelivery(message),
        ...(message.role === "user" ? normalizeMessageProfile(message.profile) : {}),
        ...(images.length ? { images } : {}),
        ...(attachments.length ? { attachments } : {}),
        ...(structuredInputs.length ? { structuredInputs } : {}),
        ...normalizeMessageTrace(message.trace),
      } satisfies ConversationMessage;
      return normalized;
    })
    .filter((message) => !isTraceOnlyProgressMessage(message));
}

function normalizeMessageDelivery(message: ConversationMessage): Pick<ConversationMessage, "delivery" | "voice"> | Record<string, never> {
  if (message.delivery !== "voice") {
    return {};
  }

  const startedAt = Number(message.voice?.startedAt);
  if (!Number.isFinite(startedAt)) {
    return { delivery: "voice" };
  }

  const durationMs = Number(message.voice?.durationMs);
  return {
    delivery: "voice",
    voice: {
      startedAt,
      ...(Number.isFinite(durationMs) ? { durationMs: Math.max(0, durationMs) } : {}),
    },
  };
}

function normalizeMessageProfile(profile: ConversationMessage["profile"] | undefined): { profile: ConversationMessageProfile } | Record<string, never> {
  const id = stringOrDefault(profile?.id, "").trim();
  const name = stringOrDefault(profile?.name, "").trim();
  if (!id || !name || id === "default") {
    return {};
  }
  const color = stringOrDefault(profile?.color, "").trim();
  const icon = stringOrDefault(profile?.icon, "").trim();
  return {
    profile: {
      id,
      name,
      ...(isSafeProfileColor(color) ? { color: color.toLowerCase() } : {}),
      ...(icon ? { icon } : {}),
    },
  };
}

function isSafeProfileColor(color: string): boolean {
  return /^#[0-9a-f]{6}$/iu.test(color);
}

function normalizeMessageImages(images: ConversationMessage["images"] | undefined): NonNullable<ConversationMessage["images"]> {
  return arrayOrEmpty(images)
    .map((image) => normalizeMessageImage(image))
    .filter((image) => image.src || image.assetRef || image.status === "deleted" || image.status === "error" || image.status === "loading");
}

function normalizeMessageAttachments(
  attachments: ConversationMessage["attachments"] | undefined,
): NonNullable<ConversationMessage["attachments"]> {
  return arrayOrEmpty(attachments)
    .map((attachment) => normalizeMessageAttachment(attachment))
    .filter((attachment) => attachment.id && attachment.name);
}

function normalizeMessageAttachment(attachment: ConversationMessageAttachment): ConversationMessageAttachment {
  const kind = normalizeAttachmentKind(attachment.kind);
  const previewSrc = normalizeAttachmentPreviewSrc(stringOrDefault(attachment.previewSrc, ""), kind);
  const sourceUrl = normalizeAttachmentSourceUrl(stringOrDefault(attachment.sourceUrl, ""));
  const role = normalizeAttachmentRole(attachment.role);
  return {
    id: stringOrDefault(attachment.id, "").slice(0, 160),
    name: stringOrDefault(attachment.name, "").slice(0, 180),
    mimeType: stringOrDefault(attachment.mimeType, "application/octet-stream").slice(0, 120),
    kind,
    sizeBytes: Number.isFinite(attachment.sizeBytes) ? Math.max(0, Number(attachment.sizeBytes)) : 0,
    ...(previewSrc ? { previewSrc } : {}),
    ...(sourceUrl ? { sourceUrl } : {}),
    ...(role ? { role } : {}),
  };
}

function normalizeAttachmentKind(kind: ConversationMessageAttachment["kind"] | undefined): ConversationMessageAttachment["kind"] {
  switch (kind) {
    case "image":
    case "text":
    case "pdf":
    case "docx":
    case "spreadsheet":
    case "binary":
      return kind;
    default:
      return "binary";
  }
}

function normalizeAttachmentRole(
  role: ConversationMessageAttachment["role"] | undefined,
): ConversationMessageAttachment["role"] | undefined {
  return role === "target" || role === "reference" ? role : undefined;
}

function normalizeAttachmentPreviewSrc(
  value: string,
  kind: ConversationMessageAttachment["kind"],
): string {
  const normalized = value.trim();
  if (!normalized || kind !== "image") {
    return "";
  }
  if (/^data:image\/[a-z0-9.+-]+;base64,/iu.test(normalized) && normalized.length <= MAX_STORED_DATA_IMAGE_URL_CHARS) {
    return normalized;
  }
  if (/^(?:https?:\/\/|blob:|chrome-extension:\/\/)/iu.test(normalized)) {
    return normalized;
  }
  return "";
}

function normalizeAttachmentSourceUrl(value: string): string {
  const normalized = value.trim();
  return /^https?:\/\//iu.test(normalized) ? normalized : "";
}

function normalizeMessageImage(image: ConversationMessageImage): ConversationMessageImage {
  const rawSrc = stringOrDefault(image.src, "");
  const assetRef = stringOrDefault(image.assetRef, "");
  const src = rawSrc.startsWith("blob:") ? "" : rawSrc;
  const normalized: ConversationMessageImage = {
    src,
    alt: stringOrDefault(image.alt, "Image"),
  };
  if (assetRef) {
    normalized.assetRef = assetRef;
  }
  const status = normalizeImageStatus(image.status, rawSrc, assetRef);
  if (status) {
    normalized.status = status;
  }
  return normalized;
}

function normalizeImageStatus(
  status: ConversationMessageImage["status"] | undefined,
  src: string,
  assetRef: string,
): ConversationMessageImage["status"] | undefined {
  if (src.startsWith("blob:")) {
    return assetRef ? "loading" : "deleted";
  }
  if (status === "loading" || status === "ready" || status === "error" || status === "deleted") {
    return status;
  }
  if (assetRef && !src) {
    return "loading";
  }
  if (src) {
    return "ready";
  }
  return undefined;
}

export function serializeConversationMessagesForStorage(messages: ConversationMessage[]): ConversationMessage[] {
  return messages
    .map((message) => {
      const images = serializeConversationImagesForStorage(message.images);
      const attachments = serializeConversationAttachmentsForStorage(message.attachments);
      const structuredInputs = normalizeMessageStructuredInputs(message.structuredInputs);
      const trace = serializeConversationTraceForStorage(message.trace);
      return {
        id: message.id,
        role: message.role,
        text: sanitizeMessageTextForStorage(message.text),
        ...normalizeMessageNotice(message.notice),
        ...normalizeMessageDelivery(message),
        ...(message.role === "user" ? normalizeMessageProfile(message.profile) : {}),
        ...(images.length ? { images } : {}),
        ...(attachments.length ? { attachments } : {}),
        ...(structuredInputs.length ? { structuredInputs } : {}),
        ...(trace.length ? { trace } : {}),
      } satisfies ConversationMessage;
    })
    .filter((message) => !isTraceOnlyProgressMessage(message));
}

export function shouldPersistConversationMessagesForStorage(messages: ConversationMessage[]): boolean {
  return serializeConversationMessagesForStorage(messages).length > 0;
}

export function shouldApplyConversationSaveResultToActiveChat(input: {
  saveStartedConversationId: string;
  currentConversationId: string;
  savedConversationId: string;
}): boolean {
  if (!input.saveStartedConversationId || input.savedConversationId !== input.saveStartedConversationId) {
    return false;
  }
  return !input.currentConversationId || input.currentConversationId === input.saveStartedConversationId;
}

export function shouldHydrateInitConversation(input: {
  currentConversationIdBeforeInit: string;
  currentConversationIdNow: string;
  payloadConversationId: string;
}): boolean {
  if (!input.currentConversationIdNow) {
    return true;
  }
  if (input.payloadConversationId && input.payloadConversationId === input.currentConversationIdNow) {
    return true;
  }
  return input.currentConversationIdNow === input.currentConversationIdBeforeInit;
}

function normalizeMessageNotice(
  notice: ConversationMessage["notice"] | undefined,
): Pick<ConversationMessage, "notice"> | Record<string, never> {
  if (notice?.type !== "context-compaction") {
    return {};
  }
  return {
    notice: {
      type: "context-compaction",
      state: notice.state === "completed" ? "completed" : "running",
      automatic: notice.automatic !== false,
    },
  };
}

function sanitizeMessageTextForStorage(text: string): string {
  return text.replace(/data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=]+/giu, "[stored image asset]");
}

function isTraceOnlyProgressMessage(message: ConversationMessage): boolean {
  return (
    message.role === "assistant" &&
    !message.text.trim() &&
    Boolean(message.trace?.length) &&
    !(message.images ?? []).length &&
    !(message.attachments ?? []).length
  );
}

function serializeConversationAttachmentsForStorage(
  attachments: ConversationMessage["attachments"] | undefined,
): NonNullable<ConversationMessage["attachments"]> {
  return normalizeMessageAttachments(attachments);
}

function normalizeMessageStructuredInputs(
  inputs: ConversationMessage["structuredInputs"] | undefined,
): ConversationMessageStructuredInput[] {
  const seen = new Set<string>();
  return arrayOrEmpty(inputs)
    .map((input) => {
      const id = stringOrDefault(input.id, "").trim();
      const name = stringOrDefault(input.name, "").trim();
      const path = stringOrDefault(input.path, "").trim();
      if (!id || !name || !path || seen.has(id)) {
        return null;
      }
      seen.add(id);
      const description = stringOrDefault(input.description, "").trim();
      const iconUrl = normalizeStructuredInputIconUrl(stringOrDefault(input.iconUrl, ""));
      return {
        id: id.slice(0, 180),
        type: input.type === "skill" ? "skill" : "mention",
        name: name.slice(0, 120),
        path: path.slice(0, 300),
        ...(description ? { description: description.slice(0, 240) } : {}),
        ...(iconUrl ? { iconUrl } : {}),
      };
    })
    .filter((input): input is ConversationMessageStructuredInput => input !== null);
}

function normalizeStructuredInputIconUrl(value: string): string {
  const normalized = value.trim();
  return /^(?:https?:\/\/|chrome-extension:\/\/|data:image\/[a-z0-9.+-]+;base64,)/iu.test(normalized)
    ? normalized.slice(0, MAX_STORED_DATA_IMAGE_URL_CHARS)
    : "";
}

function normalizeMessageTrace(trace: ConversationMessage["trace"] | undefined): Pick<ConversationMessage, "trace"> | Record<string, never> {
  const normalized = serializeConversationTraceForStorage(trace);
  return normalized.length ? { trace: normalized } : {};
}

function serializeConversationTraceForStorage(
  trace: ConversationMessage["trace"] | undefined,
): NonNullable<ConversationMessage["trace"]> {
  return arrayOrEmpty(trace)
    .map((item, index) => {
      const status: NonNullable<ConversationMessage["trace"]>[number]["status"] =
        item.status === "completed" ? "completed" : "running";
      return {
        id: stringOrDefault(item.id, `trace-${index + 1}`),
        kind: normalizeTraceKind(item.kind),
        title: stringOrDefault(item.title, "").slice(0, 120),
        detail: stringOrDefault(item.detail, "").slice(0, 240),
        status,
        timestampMs: Number.isFinite(item.timestampMs) ? Number(item.timestampMs) : Date.now(),
      };
    })
    .filter((item) => item.title || item.detail);
}

function normalizeTraceKind(kind: NonNullable<ConversationMessage["trace"]>[number]["kind"] | undefined): NonNullable<ConversationMessage["trace"]>[number]["kind"] {
  switch (kind) {
    case "reasoning":
    case "web":
    case "file":
    case "command":
    case "tool":
    case "browser":
    case "image":
    case "response":
      return kind;
    default:
      return "tool";
  }
}

function serializeConversationImagesForStorage(
  images: ConversationMessage["images"] | undefined,
): NonNullable<ConversationMessage["images"]> {
  return arrayOrEmpty(images)
    .map((image) => {
      if (image.assetRef) {
        return {
          src: "",
          alt: image.alt,
          assetRef: image.assetRef,
          status: image.status === "error" || image.status === "deleted" ? image.status : "loading",
        } satisfies ConversationMessageImage;
      }
      if (image.src.startsWith("blob:")) {
        return {
          src: "",
          alt: image.alt,
          status: "deleted",
        } satisfies ConversationMessageImage;
      }
      const normalized = normalizeMessageImage(image);
      if (normalized.src.startsWith("data:image/") && normalized.src.length > MAX_STORED_DATA_IMAGE_URL_CHARS) {
        return {
          src: "",
          alt: normalized.alt,
          status: "deleted",
        } satisfies ConversationMessageImage;
      }
      return normalized;
    })
    .filter((image) => image.src || image.assetRef || image.status === "deleted" || image.status === "error" || image.status === "loading");
}

function normalizeReadStrategy(value: ReadStrategy | "auto" | undefined): ReadStrategy | "auto" {
  return value === "dom" || value === "vision" || value === "hybrid" || value === "adapter" ? value : "auto";
}

function arrayOrEmpty<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : [];
}

function stringOrDefault(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}
