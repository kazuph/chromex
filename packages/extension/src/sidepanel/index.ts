import {
  normalizeCodexRealtimeVoice,
  type ActionCard,
  type BrowserActionPermissionMode,
  type CodexActiveTurn,
  type CodexAppOption,
  type CodexModelOption,
  type CodexModelReroute,
  type CodexPluginOption,
  type CodexRateLimits,
  type CodexSkillOption,
  type CodexStructuredInput,
  type CodexThreadSummary,
  type CodexTurnDiff,
  type CodexTurnPlan,
  type ProfileTemplate,
  type ReadStrategy,
  type SkillArchiveInstallResult,
  type OpenTabContext,
  type UserFileAttachment,
} from "@codex-sidepanel/shared";

import { shouldInterceptComposerDropdownOnEnter, shouldSubmitComposerOnKeydown } from "./composer-submit.js";
import { createPendingComposerDraftState, createRestoredComposerDraftState } from "./composer-draft.js";
import { calculateComposerTextareaAutosize } from "./composer-textarea-autosize.js";
import { canSendComposerMessage } from "./composer-send-guard.js";
import { resolveComposerPrimaryAction } from "./composer-primary-action.js";
import {
  clearTransientComposerCommandPills,
  removeComposerCommandPill,
  upsertComposerCommandPill,
  type ComposerCommandPill,
} from "./composer-command-pills.js";
import { createDebouncedTask } from "./debounced-task.js";
import { prepareMessageReplay } from "./message-actions.js";
import { createConversationMessageAttachments } from "./message-attachments.js";
import { isSafeMessageImageUrl, renderMessageContentHtml } from "./message-content.js";
import {
  ASK_USER_QUESTION_TAG,
  hasProfileAskUserQuestionStart,
  parseProfileAskUserQuestion,
  stripIncompleteProfileAskUserQuestion,
  type PendingProfileQuestionState,
  type ProfileAskUserQuestion,
} from "./profile-question.js";
import { renderPendingProfileQuestionCard } from "./profile-question-card.js";
import { extractMentionQuery, listMentionOptions } from "./mentions.js";
import { createRenderBatcher } from "./render-batcher.js";
import {
  normalizePanelConversation,
  normalizeSidepanelCollections,
  serializeConversationMessagesForStorage,
} from "./sidepanel-state.js";
import {
  formatPromptActivityLabel,
  getPromptActivityDetail,
  type PromptActivityPhase,
  type PromptActivityState,
} from "./prompt-activity.js";
import {
  getPermissionRequestForMessage,
  getPermissionRequestForRuntimeResponse,
  type PermissionRequestPlan,
} from "../permission-plans.js";
import {
  extractSlashQuery,
  listSlashCommandOptions,
  removeActiveSlashToken,
  type SlashCommandOption,
} from "./skills.js";
import {
  createAttachmentFingerprint,
  createFileChipLabel,
  createRemoteImageAttachment,
  extractWebImageUrlsFromDropData,
  planAttachmentSelection,
} from "./file-attachments.js";
import {
  getCodexBinaryHealth,
  getNativeHostHealth,
  type CodexBinaryHealth,
  type NativeHostHealth,
} from "./connection-diagnostics.js";
import {
  DEFAULT_REASONING_EFFORTS,
  formatReasoningEffortLabel,
  formatServiceTierLabel,
  getDefaultServiceTier,
  normalizeReasoningEffort,
  normalizeServiceTier,
} from "./composer-controls.js";
import {
  createProfileSuggestionCards,
  getSuggestionCardSource,
  mergeProfileAndSiteSuggestionCards,
} from "./profile-suggestions.js";
import { parseVoiceNavigationCommand } from "./voice-commands.js";
import { shouldAutoReconnectVoice } from "./voice-reconnect.js";
import { shouldInterruptVoiceOutputForTranscript } from "./voice-barge-in.js";
import {
  classifyMicrophonePermissionError,
  microphonePermissionResultToError,
  shouldOpenDedicatedMicrophonePermissionWindow,
  type MicrophonePermissionWindowResult,
} from "./voice-permissions.js";
import { listCodexRealtimeVoiceOptions } from "./voice-session.js";
import { createRealtimeVoiceContextAppendText } from "./voice-turn-context.js";
import {
  applyVoiceTranscriptDelta,
  applyVoiceTranscriptDone,
  createVoiceTranscriptMirrorState,
  formatVoiceDurationLabel,
  isActiveVoiceTranscriptMessage,
  resetVoiceTranscriptMirrorState,
} from "./voice-live-captions.js";
import { renderVoiceMessageIcon } from "./voice-message-icons.js";
import { shouldShowPermissionStatusBanner } from "./permission-status.js";
import { createConfirmedHistorySearchRequest } from "./history-search.js";
import { requestOptionalPermissionsWithResult } from "./permission-request.js";
import { resolvePermissionRetryPrompt } from "./permission-retry.js";
import { formatCurrentTabReferenceLabel, formatTabReferenceLabel, getTabReferenceInitial } from "./tab-reference.js";
import { formatTabMentionUrl, listTabMentionOptions, toggleSelectedTabId } from "./tab-mentions.js";
import { listSettingsSections } from "./settings-panel.js";
import { DEFAULT_PROFILE_ICON_ID, renderProfileIcon } from "./profile-icons.js";
import { renderMessageActionIcon } from "./message-action-icons.js";
import { shouldRenderAssistantMessageActions } from "./message-action-visibility.js";
import {
  clampSlashCommandIndex,
  getNextSlashCommandIndex,
  isSlashCommandArrowKey,
} from "./slash-navigation.js";
import {
  DEFAULT_PROFILE_ID,
  normalizeSelectedProfileIdForProfiles,
  resolveComposerProfileSelection,
} from "./profile-selection.js";
import { localizeBuiltinProfiles } from "../profile-localization.js";
import {
  APP_MENU_RECENT_CHAT_LIMIT,
  getAppMenuLabels,
  hasAppMenuMoreRecentChats,
  listAppMenuRecentChats,
} from "./app-menu.js";
import { createAssistantFailureMessage } from "./submission-failure.js";
import { isBridgeImageAssetRef, resolveImagePreviewRefForUi } from "./image-preview-assets.js";
import { isQuickInteractionLocked } from "./interaction-lock.js";
import {
  createAnnotatedImageAttachment,
  createImageAttachmentFromDataUrl,
  getImageAttachmentDataUrl,
  isAnnotatableImageAttachment,
} from "./image-annotation.js";
import { isYouTubeCurrentMomentAction, type YouTubeCurrentMomentPromptResult } from "../youtube-current-moment.js";
import type {
  ConversationMessageAttachment,
  ConversationMessageImage,
  ConversationMessageProfile,
  ConversationMessageTraceItem,
  ConversationMessage,
  ConversationSummary,
  ExtensionSettings,
  PromptRequestPayload,
  SavedConversation,
  UiInitPayload,
} from "../types.js";
import { listAttachmentMenuItems, type AttachmentMenuAction } from "./attachment-menu.js";
import {
  detectUiLocale,
  formatUiLanguageOptionLabel,
  getBrowserUiLanguage,
  getUiStrings,
  isRtlUiLocale,
  listSupportedUiLanguageOptions,
  normalizeUiLanguageSetting,
  resolveUiLocale,
  UI_STRINGS,
  type UiLocale,
} from "./i18n.js";
import { classifyRuntimeMessageError, isRetryableRuntimeMessageError, toErrorMessage } from "../runtime-errors.js";
import { isCurrentPageAttachment, sanitizeUnavailableCurrentPageAttachments } from "../page-context.js";
import { MAX_PROFILE_SYSTEM_PROMPT_LENGTH } from "../profile-templates.js";
import {
  mergeStructuredInputsWithEnabledCodexSkills,
  toggleEnabledCodexSkillId,
} from "../codex-skill-settings.js";
import {
  deleteCustomSiteSuggestion,
  inferCustomSiteSuggestionCards,
  listCustomSiteSuggestionsForTab,
  resolveCustomSiteSuggestionKey,
  upsertCustomSiteSuggestion,
} from "../custom-site-suggestions.js";
import {
  shouldShowScrollToBottomButton,
  shouldStickToBottomAfterRender,
} from "./chat-scroll-controls.js";
import { shouldShowAuthOnboarding, shouldShowUsageNoticeOnboarding } from "./onboarding.js";
import { createStreamingDeltaBuffer } from "./streaming-delta-buffer.js";
import { renderUiIcon, type UiIconName } from "./ui-icons.js";

type MainView = "chat" | "context" | "workspace";
const MAX_TRACE_ITEMS = 12;

type ProfileEditorState = {
  mode: "create" | "edit";
  profileId?: string;
  name: string;
  systemPrompt: string;
  color: string;
  icon: string;
  imageDataUrl: string;
  suggestedPrompts: string[];
  visualPickerOpen: boolean;
  error?: string;
};

type NativeTextDialogState = {
  kind: "api-key";
  title: string;
  description: string;
  label: string;
  placeholder: string;
  confirmLabel: string;
  cancelLabel: string;
  inputType: "text" | "password";
  error?: string;
  submitting?: boolean;
};

type NativeConfirmationDialogState = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  tone: "default" | "danger";
};

type ImageAnnotationEditorState =
  | { source: "file"; attachmentId: string }
  | { source: "conversation"; messageId: string; imageIndex: number; name: string; dataUrl: string };

type SpeechRecognitionResult = {
  isFinal: boolean;
  0: { transcript: string };
};

type SpeechRecognitionCtor = new () => {
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<SpeechRecognitionResult> }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};

type SmokeAttachmentSeed = {
  name: string;
  mimeType: string;
  base64: string;
  lastModified?: number;
};

type PendingVoiceAnswer = {
  resolve: (sdp: string) => void;
  reject: (error: Error) => void;
  timeoutId: number;
  threadId?: string;
};

type PendingVoiceStart = {
  resolve: () => void;
  reject: (error: Error) => void;
  timeoutId: number;
  threadId?: string;
};

type RealtimeVoiceTransport = "webrtc" | "websocket" | "browser-speech";
type VoiceRecognitionMode = "live" | "composer";

type RealtimeOutputAudioChunk = {
  data?: unknown;
  sampleRate?: unknown;
  sample_rate?: unknown;
  numChannels?: unknown;
  num_channels?: unknown;
};

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
    webkitAudioContext?: typeof AudioContext;
    __CODEX_SIDEPANEL_SMOKE__?: {
      waitForComposer(timeoutMs?: number): Promise<void>;
      injectFiles(files: SmokeAttachmentSeed[]): Promise<string[]>;
      enableDryRunSubmit(): void;
      submitWithEnter(text: string): Promise<{
        submissionCount: number;
        lastSubmission: string | null;
        composerValue: string | null;
      }>;
      typeIntoComposer(text: string): {
        sameNode: boolean;
        activeId: string | null;
        value: string | null;
      };
      inspectCommandPopoverForTest(text: string): {
        mentionQuery: string | null;
        slashQuery: string | null;
        suggestionCount: number;
        tabSuggestionCount: number;
        slashSuggestionCount: number;
        popoverText: string;
        activeId: string | null;
        composerValue: string | null;
        shellOverflow: string;
      };
      simulateActiveTabUpdateForTest(input: {
        title: string;
        url: string;
        actionCards: Pick<ActionCard, "id" | "title" | "description" | "kind" | "prompt">[];
      }): {
        currentTabTitle: string;
        actionCardCount: number;
        suggestionCount: number;
        firstSuggestionTitle: string;
        suggestionTitles: string[];
      };
      selectProfileForTest(profileId: string): {
        selectedProfileId: string;
        suggestionCount: number;
        firstSuggestionTitle: string;
        suggestionTitles: string[];
      };
      preserveComposerFocusOnRender(): {
        activeId: string | null;
        value: string | null;
      };
      setPromptActivityForTest(active: boolean): {
        sendButtonDisabled: boolean;
        stopButtonVisible: boolean;
        promptActivityVisible: boolean;
        promptActivityRailVisible: boolean;
      };
      setActiveTurnForTest(active: boolean): {
        sendButtonVisible: boolean;
        stopButtonVisible: boolean;
        stopButtonInSubmitSlot: boolean;
        stopButtonHasSquareIcon: boolean;
      };
      setPendingPermissionForTest(): {
        hasPrompt: boolean;
        hasButton: boolean;
      };
      setModelCatalogForTest(input: {
        models: CodexModelOption[];
        selectedModel: string;
        selectedReasoningEffort?: string;
        selectedServiceTier?: string;
      }): {
        selectedModel: string;
        selectedReasoningEffort: string;
        selectedServiceTier: string;
      };
      getDryRunSubmissions(): string[];
      setView(view: MainView): string;
      snapshot(): {
        activeView: MainView;
        actionStatus: string;
        modelLabel: string;
        fileChipLabels: string[];
        messageCount: number;
      };
      seedChatFixture(input: {
        messages: ConversationMessage[];
        actionCards?: Pick<ActionCard, "id" | "title" | "description" | "kind" | "prompt">[];
      }): {
        activeView: MainView;
        messageCount: number;
      };
      scrollChatBy(offset: number): {
        hasScrollableArea: boolean;
        before: number;
        after: number;
      };
    };
  }
}

const query = new URLSearchParams(window.location.search);
const panelMode = query.get("mode") === "popup" ? "popup" : "sidepanel";
const targetWindowId = Number(query.get("targetWindowId") || "") || undefined;
const smokeTestMode = query.get("test") === "1";
const MAX_VOICE_RECONNECT_ATTEMPTS = 2;
const STREAMING_DELTA_RENDER_INTERVAL_MS = 80;
const CHAT_SCROLL_USER_OVERRIDE_MS = 800;
const PROFILE_EDITOR_COLORS = [
  "#ffffff",
  "#ff5f67",
  "#ff8848",
  "#ffd44a",
  "#43c878",
  "#3998f5",
  "#9b6bf2",
  "#f176b7",
] as const;
const PROFILE_EDITOR_ICONS = [
  "folder",
  "dollar",
  "book",
  "graduation",
  "pencil",
  "pen",
  "code",
  "terminal",
  "music",
  "popcorn",
  "brush",
  "palette",
  "stethoscope",
  "spark",
  "lotus",
  "briefcase",
  "chart",
  "ring",
  "dumbbell",
  "notebook",
  "scale",
  "mic",
  "plane",
  "globe",
  "wrench",
  "paw",
  "flask",
  "brain",
  "heart",
  "plant",
] as const;
const DEFAULT_PROFILE_VISUAL_COLOR = "#8b5cf6";
const DEFAULT_PROFILE_VISUAL_ICON = DEFAULT_PROFILE_ICON_ID;
const MAX_PROFILE_IMAGE_BYTES = 180_000;
const autoSavedImageAssetRefs = new Set<string>();
type ImageWorkflowPlaceholderKind = "image-edit" | "infographic" | "slide-images" | "generated-image";
const pendingImageWorkflowMessageIdsByRequest = new Map<string, string>();
const completedImageWorkflowMessageIdsByRequest = new Map<string, string>();
const streamedImagePreviewRefsByRequest = new Map<string, string[]>();
const profileQuestionStreamBuffers = new Map<string, string>();

const rootElement = document.querySelector<HTMLDivElement>("#app");
if (!rootElement) {
  throw new Error("Missing #app root");
}
const root: HTMLDivElement = rootElement;
const initialLocale = detectUiLocale(getBrowserUiLanguage());

const state = {
  accountStatus: null as UiInitPayload["accountStatus"] | null,
  currentPageSupport: {
    available: true,
    blockedReason: "",
  } as UiInitPayload["currentPageSupport"],
  currentTabReference: null as OpenTabContext | null,
  models: [] as CodexModelOption[],
  profiles: [] as ProfileTemplate[],
  selectedProfileId: "default",
  selectedModel: "",
  selectedReasoningEffort: "",
  selectedServiceTier: "",
  modelCatalogState: "loading" as UiInitPayload["modelCatalogState"],
  modelCatalogErrorMessage: "",
  runtimeConfig: {
    workspaceRoot: "",
    codexBinPath: "",
    resolvedCodexBinPath: "",
    codexBinSource: "missing",
    configuredCodexBinPathInvalid: false,
  } as UiInitPayload["runtimeConfig"],
  imageAssetFolder: {
    rootDir: "",
    latestFolder: "",
    folders: [],
    assetCount: 0,
  } as UiInitPayload["imageAssetFolder"],
  diagnosticLogFolder: {
    rootDir: "",
    latestLogPath: "",
    files: [],
  } as UiInitPayload["diagnosticLogFolder"],
  actionCards: [] as ActionCard[],
  currentReadStrategy: "auto" as ReadStrategy | "auto",
  attachments: new Set<PromptRequestPayload["attachments"][number]>(),
  fileAttachments: [] as UserFileAttachment[],
  imageAnnotationReferenceAttachments: [] as UserFileAttachment[],
  imageAnnotationEditor: null as null | ImageAnnotationEditorState,
  profileEditor: null as null | ProfileEditorState,
  nativeTextDialog: null as null | NativeTextDialogState,
  nativeConfirmationDialog: null as null | NativeConfirmationDialogState,
  pendingProfileQuestion: null as PendingProfileQuestionState | null,
  selectedTabIds: [] as number[],
  openTabOptions: [] as OpenTabContext[],
  openTabOptionsState: "idle" as "idle" | "loading" | "ready" | "permission" | "error",
  openTabOptionsError: "",
  historyQuery: "",
  historyItems: [] as Array<{ title: string; url: string }>,
  messages: [] as ConversationMessage[],
  editingMessageId: null as string | null,
  mentionQuery: null as string | null,
  slashQuery: null as string | null,
  slashActiveIndex: 0,
  voiceEnabled: false,
  voiceInputActive: false,
  liveCaption: "",
  composerDraft: "",
  composerCommandPills: [] as ComposerCommandPill[],
  composerDragActive: false,
  attachmentMenuOpen: false,
  browserActionPermissionMenuOpen: false,
  composerModelMenuOpen: false,
  appMenuOpen: false,
  appMenuRecentChatLimit: APP_MENU_RECENT_CHAT_LIMIT,
  settings: {
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
  } as ExtensionSettings,
  composerSelectionStart: 0,
  composerSelectionEnd: 0,
  workspaceHarness: null as UiInitPayload["workspaceHarness"] | null,
  appServerSkills: [] as CodexSkillOption[],
  connectedApps: [] as CodexAppOption[],
  appServerPlugins: [] as CodexPluginOption[],
  recentChats: [] as ConversationSummary[],
  serverThreads: [] as CodexThreadSummary[],
  currentConversationId: "",
  threadId: "",
  currentTabContextDismissedKey: "",
  structuredInputs: [] as CodexStructuredInput[],
  activeTurn: null as CodexActiveTurn | null,
  promptActivity: null as PromptActivityState | null,
  streamingAssistantMessageIds: new Set<string>(),
  rateLimits: null as CodexRateLimits | null,
  latestPlan: null as CodexTurnPlan | null,
  latestDiff: null as CodexTurnDiff | null,
  latestReroute: null as CodexModelReroute | null,
  voiceOptions: listCodexRealtimeVoiceOptions(),
  initError: "",
  actionStatus: "",
  copiedMessageId: "",
  pendingPermission: null as {
    plan: PermissionRequestPlan;
    errorMessage: string;
    retryMessage?: string;
  } | null,
  pendingAction: "" as "" | "voice" | "image-edit",
  uiLocale: initialLocale as UiLocale,
  activeView: "chat" as MainView,
};

let recognition: InstanceType<SpeechRecognitionCtor> | null = null;
let voiceRecognitionMode: VoiceRecognitionMode | null = null;
let realtimeVoicePeer: RTCPeerConnection | null = null;
let realtimeVoiceStream: MediaStream | null = null;
let realtimeVoiceAudio: HTMLAudioElement | null = null;
let realtimeVoiceThreadId: string | null = null;
let realtimeVoiceTransport: RealtimeVoiceTransport | null = null;
let realtimeOutputAudioContext: AudioContext | null = null;
let realtimeOutputAudioNextTime = 0;
const realtimeOutputAudioSources = new Set<AudioBufferSourceNode>();
let realtimeOutputSuppressedUntil = 0;
let realtimeInputAudioContext: AudioContext | null = null;
let realtimeInputAudioSource: MediaStreamAudioSourceNode | null = null;
let realtimeInputAudioWorkletNode: AudioWorkletNode | null = null;
let realtimeInputAudioSamples: number[] = [];
let realtimeAudioSendChain: Promise<void> = Promise.resolve();
let notificationAutoDismissTimer: number | null = null;
let notificationAutoDismissSignature = "";
let copiedMessageResetTimer: number | null = null;
let pendingVoiceAnswer: PendingVoiceAnswer | null = null;
let pendingVoiceStart: PendingVoiceStart | null = null;
let realtimeVoiceContextSnapshotPromise: Promise<string> | null = null;
let realtimeVoiceContextSnapshotPrompt = "";
let realtimeVoiceContextSnapshotCapturedAt = 0;
let composerVoiceInputStream: MediaStream | null = null;
let composerVoiceInputAudioContext: AudioContext | null = null;
let composerVoiceInputAudioSource: MediaStreamAudioSourceNode | null = null;
let composerVoiceInputAnalyser: AnalyserNode | null = null;
let composerVoiceInputWaveformTimer: number | null = null;
let composerVoiceInputWaveformLevels = createSilentComposerVoiceWaveform();
let composerVoiceInputAudioData: Uint8Array<ArrayBuffer> | null = null;
let composerVoiceInputFinalTranscript = "";
let composerVoiceInputInterimTranscript = "";
let composerVoiceInputCommitPromise: Promise<void> | null = null;
let microphonePermissionWindowPromise: Promise<{
  result: MicrophonePermissionWindowResult;
  message?: string;
}> | null = null;
let voiceStartPromise: Promise<void> | null = null;
let browserVoiceFallbackActive = false;
let voiceReconnectTimer: number | null = null;
let voiceReconnectAttempts = 0;
let voiceStopRequested = false;
let voiceTranscriptMessageCounter = 0;
let realtimeBargeInHighRmsFrames = 0;
let voiceDurationTicker: number | null = null;
let voiceDurationNow = Date.now();
let liveVoiceRecognitionUtteranceStartedAt: number | null = null;
const voiceTranscriptMirror = createVoiceTranscriptMirrorState();
let nativeConfirmationResolver: ((approved: boolean) => void) | null = null;
let initializePromise: Promise<void> | null = null;
let initializeQueued = false;
let composerCompositionInProgress = false;
let smokeDryRunSubmissions: string[] = [];
let chatScrollUserOverrideUntil = 0;
const completedTurnIds = new Set<string>();
const cancelledPromptRequestIds = new Set<string>();
const REALTIME_AUDIO_CHUNK_MS = 240;
const REALTIME_BARGE_IN_RMS_THRESHOLD = 0.075;
const REALTIME_BARGE_IN_REQUIRED_AUDIO_FRAMES = 6;
const REALTIME_BARGE_IN_SUPPRESSION_MS = 220;
const REALTIME_VOICE_CONTEXT_SNAPSHOT_TTL_MS = 5000;
const COMPOSER_VOICE_WAVEFORM_BAR_COUNT = 46;
const COMPOSER_VOICE_WAVEFORM_REFRESH_MS = 90;
const COMPOSER_VOICE_STOP_FINALIZATION_TIMEOUT_MS = 1500;
const renderBatcher = createRenderBatcher(
  () => renderNow(),
  (callback) =>
    typeof window.requestAnimationFrame === "function"
      ? window.requestAnimationFrame(() => callback())
      : window.setTimeout(callback, 16),
  (handle) =>
    typeof window.cancelAnimationFrame === "function"
      ? window.cancelAnimationFrame(handle)
      : window.clearTimeout(handle),
);
const streamingDeltaBuffer = createStreamingDeltaBuffer(
  (batch) => {
    for (const item of batch) {
      upsertAssistantMessage(item.itemId, item.delta, true);
    }
    if (state.activeView === "chat") {
      const itemIds = batch.map((item) => item.itemId);
      if (!patchStreamingAssistantMessageDoms(itemIds)) {
        render();
      }
    }
  },
  (callback) => window.setTimeout(callback, STREAMING_DELTA_RENDER_INTERVAL_MS),
  window.clearTimeout.bind(window),
);
const persistConversationBatch = createDebouncedTask(
  () => persistConversation(),
  180,
  window.setTimeout.bind(window),
  window.clearTimeout.bind(window),
);

installSmokeHarness();
installGlobalFloatingSurfaceDismissal();
renderSync();
void scheduleInitialize();

window.addEventListener("pagehide", () => {
  flushStreamingAssistantDeltas();
  void persistConversationBatch.flush();
  voiceStopRequested = true;
  cancelVoiceReconnect();
  void stopRealtimeVoiceSession({ notifyBridge: true });
});

window.addEventListener("unhandledrejection", (event) => {
  state.initError = toUserFacingRuntimeError(event.reason);
  render();
  event.preventDefault();
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "ui.active-tab.updated") {
    applyActiveTabUpdate(message);
    return;
  }

  if (message.type !== "bridge.event") {
    return;
  }

  const event = message.event as {
    type: string;
    itemId?: string;
    delta?: string;
    text?: string;
    previewRef?: string;
    alt?: string;
    sdp?: string;
    role?: string;
    sessionId?: string | null;
    transport?: "webrtc" | "websocket";
    audio?: RealtimeOutputAudioChunk;
    message?: string;
    reason?: string | null;
    threadId?: string;
    turnId?: string;
    activeTurn?: CodexActiveTurn;
    phase?: PromptActivityPhase;
    clientRequestId?: string;
    workflow?: unknown;
    imageIndex?: unknown;
    attempt?: number;
    maxAttempts?: number;
    rateLimits?: CodexRateLimits | null;
    plan?: CodexTurnPlan;
    diff?: CodexTurnDiff;
    reroute?: CodexModelReroute;
    kind?: ConversationMessageTraceItem["kind"];
    title?: string;
    detail?: string;
    status?: "running" | "completed";
    timestampMs?: number;
  };
  let shouldRender = false;

  if (event.type === "message.delta") {
    const itemId = event.itemId ?? "assistant";
    state.streamingAssistantMessageIds.add(itemId);
    state.promptActivity = null;
    streamingDeltaBuffer.push(itemId, event.delta ?? "");
  }
  if (event.type === "message.completed") {
    const itemId = event.itemId ?? "assistant";
    flushStreamingAssistantDeltas();
    state.promptActivity = null;
    markActiveTurnTraceItemsCompleted();
    if ((event.text ?? "").length > 0 || !state.messages.some((message) => message.id === itemId)) {
      upsertAssistantMessage(itemId, event.text ?? "", false);
    }
    state.streamingAssistantMessageIds.delete(itemId);
    if (state.voiceEnabled && browserVoiceFallbackActive) {
      speak(event.text ?? "");
    }
    scheduleConversationPersist();
    shouldRender = state.activeView === "chat";
  }
  if (event.type === "message.image" && event.previewRef) {
    flushStreamingAssistantDeltas();
    const workflow = normalizeImageGenerateWorkflow(event.workflow);
    const imageIndex = Number(event.imageIndex);
    void handleBridgeImageEvent({
      itemId: event.itemId ?? `generated-image-${Date.now()}`,
      previewRef: event.previewRef,
      alt: event.alt ?? (state.uiLocale === "ko" ? "생성된 이미지" : "Generated image"),
      ...(typeof event.clientRequestId === "string" ? { clientRequestId: event.clientRequestId } : {}),
      ...(workflow ? { workflow } : {}),
      ...(Number.isFinite(imageIndex) ? { imageIndex } : {}),
    });
    return;
  }
  if (event.type === "prompt.retrying") {
    if (!state.promptActivity || !event.clientRequestId || state.promptActivity.clientRequestId === event.clientRequestId) {
      streamingDeltaBuffer.clear();
      profileQuestionStreamBuffers.clear();
      state.messages = state.messages.filter((message) => !state.streamingAssistantMessageIds.has(message.id));
      state.streamingAssistantMessageIds.clear();
      state.activeTurn = null;
      state.promptActivity = {
        clientRequestId: event.clientRequestId ?? state.promptActivity?.clientRequestId ?? "",
        phase: "reconnecting",
        retryAttempt: Math.max(1, Math.floor(Number(event.attempt) || 1)),
        retryMax: Math.max(1, Math.floor(Number(event.maxAttempts) || 5)),
        retryReason: event.reason ?? "",
      };
      shouldRender = state.activeView === "chat";
    }
  }
  if (event.type === "voice.sdp" && event.sdp) {
    completeRealtimeVoiceHandshake(event.threadId, event.sdp);
    return;
  }
  if (event.type === "voice.output_audio.delta") {
    void playRealtimeOutputAudio(event.audio as RealtimeOutputAudioChunk);
    return;
  }
  if (event.type === "voice.session.started") {
    activateRealtimeVoiceSession({
      ...(event.threadId ? { threadId: event.threadId } : {}),
      transport: event.transport ?? realtimeVoiceTransport,
    });
    completeRealtimeVoiceStarted(event.threadId);
    shouldRender = true;
  }
  if (event.type === "voice.transcript.delta" && event.delta) {
    if (!shouldMirrorRealtimeTranscriptEvent(event.role)) {
      return;
    }
    if (state.settings.liveCaptions) {
      const mirrored = applyVoiceTranscriptDelta({
        messages: state.messages,
        mirror: voiceTranscriptMirror,
        role: event.role,
        delta: event.delta,
        threadId: event.threadId,
        createId: () => createVoiceTranscriptMessageId(event.role),
      });
      state.liveCaption = mirrored.liveCaption;
    } else {
      state.liveCaption = "";
    }
    shouldRender = state.activeView === "chat";
  }
  if (event.type === "voice.transcript.done") {
    if (!shouldMirrorRealtimeTranscriptEvent(event.role)) {
      return;
    }
    if (state.settings.liveCaptions) {
      const mirrored = applyVoiceTranscriptDone({
        messages: state.messages,
        mirror: voiceTranscriptMirror,
        role: event.role,
        text: event.text ?? "",
        threadId: event.threadId,
        createId: () => createVoiceTranscriptMessageId(event.role),
      });
      state.liveCaption = mirrored.liveCaption;
      scheduleConversationPersist();
    } else {
      state.liveCaption = "";
    }
    shouldRender = state.activeView === "chat";
  }
  if (event.type === "voice.error") {
    handleRealtimeVoiceDisconnect(event.message ?? getUiStrings(state.uiLocale).errors.voiceUpdate, true);
    shouldRender = true;
  }
  if (event.type === "voice.session.stopped") {
    handleRealtimeVoiceDisconnect(
      "reason" in event && event.reason ? String(event.reason) : null,
      false,
    );
    shouldRender = true;
  }
  if (event.type === "turn.completed" && event.threadId) {
    flushStreamingAssistantDeltas();
    completeTurnTrace(event.threadId, event.turnId ?? "");
    if (state.promptActivity?.phase !== "reconnecting" || state.activeTurn?.turnId === event.turnId) {
      state.promptActivity = null;
    }
    state.streamingAssistantMessageIds.clear();
    state.threadId = event.threadId;
    if (event.turnId) {
      completedTurnIds.add(event.turnId);
    }
    if (state.activeTurn?.turnId === event.turnId) {
      state.activeTurn = null;
    }
    scheduleConversationPersist();
    shouldRender = true;
  }
  if (event.type === "turn.started" && event.activeTurn) {
    state.activeTurn = event.activeTurn;
    if (state.promptActivity) {
      state.promptActivity = {
        ...state.promptActivity,
        phase: "responding",
      };
    }
    shouldRender = true;
  }
  if (event.type === "prompt.status" && event.phase) {
    if (!state.promptActivity || !event.clientRequestId || state.promptActivity.clientRequestId === event.clientRequestId) {
      state.promptActivity = {
        clientRequestId: event.clientRequestId ?? state.promptActivity?.clientRequestId ?? "",
        phase: event.phase,
      };
      if (isImageWorkflowPromptActivityPhase(event.phase)) {
        ensurePendingImageWorkflowMessage(
          state.promptActivity.clientRequestId,
          normalizePromptStatusImageWorkflow(event.workflow) ?? "image-edit",
        );
      }
      shouldRender = state.activeView === "chat";
    }
  }
  if (event.type === "context.compaction.started") {
    state.promptActivity = {
      clientRequestId: state.promptActivity?.clientRequestId || `compact-${event.itemId ?? Date.now()}`,
      phase: "compacting",
    };
    shouldRender = state.activeView === "chat";
  }
  if (event.type === "context.compaction.completed") {
    if (state.promptActivity?.phase === "compacting") {
      state.promptActivity = null;
    }
    state.actionStatus = getUiStrings(state.uiLocale).status.compactCompleted;
    shouldRender = state.activeView === "chat";
  }
  if (event.type === "turn.activity" && event.threadId && event.turnId) {
    upsertTurnActivityTrace({
      threadId: event.threadId,
      turnId: event.turnId,
      itemId: event.itemId ?? `activity-${Date.now()}`,
      kind: normalizeTraceEventKind(event.kind),
      title: event.title ?? "",
      detail: event.detail ?? "",
      status: event.status === "completed" ? "completed" : "running",
      timestampMs: Number.isFinite(event.timestampMs) ? Number(event.timestampMs) : Date.now(),
    });
    shouldRender = state.activeView === "chat";
  }
  if (event.type === "turn.plan.updated" && event.plan) {
    state.latestPlan = event.plan;
    upsertTurnPlanTrace(event.plan);
    shouldRender = state.activeView === "workspace" || state.activeView === "chat";
  }
  if (event.type === "turn.diff.updated" && event.diff) {
    state.latestDiff = event.diff;
    upsertTurnDiffTrace(event.diff);
    shouldRender = state.activeView === "workspace" || state.activeView === "chat";
  }
  if (event.type === "account.rate_limits.updated") {
    state.rateLimits = event.rateLimits ?? null;
    shouldRender = state.activeView === "workspace";
  }
  if (event.type === "model.rerouted" && event.reroute) {
    state.latestReroute = event.reroute;
    shouldRender = state.activeView !== "context";
  }
  if (event.type === "catalog.updated") {
    if (!initializePromise) {
      void scheduleInitialize();
    }
    return;
  }
  if (event.type === "account.updated" || event.type === "account.login.completed") {
    void scheduleInitialize();
    return;
  }
  if (shouldRender) {
    render();
  }
});

function applyActiveTabUpdate(message: {
  currentPageSupport?: UiInitPayload["currentPageSupport"];
  currentTab?: OpenTabContext | null;
  actionCards?: ActionCard[];
}): void {
  state.currentPageSupport = message.currentPageSupport ?? state.currentPageSupport;
  state.currentTabReference = message.currentTab ?? null;
  state.actionCards = normalizeSidepanelCollections({ actionCards: message.actionCards ?? [] }).actionCards;
  sanitizeUnavailableCurrentPageState();
  render();
}

async function initialize(): Promise<void> {
  state.uiLocale = detectUiLocale(getBrowserUiLanguage());
  syncDocumentLanguage();
  try {
    const payload = (await sendRuntimeMessage({
      type: "ui.init",
      ...(targetWindowId ? { windowId: targetWindowId } : {}),
    })) as UiInitPayload & { error?: string };
    if (payload.error) {
      throw new Error(payload.error);
    }

    state.initError = "";
    state.accountStatus = payload.accountStatus;
    state.currentPageSupport = payload.currentPageSupport;
    state.currentTabReference = payload.currentTab;
    const collections = normalizeSidepanelCollections(payload);
    state.models = collections.models;
    state.selectedProfileId = payload.selectedProfileId;
    state.selectedModel = payload.selectedModel;
    state.selectedReasoningEffort = payload.selectedReasoningEffort;
    state.selectedServiceTier = payload.selectedServiceTier;
    state.modelCatalogState = payload.modelCatalogState;
    state.modelCatalogErrorMessage = payload.modelCatalogErrorMessage ?? "";
    state.runtimeConfig = payload.runtimeConfig;
    state.imageAssetFolder = payload.imageAssetFolder;
    state.diagnosticLogFolder = payload.diagnosticLogFolder;
    state.actionCards = collections.actionCards;
    state.settings = {
      ...payload.settings,
      allowBrowserActions: true,
      browserActionPermissionMode: normalizeBrowserActionPermissionMode(payload.settings.browserActionPermissionMode),
      uiLanguage: normalizeUiLanguageSetting(payload.settings.uiLanguage),
      preferredVoice: normalizeCodexRealtimeVoice(payload.settings.preferredVoice),
    };
    state.uiLocale = resolveUiLocale(state.settings.uiLanguage, getBrowserUiLanguage());
    syncDocumentLanguage();
    state.profiles = localizeBuiltinProfiles(collections.profiles, state.uiLocale);
    state.workspaceHarness = payload.workspaceHarness;
    state.appServerSkills = collections.appServerSkills;
    state.connectedApps = collections.connectedApps;
    state.appServerPlugins = collections.appServerPlugins;
    state.recentChats = collections.recentChats;
    state.serverThreads = collections.serverThreads;
    state.rateLimits = payload.rateLimits;
    state.activeTurn = payload.activeTurn;
    state.latestPlan = payload.latestPlan;
    state.latestDiff = payload.latestDiff;
    state.latestReroute = payload.latestReroute;
    const selectedProfileBeforeFallback = state.selectedProfileId;
    ensureComposerProfileSelection();
    if (state.selectedProfileId !== selectedProfileBeforeFallback) {
      void sendRuntimeMessage({ type: "profile.select", profileId: state.selectedProfileId });
    }
    hydrateConversation(payload.currentConversation);
    syncSelectedReasoningEffort();
    sanitizeUnavailableCurrentPageState();
    renderSync();
    if (state.attachments.has("open-tabs") || state.selectedTabIds.length) {
      await loadTabs();
    }
  } catch (error) {
    state.initError = toUserFacingRuntimeError(error, getUiStrings(state.uiLocale).errors.init);
    render();
  }
}

function scheduleInitialize(): Promise<void> {
  if (initializePromise) {
    initializeQueued = true;
    return initializePromise;
  }

  initializePromise = (async () => {
    do {
      initializeQueued = false;
      await initialize();
    } while (initializeQueued);
  })().finally(() => {
    initializePromise = null;
  });

  return initializePromise;
}

function hydrateConversation(conversation: SavedConversation | null): void {
  resetVoiceTranscriptMirrorState(voiceTranscriptMirror);
  streamingDeltaBuffer.clear();
  profileQuestionStreamBuffers.clear();
  state.streamingAssistantMessageIds.clear();
  state.pendingProfileQuestion = null;
  const normalized = normalizePanelConversation(conversation);
  if (!normalized) {
    state.currentConversationId = "";
    state.threadId = "";
    state.messages = [];
    state.attachments = new Set();
    state.selectedTabIds = [];
    state.historyQuery = "";
    state.currentReadStrategy = "auto";
    state.fileAttachments = [];
    state.structuredInputs = [];
    return;
  }

  state.currentConversationId = normalized.id;
  state.threadId = normalized.threadId ?? "";
  state.messages = normalized.messages;
  state.attachments = new Set();
  state.selectedTabIds = [];
  state.historyQuery = "";
  state.currentReadStrategy = "auto";
  state.fileAttachments = [];
  syncSelectedReasoningEffort();
  state.structuredInputs = [];
  void restoreConversationImagePreviews();
}

function getSelectedModelOption(): CodexModelOption | null {
  return state.models.find((model) => model.id === state.selectedModel) ?? null;
}

function syncSelectedReasoningEffort(): void {
  const speedTiers = getSelectedModelOption()?.additionalSpeedTiers ?? [];
  state.selectedReasoningEffort = normalizeReasoningEffort(
    state.selectedReasoningEffort,
    getSelectedModelReasoningEfforts(),
    getSelectedModelOption()?.defaultReasoningEffort ?? "",
  );
  state.selectedServiceTier = normalizeServiceTier(
    state.selectedServiceTier,
    speedTiers,
    getDefaultServiceTier(speedTiers),
  );
}

async function persistSelectedModelControls(): Promise<void> {
  await sendRuntimeMessage({
    type: "model.select",
    model: state.selectedModel,
    reasoningEffort: state.selectedReasoningEffort,
    serviceTier: state.selectedServiceTier,
  });
}

function getSelectedModelReasoningEfforts(): string[] {
  return getSelectedModelOption()?.reasoningEfforts ?? DEFAULT_REASONING_EFFORTS;
}

function render(): void {
  renderBatcher.request();
}

function renderSync(): void {
  renderBatcher.flush();
}

function renderNow(): void {
  ensureComposerProfileSelection();
  const strings = getUiStrings(state.uiLocale);
  const mentionOptions =
    state.mentionQuery !== null
      ? listMentionOptions(state.mentionQuery, state.uiLocale, {
          apps: state.connectedApps,
          plugins: state.appServerPlugins,
          skills: state.appServerSkills,
        }).slice(0, 12)
      : [];
  const tabMentionOptions =
    state.mentionQuery !== null && state.openTabOptionsState === "ready"
      ? listTabMentionOptions(state.openTabOptions, state.mentionQuery, 30)
      : [];
  const slashOptions = getSlashOptionsForState();
  const composerSuggestionsOpen =
    state.slashQuery !== null || state.mentionQuery !== null || state.attachmentMenuOpen || state.composerModelMenuOpen;
  const isPopup = panelMode === "popup";
  const currentTurnActive = isCurrentTurnActive();
  const canStopCurrentWork = currentTurnActive || Boolean(state.promptActivity);
  const canSendMessage = canSendComposerMessage({
    turnActive: currentTurnActive,
    promptActivityActive: Boolean(state.promptActivity),
    streamingAssistantActive: state.streamingAssistantMessageIds.size > 0,
  });
  const composerPrimaryAction = resolveComposerPrimaryAction({
    composerDraft: state.composerDraft,
    currentWorkActive: canStopCurrentWork,
    liveActive: state.voiceEnabled,
  });
  const composerPrimaryActionId =
    composerPrimaryAction === "stop-turn"
      ? "stop-turn"
      : composerPrimaryAction === "send"
        ? "send-prompt"
        : composerPrimaryAction === "stop-live"
          ? "stop-live"
        : "live-toggle";
  const composerPrimaryActionLabel =
    composerPrimaryAction === "stop-turn"
      ? strings.actions.stop
      : composerPrimaryAction === "send"
        ? strings.actions.send
        : composerPrimaryAction === "stop-live"
          ? strings.actions.stopLive
          : strings.actions.live;
  const composerPrimaryActionDisabled =
    composerPrimaryAction === "send"
      ? !canSendMessage
      : composerPrimaryAction === "stop-turn"
        ? false
        : state.pendingAction === "voice" || state.voiceInputActive;
  const composerPrimaryActionClass = [
    "send-button",
    composerPrimaryAction === "stop-turn" ? "stop" : "",
    composerPrimaryAction === "start-live" || composerPrimaryAction === "stop-live" ? "live" : "",
    composerPrimaryAction === "stop-live" ? "live-active" : "",
  ]
    .filter(Boolean)
    .join(" ");
  const composerPrimaryActionIcon =
    composerPrimaryAction === "stop-turn"
      ? renderUiIcon("stop")
      : composerPrimaryAction === "send"
        ? renderUiIcon("send")
        : renderUiIcon("audio-lines");
  const composerPrimaryActionContent =
    composerPrimaryAction === "stop-live"
      ? `<span class="live-button-icon">${composerPrimaryActionIcon}</span><span class="live-button-label">${escapeHtml(strings.actions.stopLive)}</span>`
      : composerPrimaryActionIcon;
  const quickInteractionLocked = isQuickInteractionLocked({
    turnActive: currentTurnActive,
    promptActivityActive: Boolean(state.promptActivity),
  });
  const selectedModelOption = getSelectedModelOption();
  const isEmptyChat = state.activeView === "chat" && state.messages.length === 0;
  const showAuthOnboarding = shouldShowAuthOnboarding(state.accountStatus);
  const showUsageNoticeOnboarding = shouldShowUsageNoticeOnboarding({
    accountStatus: state.accountStatus,
    usageNoticeAccepted: state.settings.usageNoticeAccepted,
  });
  const showOnboarding = showAuthOnboarding || showUsageNoticeOnboarding;
  const scrollState = captureScrollPositions();
  const composerState = captureComposerRenderState();

  syncDocumentLanguage();
  root.innerHTML = `
    <div class="shell ${isEmptyChat ? "shell-empty-chat" : ""} ${showOnboarding ? "shell-onboarding" : ""}">
      ${
        showOnboarding
          ? ""
          : `<header class="topbar">
        <span class="topbar-spacer" aria-hidden="true"></span>
        <div class="top-actions">
          ${renderTopQuickActions(quickInteractionLocked)}
          <span class="top-quick-separator" aria-hidden="true"></span>
          <button
            id="app-menu-toggle"
            class="icon-button app-menu-toggle ${state.appMenuOpen ? "active" : ""}"
            title="${escapeAttribute(getAppMenuLabels(state.uiLocale).menu)}"
            aria-label="${escapeAttribute(getAppMenuLabels(state.uiLocale).menu)}"
            aria-haspopup="menu"
            aria-expanded="${state.appMenuOpen ? "true" : "false"}"
          >${renderAppMenuDotsIcon()}</button>
          ${state.appMenuOpen ? renderAppMenu(isPopup, false) : ""}
          <button id="new-chat" class="icon-button" title="${escapeAttribute(strings.newChat)}" aria-label="${escapeAttribute(strings.newChat)}">${renderUiIcon("plus")}</button>
          <button
            id="${isPopup ? "dock-chat" : "popout-chat"}"
            class="icon-button"
            title="${escapeAttribute(isPopup ? strings.dock : strings.popOut)}"
            aria-label="${escapeAttribute(isPopup ? strings.dock : strings.popOut)}"
          >${renderPanelModeIcon(isPopup)}</button>
        </div>
      </header>`
      }
      ${renderFloatingNotifications()}
      ${renderPendingPermissionPrompt(strings)}

      <main class="main-stage ${isEmptyChat ? "empty" : ""} ${showOnboarding ? "onboarding" : ""}">
        ${
          showAuthOnboarding
            ? renderAuthOnboarding(strings)
            : showUsageNoticeOnboarding
              ? renderUsageNoticeOnboarding(strings)
            : state.activeView === "chat"
            ? renderChatView(strings)
            : state.activeView === "context"
              ? renderContextView(strings)
              : renderWorkspaceView(strings)
        }
      </main>

      ${
        showAuthOnboarding
          || showUsageNoticeOnboarding
          ? ""
          : `<footer class="composer-shell ${composerSuggestionsOpen ? "has-suggestions" : ""}">
        ${state.activeView === "chat" && !isEmptyChat ? renderScrollToBottomButton() : ""}
        ${state.activeView === "chat" ? renderPinnedActionSuggestions(strings, quickInteractionLocked) : ""}
        <div class="composer-frame ${composerSuggestionsOpen ? "has-suggestions" : ""} ${state.composerDragActive ? "drag-active" : ""}">
          <input id="file-attachment-input" type="file" multiple hidden />
          ${state.attachmentMenuOpen ? renderAttachmentMenu(strings) : ""}
          ${
            state.composerDragActive
              ? `<div class="composer-drop-hint" aria-hidden="true">${escapeHtml(strings.help.dropAttachments)}</div>`
              : ""
          }
          ${
            state.voiceInputActive
              ? renderComposerDictationPanel(strings)
              : `${
                  hasComposerContextReferences()
                    ? `<div class="composer-tray">
                        <div class="context-summary composer-context-summary">
                          ${renderAttachedContextSummary(strings)}
                        </div>
                      </div>`
                    : ""
                }
                <div class="composer-input-row ${getComposerInputRowClasses()}">
                  ${renderComposerCommandPills()}
                  <textarea id="composer" rows="1" placeholder="${escapeAttribute(strings.composerPlaceholder)}">${escapeHtml(state.composerDraft)}</textarea>
                </div>
              ${
                state.slashQuery !== null
                  ? renderSlashCommandPopover(strings, slashOptions, clampSlashCommandIndex(state.slashActiveIndex, slashOptions.length))
                  : state.mentionQuery !== null
                    ? renderMentionTabPicker(strings, tabMentionOptions, mentionOptions)
                    : ""
              }
                <div class="composer-bar composer-control-bar">
                  <div class="composer-tools">
                    <button
                      class="icon-button composer-attach-button"
                      id="attach-files"
                      aria-expanded="${state.attachmentMenuOpen ? "true" : "false"}"
                      title="${escapeAttribute(strings.actions.attachFiles)}"
                      aria-label="${escapeAttribute(strings.actions.attachFiles)}"
                    >${renderUiIcon("plus")}</button>
                    ${renderComposerBrowserActionPermissionControl(strings)}
                  </div>
                  <div class="composer-submit">
                    ${renderComposerModelDropdownControl(strings, selectedModelOption)}
                    <button
                      id="voice-input-toggle"
                      class="icon-button composer-voice-toggle"
                      title="${escapeAttribute(strings.actions.voiceInput)}"
                      aria-label="${escapeAttribute(strings.actions.voiceInput)}"
                      aria-pressed="false"
                      ${state.voiceEnabled || state.pendingAction === "voice" ? "disabled" : ""}
                    >
                      ${renderUiIcon("mic")}
                    </button>
                    <button
                      id="${composerPrimaryActionId}"
                      class="${composerPrimaryActionClass}"
                      aria-label="${escapeAttribute(composerPrimaryActionLabel)}"
                      title="${escapeAttribute(composerPrimaryActionLabel)}"
                      ${composerPrimaryActionDisabled ? "disabled" : ""}
                    >
                      ${composerPrimaryActionContent}
                    </button>
                  </div>
                </div>`
          }
        </div>
      </footer>`
      }
      ${renderImageAnnotationEditor(strings)}
      ${renderProfileEditorModal(strings)}
      ${renderNativeDialogs(strings)}
    </div>
  `;

  bindEvents();
  scheduleFloatingNotificationDismiss();
  restoreScrollPositions(scrollState);
  updateScrollToBottomButtonVisibility();
  restoreComposerRenderState(composerState);
}

function renderFloatingNotifications(): string {
  const notifications = [
    state.initError
      ? `<p class="error-banner notification-toast" role="alert">${escapeHtml(state.initError)}</p>`
      : "",
    state.actionStatus
      ? `<p class="status-banner notification-toast" role="status">${escapeHtml(state.actionStatus)}</p>`
      : "",
  ].filter(Boolean);

  if (!notifications.length) {
    return "";
  }

  return `
    <div class="notification-stack" aria-live="polite" aria-atomic="true">
      ${notifications.join("")}
    </div>
  `;
}

function scheduleFloatingNotificationDismiss(): void {
  const signature = `${state.initError}\n${state.actionStatus}`.trim();
  if (!signature) {
    clearFloatingNotificationTimer();
    notificationAutoDismissSignature = "";
    return;
  }

  if (signature === notificationAutoDismissSignature && notificationAutoDismissTimer !== null) {
    return;
  }

  clearFloatingNotificationTimer();
  notificationAutoDismissSignature = signature;
  const initErrorSnapshot = state.initError;
  const actionStatusSnapshot = state.actionStatus;
  const dismissDelay = state.initError ? 6_000 : 2_600;
  notificationAutoDismissTimer = window.setTimeout(() => {
    notificationAutoDismissTimer = null;
    notificationAutoDismissSignature = "";
    if (state.initError === initErrorSnapshot) {
      state.initError = "";
    }
    if (state.actionStatus === actionStatusSnapshot) {
      state.actionStatus = "";
    }
    render();
  }, dismissDelay);
}

function clearFloatingNotificationTimer(): void {
  if (notificationAutoDismissTimer === null) {
    return;
  }
  window.clearTimeout(notificationAutoDismissTimer);
  notificationAutoDismissTimer = null;
}

function installGlobalFloatingSurfaceDismissal(): void {
  document.addEventListener(
    "pointerdown",
    (event) => {
      const target = event.target;
      if (!(target instanceof Element) || !hasOpenFloatingSurface()) {
        return;
      }
      if (isInsideFloatingSurfaceInteraction(target)) {
        return;
      }
      if (closeFloatingSurfaces()) {
        renderSync();
      }
    },
    { capture: true },
  );

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.nativeTextDialog) {
      event.preventDefault();
      closeNativeTextDialog();
      return;
    }
    if (event.key === "Escape" && state.nativeConfirmationDialog) {
      event.preventDefault();
      resolveNativeConfirmation(false);
      return;
    }
    if (event.key !== "Escape" || !hasOpenFloatingSurface()) {
      return;
    }
    event.preventDefault();
    if (closeFloatingSurfaces()) {
      renderSync();
    }
  });
}

function hasOpenFloatingSurface(): boolean {
  return Boolean(
    state.mentionQuery !== null ||
      state.slashQuery !== null ||
      state.attachmentMenuOpen ||
      state.browserActionPermissionMenuOpen ||
      state.composerModelMenuOpen ||
      state.appMenuOpen,
  );
}

function isInsideFloatingSurfaceInteraction(target: Element): boolean {
  if (state.appMenuOpen && target.closest("#app-menu-toggle, .app-menu")) {
    return true;
  }

  const composerSurfaceOpen = Boolean(
    state.mentionQuery !== null ||
      state.slashQuery !== null ||
      state.attachmentMenuOpen ||
      state.browserActionPermissionMenuOpen ||
      state.composerModelMenuOpen,
  );
  if (!composerSurfaceOpen) {
    return false;
  }

  return Boolean(
    target.closest(
      [
        ".composer-frame",
        ".suggestions",
        ".attachment-menu",
        ".composer-permission-group",
        ".composer-permission-menu",
        ".composer-model-reasoning-group",
        ".composer-model-dropdown",
      ].join(","),
    ),
  );
}

function closeFloatingSurfaces(): boolean {
  const wasOpen = hasOpenFloatingSurface();
  state.mentionQuery = null;
  state.slashQuery = null;
  state.slashActiveIndex = 0;
  state.attachmentMenuOpen = false;
  state.browserActionPermissionMenuOpen = false;
  state.composerModelMenuOpen = false;
  state.appMenuOpen = false;
  return wasOpen;
}

function renderAppMenu(isPopup: boolean, disabled = false): string {
  const labels = getAppMenuLabels(state.uiLocale);
  const recentChats = listAppMenuRecentChats(state.recentChats, state.appMenuRecentChatLimit);
  const moreVisible = hasAppMenuMoreRecentChats(state.recentChats, state.appMenuRecentChatLimit);
  const disabledAttribute = disabled ? "disabled" : "";
  return `
    <div class="app-menu" role="menu" aria-label="${escapeAttribute(labels.menu)}">
      <section class="app-menu-section" aria-label="${escapeAttribute(labels.recentChats)}">
        <div class="app-menu-section-header">
          <p class="app-menu-title">${escapeHtml(labels.recentChats)}</p>
          ${
            recentChats.length
              ? `<button
                  class="app-menu-clear-button"
                  type="button"
                  data-clear-chat-history="1"
                  aria-label="${escapeAttribute(labels.clearRecentChats)}"
                  title="${escapeAttribute(labels.clearRecentChats)}"
                  ${disabledAttribute}
                >${escapeHtml(labels.clearRecentChats)}</button>`
              : ""
          }
        </div>
        ${
          recentChats.length
            ? recentChats
                .map(
                  (chat) => `
                    <div class="app-menu-chat-row">
                      <button
                        class="app-menu-row recent-chat ${chat.id === state.currentConversationId ? "selected" : ""}"
                        data-chat-id="${escapeAttribute(chat.id)}"
                        role="menuitem"
                        ${disabledAttribute}
                      >
                        <span class="app-menu-icon list" aria-hidden="true">${renderAppMenuListIcon()}</span>
                        <span class="app-menu-label">${escapeHtml(chat.title || labels.chat)}</span>
                      </button>
                      <button
                        class="app-menu-delete-button"
                        type="button"
                        data-delete-chat-id="${escapeAttribute(chat.id)}"
                        aria-label="${escapeAttribute(labels.deleteChat)}"
                        title="${escapeAttribute(labels.deleteChat)}"
                        ${disabledAttribute}
                      >${renderUiIcon("x")}</button>
                    </div>
                  `,
                )
                .join("")
            : `<p class="app-menu-empty">${escapeHtml(labels.noRecentChats)}</p>`
        }
        ${
          moreVisible
            ? `<button class="app-menu-row" data-menu-action="show-more-recent-chats" role="menuitem" ${disabledAttribute}>
                <span class="app-menu-icon" aria-hidden="true">${renderUiIcon("more-horizontal")}</span>
                <span class="app-menu-label">${escapeHtml(labels.more)}</span>
                <span class="app-menu-chevron" aria-hidden="true">${renderUiIcon("chevron-down")}</span>
              </button>`
            : ""
        }
      </section>
      <div class="app-menu-divider" role="separator"></div>
      <button class="app-menu-row" data-menu-view="chat" role="menuitem" ${disabledAttribute}>
        <span class="app-menu-icon" aria-hidden="true">${renderAppMenuChatIcon()}</span>
        <span class="app-menu-label">${escapeHtml(labels.chat)}</span>
      </button>
      <button class="app-menu-row" data-menu-action="compact" role="menuitem" ${!disabled && state.threadId && !isCurrentTurnActive() ? "" : "disabled"}>
        <span class="app-menu-icon list" aria-hidden="true">${renderAppMenuListIcon()}</span>
        <span class="app-menu-label">${escapeHtml(labels.compactConversation)}</span>
      </button>
      <button class="app-menu-row" data-menu-view="context" role="menuitem" ${disabledAttribute}>
        <span class="app-menu-icon" aria-hidden="true">${renderAppMenuContextIcon()}</span>
        <span class="app-menu-label">${escapeHtml(labels.context)}</span>
        <span class="app-menu-chevron" aria-hidden="true">${renderUiIcon("chevron-right")}</span>
      </button>
      <button class="app-menu-row" data-menu-view="workspace" role="menuitem" ${disabledAttribute}>
        <span class="app-menu-icon" aria-hidden="true">${renderAppMenuSettingsIcon()}</span>
        <span class="app-menu-label">${escapeHtml(labels.settingsHelp)}</span>
        <span class="app-menu-chevron" aria-hidden="true">${renderUiIcon("chevron-right")}</span>
      </button>
    </div>
  `;
}

const BROWSER_ACTION_PERMISSION_MODES: BrowserActionPermissionMode[] = ["ask", "auto-review", "full"];

function normalizeBrowserActionPermissionMode(value: unknown): BrowserActionPermissionMode {
  return value === "auto-review" || value === "full" || value === "ask" ? value : "ask";
}

function getBrowserActionPermissionMode(): BrowserActionPermissionMode {
  return normalizeBrowserActionPermissionMode(state.settings.browserActionPermissionMode);
}

function getBrowserActionPermissionCopy(
  mode: BrowserActionPermissionMode,
  strings: ReturnType<typeof getUiStrings>,
): { label: string; description: string; icon: UiIconName } {
  switch (mode) {
    case "full":
      return {
        label: strings.permissions.fullPermissions,
        description: strings.permissions.fullPermissionsDescription,
        icon: "shield-alert",
      };
    case "auto-review":
      return {
        label: strings.permissions.autoReviewPermissions,
        description: strings.permissions.autoReviewPermissionsDescription,
        icon: "shield-check",
      };
    case "ask":
    default:
      return {
        label: strings.permissions.basicPermissions,
        description: strings.permissions.basicPermissionsDescription,
        icon: "hand",
      };
  }
}

function renderComposerBrowserActionPermissionControl(strings: ReturnType<typeof getUiStrings>): string {
  const mode = getBrowserActionPermissionMode();
  const copy = getBrowserActionPermissionCopy(mode, strings);
  const menu = state.browserActionPermissionMenuOpen ? renderBrowserActionPermissionDropdown(strings, mode) : "";

  return `
    <div class="composer-permission-group ${state.browserActionPermissionMenuOpen ? "open" : ""}">
      <button
        id="composer-permission-menu-trigger"
        class="composer-permission-menu-trigger ${mode}"
        type="button"
        aria-haspopup="menu"
        aria-expanded="${state.browserActionPermissionMenuOpen ? "true" : "false"}"
        aria-label="${escapeAttribute(strings.permissions.browserActionsToggle)}"
        title="${escapeAttribute(copy.description)}"
      >
        <span class="permission-mode-glyph" aria-hidden="true">${renderUiIcon(copy.icon)}</span>
        <span class="permission-mode-label">${escapeHtml(copy.label)}</span>
        <span class="composer-select-caret" aria-hidden="true">${renderChevronDownIcon()}</span>
      </button>
      ${menu}
    </div>
  `;
}

function renderBrowserActionPermissionDropdown(
  strings: ReturnType<typeof getUiStrings>,
  selectedMode = getBrowserActionPermissionMode(),
): string {
  return `
    <div class="composer-permission-menu" role="menu" aria-label="${escapeAttribute(strings.permissions.browserActionsToggle)}">
      ${BROWSER_ACTION_PERMISSION_MODES.map((mode) => {
        const copy = getBrowserActionPermissionCopy(mode, strings);
        const selected = mode === selectedMode;
        return `
          <button
            class="composer-permission-menu-row ${mode} ${selected ? "selected" : ""}"
            type="button"
            role="menuitemradio"
            aria-checked="${selected ? "true" : "false"}"
            data-browser-action-permission-mode="${escapeAttribute(mode)}"
          >
            <span class="permission-mode-glyph" aria-hidden="true">${renderUiIcon(copy.icon)}</span>
            <span class="composer-permission-menu-copy">
              <strong>${escapeHtml(copy.label)}</strong>
              <span>${escapeHtml(copy.description)}</span>
            </span>
            ${selected ? `<span class="composer-model-menu-check" aria-hidden="true">${renderUiIcon("check")}</span>` : ""}
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderBrowserActionPermissionSettings(strings: ReturnType<typeof getUiStrings>): string {
  const selectedMode = getBrowserActionPermissionMode();
  return `
    <div class="browser-action-permission-control" id="setting-browser-action-permission-mode">
      ${BROWSER_ACTION_PERMISSION_MODES.map((mode) => {
        const copy = getBrowserActionPermissionCopy(mode, strings);
        const selected = mode === selectedMode;
        return `
          <button
            class="browser-action-permission-option ${mode} ${selected ? "selected" : ""}"
            type="button"
            aria-pressed="${selected ? "true" : "false"}"
            data-browser-action-permission-mode="${escapeAttribute(mode)}"
          >
            <span class="permission-mode-glyph" aria-hidden="true">${renderUiIcon(copy.icon)}</span>
            <span>
              <strong>${escapeHtml(copy.label)}</strong>
              <small>${escapeHtml(copy.description)}</small>
            </span>
          </button>
        `;
      }).join("")}
    </div>
  `;
}

function renderTopQuickActions(disabled = false): string {
  const ko = state.uiLocale === "ko";
  const disabledAttribute = disabled ? "disabled" : "";
  const summarizeTitle = ko ? "현재 페이지 요약" : "Summarize current page";
  const infographicTitle = ko ? "현재 페이지로 인포그래픽 만들기" : "Create infographic from current page";

  return `
    <div class="top-quick-actions" aria-label="${escapeAttribute(ko ? "퀵 메뉴" : "Quick actions")}">
      <button
        class="top-quick-action"
        type="button"
        data-top-quick-action="summarize-page"
        data-tooltip="${escapeAttribute(summarizeTitle)}"
        title="${escapeAttribute(summarizeTitle)}"
        aria-label="${escapeAttribute(summarizeTitle)}"
        ${disabledAttribute}
      >
        <span class="top-quick-action-icon top-quick-summary-icon" aria-hidden="true">
          ${renderUiIcon("menu")}
        </span>
      </button>
      <button
        class="top-quick-action infographic"
        type="button"
        data-top-quick-action="infographic"
        data-tooltip="${escapeAttribute(infographicTitle)}"
        title="${escapeAttribute(infographicTitle)}"
        aria-label="${escapeAttribute(infographicTitle)}"
        ${disabledAttribute}
      >
        <span class="top-quick-action-icon top-quick-chart-icon" aria-hidden="true">
          ${renderUiIcon("chart")}
        </span>
      </button>
    </div>
  `;
}

function renderAppMenuDotsIcon(): string {
  return renderUiIcon("more-vertical");
}

function renderAppMenuListIcon(): string {
  return renderUiIcon("list");
}

function renderAppMenuChatIcon(): string {
  return renderUiIcon("message");
}

function renderAppMenuContextIcon(): string {
  return renderUiIcon("panel");
}

function renderAppMenuSettingsIcon(): string {
  return renderUiIcon("settings");
}

function renderAuthOnboarding(strings: ReturnType<typeof getUiStrings>): string {
  return `
    <section class="auth-onboarding" aria-labelledby="auth-onboarding-title">
      <div class="auth-onboarding-card">
        <div class="auth-onboarding-icon" aria-hidden="true"></div>
        <div class="auth-onboarding-copy">
          <h1 id="auth-onboarding-title">${escapeHtml(strings.onboarding.title)}</h1>
          <p>${escapeHtml(strings.onboarding.subtitle)}</p>
        </div>
        <div class="auth-onboarding-actions">
          <button id="onboarding-chatgpt-login" class="auth-onboarding-primary" type="button">
            ${escapeHtml(strings.onboarding.chatgptCta)}
          </button>
          <button id="onboarding-apikey-login" class="auth-onboarding-link" type="button">
            ${escapeHtml(strings.onboarding.apiCta)}
          </button>
        </div>
        <p class="auth-onboarding-note">${escapeHtml(strings.onboarding.bridgeNote)}</p>
        <p class="auth-onboarding-privacy">${escapeHtml(strings.onboarding.privacyNote)}</p>
      </div>
    </section>
  `;
}

function renderUsageNoticeOnboarding(strings: ReturnType<typeof getUiStrings>): string {
  const items = [
    {
      icon: "panel" as const,
      title: strings.usageNotice.contextTitle,
      body: strings.usageNotice.contextBody,
    },
    {
      icon: "shield-check" as const,
      title: strings.usageNotice.sensitiveTitle,
      body: strings.usageNotice.sensitiveBody,
    },
    {
      icon: "hand" as const,
      title: strings.usageNotice.permissionsTitle,
      body: strings.usageNotice.permissionsBody,
    },
    {
      icon: "scan" as const,
      title: strings.usageNotice.safetyTitle,
      body: strings.usageNotice.safetyBody,
    },
    {
      icon: "code" as const,
      title: strings.usageNotice.openSourceTitle,
      body: strings.usageNotice.openSourceBody,
    },
  ];

  return `
    <section class="usage-notice-onboarding" aria-labelledby="usage-notice-title">
      <div class="usage-notice-shell">
        <div class="usage-notice-hero" aria-hidden="true">
          <span class="usage-notice-chrome-dot"></span>
          <span class="usage-notice-plus">+</span>
          <span class="usage-notice-codex-icon"></span>
        </div>
        <div class="usage-notice-copy">
          <p class="usage-notice-eyebrow">${escapeHtml(strings.usageNotice.eyebrow)}</p>
          <h1 id="usage-notice-title">${escapeHtml(strings.usageNotice.title)}</h1>
          <p>${escapeHtml(strings.usageNotice.subtitle)}</p>
        </div>
        <div class="usage-notice-card">
          ${items
            .map(
              (item) => `
                <article class="usage-notice-item">
                  <span class="usage-notice-item-icon" aria-hidden="true">${renderUiIcon(item.icon)}</span>
                  <span>
                    <strong>${escapeHtml(item.title)}</strong>
                    <span>${escapeHtml(item.body)}</span>
                  </span>
                </article>
              `,
            )
            .join("")}
        </div>
        <button class="usage-notice-primary" type="button" data-usage-notice-accept>
          ${escapeHtml(strings.usageNotice.startCta)}
        </button>
        <p class="usage-notice-disclaimer">${escapeHtml(strings.usageNotice.disclaimer)}</p>
      </div>
    </section>
  `;
}

function renderPendingPermissionPrompt(strings: ReturnType<typeof getUiStrings>): string {
  if (!state.pendingPermission) {
    return "";
  }

  const message = toUserFacingPermissionRationale(state.pendingPermission.plan.rationale);
  const detail = state.pendingPermission.errorMessage
    ? state.uiLocale === "ko"
      ? `Chrome이 자동 권한 요청을 열지 못했습니다: ${state.pendingPermission.errorMessage}`
      : `Chrome could not open the permission prompt automatically: ${state.pendingPermission.errorMessage}`
    : state.pendingPermission.retryMessage
      ? state.uiLocale === "ko"
        ? "권한을 허용하면 방금 요청을 자동으로 다시 전송합니다."
        : "Allow access and Codex will retry the request automatically."
    : state.uiLocale === "ko"
      ? "아래 버튼을 눌러 Chrome 권한 프롬프트를 직접 여세요."
      : "Click the button below to open the Chrome permission prompt.";

  return `
    <section class="permission-prompt" role="status">
      <div>
        <strong>${escapeHtml(message)}</strong>
        <span>${escapeHtml(detail)}</span>
      </div>
      <button id="grant-pending-permission" class="permission-prompt-button" type="button">
        ${escapeHtml(strings.actions.grantSiteAccess)}
      </button>
    </section>
  `;
}

function renderNativeDialogs(strings: ReturnType<typeof getUiStrings>): string {
  return [renderNativeTextDialog(strings), renderNativeConfirmationDialog()].filter(Boolean).join("");
}

function renderNativeTextDialog(strings: ReturnType<typeof getUiStrings>): string {
  const dialog = state.nativeTextDialog;
  if (!dialog) {
    return "";
  }

  return `
    <div class="native-dialog-backdrop" role="presentation" data-native-text-backdrop>
      <form class="native-dialog-modal" role="dialog" aria-modal="true" aria-labelledby="native-text-dialog-title" data-native-text-dialog>
        <header class="native-dialog-header">
          <div>
            <h2 id="native-text-dialog-title">${escapeHtml(dialog.title)}</h2>
            <p>${escapeHtml(dialog.description)}</p>
          </div>
          <button class="icon-button native-dialog-close" type="button" data-native-text-cancel aria-label="${escapeAttribute(dialog.cancelLabel)}">
            ${renderUiIcon("x")}
          </button>
        </header>
        <label class="native-dialog-field">
          <span>${escapeHtml(dialog.label)}</span>
          <input
            id="native-text-input"
            class="native-dialog-input"
            type="${escapeAttribute(dialog.inputType)}"
            placeholder="${escapeAttribute(dialog.placeholder)}"
            autocomplete="off"
            spellcheck="false"
            ${dialog.submitting ? "disabled" : ""}
          />
        </label>
        ${dialog.error ? `<p class="native-dialog-error" role="alert">${escapeHtml(dialog.error)}</p>` : ""}
        <footer class="native-dialog-actions">
          <button class="settings-compact-button" type="button" data-native-text-cancel ${dialog.submitting ? "disabled" : ""}>${escapeHtml(
            dialog.cancelLabel,
          )}</button>
          <button class="settings-compact-button primary" type="submit" ${dialog.submitting ? "disabled" : ""}>${escapeHtml(
            dialog.submitting ? strings.actions.starting : dialog.confirmLabel,
          )}</button>
        </footer>
      </form>
    </div>
  `;
}

function renderNativeConfirmationDialog(): string {
  const dialog = state.nativeConfirmationDialog;
  if (!dialog) {
    return "";
  }

  return `
    <div class="native-dialog-backdrop" role="presentation" data-native-confirmation-backdrop>
      <section class="native-dialog-modal ${dialog.tone === "danger" ? "danger" : ""}" role="dialog" aria-modal="true" aria-labelledby="native-confirmation-title">
        <header class="native-dialog-header">
          <div>
            <h2 id="native-confirmation-title">${escapeHtml(dialog.title)}</h2>
            <p>${escapeHtml(dialog.message)}</p>
          </div>
        </header>
        <footer class="native-dialog-actions">
          <button class="settings-compact-button" type="button" id="native-confirmation-cancel">${escapeHtml(dialog.cancelLabel)}</button>
          <button class="settings-compact-button primary" type="button" id="native-confirmation-approve">${escapeHtml(dialog.confirmLabel)}</button>
        </footer>
      </section>
    </div>
  `;
}

function renderComposerModelDropdownControl(
  strings: ReturnType<typeof getUiStrings>,
  selectedModelOption: CodexModelOption | null,
): string {
  const efforts = selectedModelOption?.reasoningEfforts ?? DEFAULT_REASONING_EFFORTS;
  const selectedEffort = normalizeReasoningEffort(
    state.selectedReasoningEffort,
    efforts,
    selectedModelOption?.defaultReasoningEffort ?? "",
  );
  const selectedServiceTier = normalizeServiceTier(
    state.selectedServiceTier,
    selectedModelOption?.additionalSpeedTiers ?? [],
  );
  const modelLabel = renderModelChipLabel(strings, selectedModelOption);
  const compactModelLabel = formatCompactModelLabel(modelLabel);
  const reasoningLabel = selectedEffort ? formatReasoningEffortLabel(selectedEffort, state.uiLocale) : "";
  const speedTierActive = isSpeedServiceTier(selectedServiceTier);

  return `
    <div class="composer-model-reasoning-group ${state.composerModelMenuOpen ? "open" : ""}">
      <button
        id="composer-model-menu-trigger"
        class="composer-model-menu-trigger"
        type="button"
        aria-haspopup="menu"
        aria-expanded="${state.composerModelMenuOpen ? "true" : "false"}"
        aria-label="${escapeAttribute(`${strings.labels.currentModel}: ${modelLabel}. ${strings.labels.reasoningEffort}: ${reasoningLabel}`)}"
      >
        ${state.modelCatalogState === "loading" ? `<span class="composer-model-spinner" aria-hidden="true"></span>` : ""}
        ${speedTierActive ? `<span class="composer-model-flash" aria-hidden="true">${renderComposerLightningIcon()}</span>` : ""}
        <span class="composer-model-trigger-label">${escapeHtml(compactModelLabel)}</span>
        ${reasoningLabel ? `<span class="composer-model-trigger-effort">${escapeHtml(reasoningLabel)}</span>` : ""}
        <span class="composer-select-caret" aria-hidden="true">${renderChevronDownIcon()}</span>
      </button>
      ${
        state.composerModelMenuOpen
          ? renderComposerModelDropdown(strings, selectedModelOption, selectedEffort, efforts, selectedServiceTier)
          : ""
      }
    </div>
  `;
}

function isSpeedServiceTier(serviceTier: string): boolean {
  return serviceTier === "fast";
}

function renderComposerLightningIcon(): string {
  return renderUiIcon("zap");
}

function renderChevronDownIcon(): string {
  return renderUiIcon("chevron-down");
}

function renderComposerModelDropdown(
  strings: ReturnType<typeof getUiStrings>,
  selectedModelOption: CodexModelOption | null,
  selectedEffort: string,
  efforts: string[],
  selectedServiceTier: string,
): string {
  const intelligenceLabel = state.uiLocale === "ko" ? "인텔리전스" : "Intelligence";
  const speedLabel = state.uiLocale === "ko" ? "속도" : "Speed";
  const modelSectionLabel = state.uiLocale === "ko" ? "모델" : "Model";
  const reasoningDescriptions = new Map(
    (selectedModelOption?.reasoningEffortOptions ?? []).map((option) => [option.effort, option.description]),
  );
  const speedTiers = selectedModelOption?.additionalSpeedTiers ?? [];
  const unavailableLabel = renderModelChipLabel(strings, selectedModelOption);
  const modelRows =
    state.modelCatalogState === "ready" && state.models.length
      ? state.models
          .map((model) => renderComposerModelMenuRow(model, selectedModelOption, strings))
          .join("")
      : `
          <div class="composer-model-menu-row disabled" data-composer-model-row>
            <span class="composer-model-menu-copy">
              <strong>${escapeHtml(unavailableLabel)}</strong>
              ${state.modelCatalogErrorMessage ? `<span>${escapeHtml(state.modelCatalogErrorMessage)}</span>` : ""}
            </span>
          </div>
        `;

  return `
    <div class="composer-model-dropdown" role="menu" aria-label="${escapeAttribute(strings.labels.currentModel)}">
      <section class="composer-model-menu-section" aria-label="${escapeAttribute(intelligenceLabel)}">
        <p class="composer-model-menu-title">${escapeHtml(intelligenceLabel)}</p>
        ${efforts
          .map((effort) => {
            const selected = effort === selectedEffort;
            return `
              <button
                class="composer-model-menu-row reasoning ${selected ? "selected" : ""}"
                type="button"
                role="menuitemradio"
                aria-checked="${selected ? "true" : "false"}"
                data-composer-reasoning-option="${escapeAttribute(effort)}"
              >
                <span class="composer-model-menu-copy">
                  <strong>${escapeHtml(formatReasoningEffortLabel(effort, state.uiLocale))}</strong>
                  ${reasoningDescriptions.get(effort) ? `<span>${escapeHtml(reasoningDescriptions.get(effort) ?? "")}</span>` : ""}
                </span>
                ${selected ? `<span class="composer-model-menu-check" aria-hidden="true">${renderUiIcon("check")}</span>` : ""}
              </button>
            `;
          })
          .join("")}
      </section>
      ${
        speedTiers.length
          ? `
            <div class="composer-model-menu-divider" role="separator"></div>
            <section class="composer-model-menu-section" aria-label="${escapeAttribute(speedLabel)}">
              <p class="composer-model-menu-title">${escapeHtml(speedLabel)}</p>
              ${["", ...speedTiers]
                .map((tier) => {
                  const selected = tier === selectedServiceTier;
                  const speedTier = isSpeedServiceTier(tier);
                  return `
                    <button
                      class="composer-model-menu-row speed ${speedTier ? "has-icon" : ""} ${selected ? "selected" : ""}"
                      type="button"
                      role="menuitemradio"
                      aria-checked="${selected ? "true" : "false"}"
                      data-composer-service-tier="${escapeAttribute(tier)}"
                    >
                      ${speedTier ? `<span class="composer-model-menu-speed-icon" aria-hidden="true">${renderComposerLightningIcon()}</span>` : ""}
                      <span class="composer-model-menu-copy">
                        <strong>${escapeHtml(formatServiceTierLabel(tier, state.uiLocale))}</strong>
                      </span>
                      ${selected ? `<span class="composer-model-menu-check" aria-hidden="true">${renderUiIcon("check")}</span>` : ""}
                    </button>
                  `;
                })
                .join("")}
            </section>
          `
          : ""
      }
      <div class="composer-model-menu-divider" role="separator"></div>
      <section class="composer-model-menu-section" aria-label="${escapeAttribute(modelSectionLabel)}">
        <p class="composer-model-menu-title">${escapeHtml(modelSectionLabel)}</p>
        ${modelRows}
      </section>
    </div>
  `;
}

function renderComposerModelMenuRow(
  model: CodexModelOption,
  selectedModelOption: CodexModelOption | null,
  strings: ReturnType<typeof getUiStrings>,
): string {
  const selected = model.id === (selectedModelOption?.id ?? "");
  const description = model.description || (model.isDefault ? strings.labels.defaultModel : model.id);
  return `
    <button
      class="composer-model-menu-row model ${selected ? "selected" : ""}"
      type="button"
      role="menuitemradio"
      aria-checked="${selected ? "true" : "false"}"
      data-composer-model-row
      data-composer-model-option="${escapeAttribute(model.id)}"
    >
      <span class="composer-model-menu-copy">
        <strong>${escapeHtml(model.label)}</strong>
        <span>${escapeHtml(description)}</span>
      </span>
      ${selected ? `<span class="composer-model-menu-check" aria-hidden="true">${renderUiIcon("check")}</span>` : `<span class="composer-model-menu-chevron" aria-hidden="true">${renderUiIcon("chevron-right")}</span>`}
    </button>
  `;
}

function formatCompactModelLabel(label: string): string {
  const trimmed = label.trim();
  const gptMatch = /^gpt[-\s]*([0-9]+(?:\.[0-9]+)?)(?:[-\s]*(.+))?$/i.exec(trimmed);
  if (!gptMatch) {
    return trimmed;
  }

  const version = gptMatch[1] ?? trimmed;
  const variant = gptMatch[2] ?? "";
  const normalizedVariant = variant
    .replace(/^codex[-\s]*spark$/i, "Spark")
    .replace(/^codex$/i, "Codex")
    .replace(/^mini$/i, "Mini")
    .replace(/[-_]+/g, " ")
    .trim();

  return normalizedVariant ? `${version} ${normalizedVariant}` : version;
}

function renderMentionTabPicker(
  strings: ReturnType<typeof getUiStrings>,
  tabs: OpenTabContext[],
  mentionOptions: ReturnType<typeof listMentionOptions>,
): string {
  const header = renderTabMentionHeader(strings);
  const openTabsOption = mentionOptions.find((option) => option.contextId === "open-tabs");

  if (state.openTabOptionsState === "loading") {
    return `<div class="suggestions tab-mention-popover">${header}<div class="tab-mention-status">${escapeHtml(strings.status.tabPickerLoading)}</div></div>`;
  }

  if (state.openTabOptionsState === "permission" || state.openTabOptionsState === "idle") {
    return `
      <div class="suggestions tab-mention-popover">
        ${header}
        <button class="tab-mention-action" data-tab-picker-action="grant">
          <strong>${escapeHtml(openTabsOption ? `@${openTabsOption.contextId}` : strings.labels.openTabs)}</strong>
          <span>${escapeHtml(strings.status.tabPickerPermission)}</span>
        </button>
      </div>
    `;
  }

  if (state.openTabOptionsState === "error") {
    return `
      <div class="suggestions tab-mention-popover">
        ${header}
        <button class="tab-mention-action" data-tab-picker-action="grant">
          <strong>${escapeHtml(strings.actions.refresh)}</strong>
          <span>${escapeHtml(state.openTabOptionsError || strings.status.tabPickerEmpty)}</span>
        </button>
      </div>
    `;
  }

  if (tabs.length === 0) {
    return `<div class="suggestions tab-mention-popover">${header}<div class="tab-mention-status">${escapeHtml(strings.status.tabPickerEmpty)}</div></div>`;
  }

  return `
    <div class="suggestions tab-mention-popover">
      ${header}
      ${tabs
        .map((tab) => {
          const selected = state.selectedTabIds.includes(tab.tabId);
          return `
            <button
              class="tab-mention-row ${selected ? "selected" : ""}"
              data-tab-mention-id="${tab.tabId}"
              aria-pressed="${selected ? "true" : "false"}"
            >
              ${renderTabMentionIcon(tab)}
              <span class="tab-mention-copy">
                <strong>${escapeHtml(tab.title || formatTabMentionUrl(tab.url))}</strong>
                <span>${escapeHtml(formatTabMentionUrl(tab.url))}</span>
              </span>
              <span class="tab-mention-check" aria-hidden="true">${selected ? renderUiIcon("check") : ""}</span>
            </button>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderTabMentionHeader(strings: ReturnType<typeof getUiStrings>): string {
  const selectedCount = state.selectedTabIds.length;
  const doneLabel = state.uiLocale === "ko" ? "완료" : "Done";
  const countLabel =
    selectedCount > 0
      ? state.uiLocale === "ko"
        ? `${selectedCount}개 선택됨`
        : `${selectedCount} selected`
      : state.uiLocale === "ko"
        ? "여러 탭 선택 가능"
        : "Select multiple tabs";
  return `
    <div class="tab-mention-header">
      <span>${escapeHtml(strings.labels.recentTabs)}</span>
      <span class="tab-mention-header-count">${escapeHtml(countLabel)}</span>
      <button
        class="tab-mention-done"
        data-tab-mention-done
        type="button"
        ${selectedCount > 0 ? "" : "disabled"}
      >${escapeHtml(doneLabel)}</button>
    </div>
  `;
}

function renderTabMentionIcon(tab: OpenTabContext): string {
  if (tab.favIconUrl) {
    return `<span class="tab-mention-icon image"><img src="${escapeAttribute(tab.favIconUrl)}" alt="" loading="lazy" /></span>`;
  }
  return `<span class="tab-mention-icon fallback-web">${renderUiIcon("globe", "tab-reference-lucide-icon")}</span>`;
}

function renderPanelModeIcon(isPopup: boolean): string {
  return renderUiIcon(isPopup ? "panel" : "external-link");
}

function renderSlashCommandPopover(
  strings: ReturnType<typeof getUiStrings>,
  slashOptions: SlashCommandOption[],
  activeIndex: number,
): string {
  return `<div class="suggestions command-popover" role="listbox" aria-label="${escapeAttribute(strings.labels.quickSkills)}">
    ${
      slashOptions.length
        ? slashOptions
            .map(
              (option, index) =>
                `<button class="suggestion ${option.kind} ${option.active ? "active" : ""} ${
                  index === activeIndex ? "keyboard-active" : ""
                }" data-slash-option-id="${escapeAttribute(
                  option.id,
                )}" aria-selected="${index === activeIndex ? "true" : "false"}">
                  ${renderSlashCommandIcon(option)}
                  <span class="suggestion-copy">
                    <strong>${escapeHtml(option.label)}</strong>
                  </span>
                </button>`,
            )
            .join("")
        : `<div class="suggestion command-empty" role="status">
            <span class="suggestion-icon" aria-hidden="true">/</span>
            <span class="suggestion-copy">
              <strong>${escapeHtml(strings.status.slashCommandEmpty)}</strong>
              <span>${escapeHtml(strings.help.quickSkills)}</span>
            </span>
          </div>`
    }
  </div>`;
}

function renderSlashCommandIcon(option: SlashCommandOption): string {
  const visual = option.visual;
  const color = normalizeProfileColorForUi(visual?.color);
  return `
    <span class="suggestion-icon ${option.kind}" ${
      color ? `style="--profile-color: ${escapeAttribute(color)}"` : ""
    } aria-hidden="true">
      ${renderProfileIcon(visual?.icon)}
    </span>
  `;
}

function renderComposerCommandPills(): string {
  if (!state.composerCommandPills.length) {
    return "";
  }
  return state.composerCommandPills.map((pill) => renderComposerCommandPill(pill)).join("");
}

function renderComposerDictationPanel(strings: ReturnType<typeof getUiStrings>): string {
  const doneLabel = state.uiLocale === "ko" ? "완료" : "Done";
  return `
    <div class="composer-dictation-panel" role="group" aria-label="${escapeAttribute(strings.actions.voiceInput)}">
      <span class="composer-dictation-plus" aria-hidden="true">${renderUiIcon("plus")}</span>
      <div class="composer-dictation-waveform" aria-hidden="true">
        ${renderComposerVoiceWaveform()}
      </div>
      <button
        id="voice-dictation-cancel"
        class="composer-dictation-action"
        type="button"
        title="${escapeAttribute(strings.actions.cancelEdit)}"
        aria-label="${escapeAttribute(strings.actions.cancelEdit)}"
      >${renderUiIcon("x")}</button>
      <button
        id="voice-dictation-confirm"
        class="composer-dictation-action confirm"
        type="button"
        title="${escapeAttribute(doneLabel)}"
        aria-label="${escapeAttribute(doneLabel)}"
      >${renderUiIcon("check")}</button>
    </div>
  `;
}

function renderComposerVoiceWaveform(): string {
  return composerVoiceInputWaveformLevels
    .map((level, index) => {
      const normalized = Math.max(0.06, Math.min(1, level));
      return `<span class="composer-waveform-bar" style="--bar-level: ${normalized.toFixed(3)}" data-bar-index="${index}"></span>`;
    })
    .join("");
}

function getComposerInputRowClasses(): string {
  const classes: string[] = [];
  if (state.composerCommandPills.length) {
    classes.push("has-command");
  }
  if (state.composerCommandPills.some((pill) => pill.kind === "profile")) {
    classes.push("has-profile-command");
  }
  return classes.join(" ");
}

function renderComposerCommandPill(pill: ComposerCommandPill): string {
  const strings = getUiStrings(state.uiLocale);
  const visual = getProfileVisualById(pill.id);
  const color = normalizeProfileColorForUi(visual?.color);
  return `
    <span
      class="composer-command-pill ${pill.kind}"
      data-composer-command-pill="${escapeAttribute(pill.id)}"
      data-composer-command-kind="${escapeAttribute(pill.kind)}"
      ${color ? `style="--profile-color: ${escapeAttribute(color)}"` : ""}
    >
      ${renderProfileIcon(visual?.icon)}
      <span>${escapeHtml(pill.label)}</span>
      <button
        type="button"
        class="composer-command-pill-remove"
        data-remove-composer-command-pill="${escapeAttribute(pill.id)}"
        data-remove-composer-command-kind="${escapeAttribute(pill.kind)}"
        aria-label="${escapeAttribute(strings.actions.resetProfile)}"
        title="${escapeAttribute(strings.actions.resetProfile)}"
      >
        ${renderUiIcon("x")}
      </button>
    </span>
  `;
}

function renderAttachmentMenu(strings: ReturnType<typeof getUiStrings>): string {
  const items = listAttachmentMenuItems(state.uiLocale);
  return `
    <div class="attachment-menu" role="menu" aria-label="${escapeAttribute(strings.actions.attachFiles)}">
      ${items
        .map(
          (item) => `
            <button
              class="attachment-menu-item"
              data-attachment-menu-action="${escapeAttribute(item.action)}"
              role="menuitem"
            >
              ${renderAttachmentMenuIcon(item.icon)}
              <span>${escapeHtml(item.label)}</span>
            </button>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderAttachmentMenuIcon(icon: ReturnType<typeof listAttachmentMenuItems>[number]["icon"]): string {
  const icons: Record<typeof icon, UiIconName> = {
    paperclip: "paperclip",
    video: "video",
    scan: "scan",
    bookmark: "bookmark",
  };
  return renderUiIcon(icons[icon], "attachment-menu-icon");
}

function renderPinnedActionSuggestions(strings: ReturnType<typeof getUiStrings>, disabled = false): string {
  const cards = getPinnedSuggestionCards();
  if (!cards.length) {
    return "";
  }
  const disabledAttribute = disabled ? "disabled" : "";

  return `
    <section class="site-suggestion-rail" aria-label="${escapeAttribute(strings.labels.actionCards)}">
      ${cards
        .map(
          (card) => `
            <button class="site-suggestion action-card" data-action="${escapeAttribute(card.id)}" ${disabledAttribute}>
              ${renderSuggestionCardIcon(card)}
              <span class="site-suggestion-copy">
                <strong>${escapeHtml(renderActionCardTitle(card))}</strong>
              </span>
            </button>
          `,
        )
        .join("")}
    </section>
  `;
}

function getPinnedSuggestionCards(): ActionCard[] {
  const selectedProfile = state.profiles.find((profile) => profile.id === state.selectedProfileId) ?? null;
  const profileCards = createProfileSuggestionCards({
    profile: selectedProfile,
    currentTab: state.currentTabReference,
    locale: state.uiLocale,
  });
  const customCards = inferCustomSiteSuggestionCards(
    state.currentTabReference,
    state.settings.customSiteSuggestions,
  );
  return mergeProfileAndSiteSuggestionCards(profileCards, [...customCards, ...state.actionCards], 4);
}

function renderSuggestionCardIcon(card: ActionCard): string {
  if (getSuggestionCardSource(card) === "profile") {
    const selectedProfile = state.profiles.find((profile) => profile.id === state.selectedProfileId) ?? null;
    return renderProfileSuggestionIcon(selectedProfile);
  }
  return renderSiteSuggestionIcon(state.currentTabReference);
}

function renderProfileSuggestionIcon(profile: ProfileTemplate | null): string {
  const visual = profile?.visual ?? {};
  const color = normalizeProfileColorForUi(visual.color);
  return `
    <span class="site-suggestion-site-icon profile" style="--profile-color: ${escapeAttribute(color)}" aria-hidden="true">
      ${
        visual.imageDataUrl
          ? `<img src="${escapeAttribute(visual.imageDataUrl)}" alt="" />`
          : renderProfileIcon(visual.icon ?? DEFAULT_PROFILE_VISUAL_ICON)
      }
    </span>
  `;
}

function renderSiteSuggestionIcon(tab: OpenTabContext | null): string {
  if (tab?.favIconUrl) {
    return `<span class="site-suggestion-site-icon image"><img src="${escapeAttribute(tab.favIconUrl)}" alt="" loading="lazy" /></span>`;
  }

  const url = tab?.url ?? "";
  if (isYouTubeLikeUrl(url)) {
    return `
      <span class="site-suggestion-site-icon youtube" aria-hidden="true">
        ${renderUiIcon("video")}
      </span>
    `;
  }

  const label = tab?.title || tab?.url || "Site";
  return `<span class="site-suggestion-site-icon fallback">${escapeHtml(getTabReferenceInitial(label))}</span>`;
}

function isYouTubeLikeUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./i, "");
    return hostname === "youtube.com" || hostname.endsWith(".youtube.com") || hostname === "youtu.be";
  } catch {
    return /youtube|youtu\.be/i.test(url);
  }
}

function renderActionCardTitle(card: ActionCard): string {
  if (state.uiLocale !== "ko") {
    return card.title;
  }
  const titles: Record<string, string> = {
    "summarize-page": "요약하기",
    "summarize-video": "영상 요약",
    "summarize-current-timestamp": "현재 장면 설명",
    "draft-blog-post": "글 초안 만들기",
  };
  return titles[card.id] ?? card.title;
}

function renderChatView(strings: ReturnType<typeof getUiStrings>): string {
  const visibleMessages = state.messages.filter(shouldRenderConversationMessage);
  const pendingProfileQuestionHtml = renderPendingProfileQuestionCard({
    pending: state.pendingProfileQuestion,
    uiLocale: state.uiLocale,
    fallbackProfileLabel: strings.labels.profile,
    canSubmit: canSendCurrentComposerMessage(),
  });
  const isEmpty = visibleMessages.length === 0 && !pendingProfileQuestionHtml;
  const promptActivityHtml = renderPromptActivity();
  const { mainMessages, supplementMessages } = partitionPromptActivitySupplementMessages(visibleMessages);

  return `
    <div class="chat-view ${isEmpty ? "empty" : ""}">
      <div class="chat-scroll ${isEmpty ? "empty" : ""}" id="chat-scroll" data-scroll-key="chat-scroll">
        ${
          isEmpty
            ? `
              <section class="empty-hero">
                <div class="empty-hero-icon" aria-hidden="true"></div>
                <div class="empty-hero-copy">
                  <h2 class="hero-title">${escapeHtml(strings.help.heroPrompt)}</h2>
                  <p class="hero-hint">${escapeHtml(strings.help.heroHint)}</p>
                </div>
              </section>
            `
            : ""
        }
        ${
          !isEmpty
            ? `
              <section class="message-stream" id="messages">
                ${mainMessages.map((message) => renderConversationMessage(message)).join("")}
                ${promptActivityHtml}
                ${pendingProfileQuestionHtml}
                ${supplementMessages.map((message) => renderConversationMessage(message)).join("")}
              </section>
            `
            : ""
        }
      </div>
    </div>
  `;
}

function partitionPromptActivitySupplementMessages(messages: ConversationMessage[]): {
  mainMessages: ConversationMessage[];
  supplementMessages: ConversationMessage[];
} {
  if (!state.promptActivity) {
    return { mainMessages: messages, supplementMessages: [] };
  }
  const mainMessages: ConversationMessage[] = [];
  const supplementMessages: ConversationMessage[] = [];
  for (const message of messages) {
    if (isPromptActivitySupplementMessage(message)) {
      supplementMessages.push(message);
    } else {
      mainMessages.push(message);
    }
  }
  return { mainMessages, supplementMessages };
}

function isPromptActivitySupplementMessage(message: ConversationMessage): boolean {
  return isTraceOnlyAssistantMessage(message) || isPendingImageMessage(message);
}

function renderScrollToBottomButton(): string {
  const label = state.uiLocale === "ko" ? "최신 메시지로 이동" : "Jump to latest message";
  return `
    <button
      id="scroll-to-bottom"
      class="scroll-to-bottom-button"
      type="button"
      aria-label="${escapeAttribute(label)}"
      title="${escapeAttribute(label)}"
      tabindex="-1"
    >
      <span class="scroll-to-bottom-icon" aria-hidden="true">${renderUiIcon("arrow-down")}</span>
    </button>
  `;
}

function renderPromptActivity(): string {
  if (!state.promptActivity) {
    return "";
  }

  const label = formatPromptActivityLabel(state.promptActivity, state.uiLocale);
  const detail = getPromptActivityDetail(state.promptActivity.phase, state.uiLocale);

  return `
    <article class="message-row assistant prompt-activity-row" aria-live="polite">
      <div class="message-card assistant prompt-activity-card">
        <div class="prompt-activity-main">
          <span class="typing-dots" aria-hidden="true"><i></i><i></i><i></i></span>
          <span class="prompt-activity-copy">
            <strong>${escapeHtml(label)}</strong>
            <small>${escapeHtml(detail)}</small>
          </span>
        </div>
      </div>
    </article>
  `;
}

function createVoiceTranscriptMessageId(role: string | undefined): string {
  voiceTranscriptMessageCounter += 1;
  const normalizedRole = role === "user" ? "user" : "assistant";
  return `voice-${normalizedRole}-${Date.now()}-${voiceTranscriptMessageCounter}`;
}

function shouldRenderConversationMessage(message: ConversationMessage): boolean {
  if (message.text.trim()) {
    return true;
  }
  if (message.attachments?.length) {
    return true;
  }
  if (message.trace?.length) {
    return true;
  }
  return (message.images ?? []).some((image) => image.src || image.assetRef || image.status === "loading" || image.status === "error");
}

function isPendingImageMessage(message: ConversationMessage): boolean {
  return message.role === "assistant" && (message.images ?? []).some((image) => image.status === "loading");
}

function renderConversationMessage(message: ConversationMessage): string {
  const strings = stringsForState();
  const imageHtml = renderConversationMessageImages(message.id, message.images);
  const attachmentHtml = renderConversationMessageAttachments(message.attachments);
  const traceHtml = renderMessageTrace(message.trace);
  const editing = message.role === "user" && state.editingMessageId === message.id;
  const editingClass = editing ? "editing" : "";
  const voiceClass = message.delivery === "voice" ? "voice-message" : "";
  const imageResultClass = isImageResultAssistantMessage(message) ? "image-result" : "";
  const actionsHtml = renderMessageActions(message, strings);
  const profileHtml = message.role === "user" ? renderMessageProfileBadge(message.profile) : "";
  const voiceMetaHtml = message.delivery === "voice" ? renderVoiceMessageMeta(message) : "";
  const hasTextBody = editing || message.delivery === "voice" || Boolean(message.text.trim());
  const messageBodyHtml =
    isImageResultAssistantMessage(message)
      ? ""
      : message.delivery === "voice"
      ? renderVoiceConversationBody(message)
      : `<div class="message-content">${renderMessageContentHtml(message.text, {
          enableYouTubeTimestampLinks: shouldRenderYouTubeTimestampLinks(),
        })}</div>`;
  const cardHtml = hasTextBody || traceHtml || imageHtml
    ? `
    <div class="message-card ${message.role} ${editingClass} ${voiceClass} ${imageResultClass}">
      ${profileHtml}
      ${traceHtml}
      ${
        editing
          ? renderMessageEditComposer(message, strings)
          : messageBodyHtml
      }
      ${imageHtml}
    </div>
  `
    : "";
  if (message.role === "user") {
    return `
      <article class="message-row user ${voiceClass}" data-message-id="${escapeAttribute(message.id)}">
        <div class="message-user-stack ${editingClass}">
          ${attachmentHtml}
          ${cardHtml}
          ${voiceMetaHtml}
          ${message.text.trim() ? actionsHtml : ""}
        </div>
      </article>
    `;
  }
  return `
    <article class="message-row ${message.role} ${voiceClass}" data-message-id="${escapeAttribute(message.id)}">
      ${cardHtml}
      ${voiceMetaHtml}
      ${actionsHtml}
    </article>
  `;
}

function renderConversationMessageAttachments(
  attachments: ConversationMessage["attachments"] | undefined,
): string {
  const renderableAttachments = (attachments ?? []).filter((attachment) => attachment.id && attachment.name);
  if (!renderableAttachments.length) {
    return "";
  }

  return `
    <div class="message-attachments" role="list">
      ${renderableAttachments
        .map((attachment) =>
          attachment.kind === "image"
            ? renderConversationMessageAttachmentImage(attachment)
            : renderConversationMessageAttachmentFile(attachment),
        )
        .join("")}
    </div>
  `;
}

function renderConversationMessageAttachmentImage(attachment: ConversationMessageAttachment): string {
  if (!attachment.previewSrc || !isSafeMessageImageUrl(attachment.previewSrc)) {
    return renderConversationMessageAttachmentFile(attachment);
  }

  const roleLabel = renderConversationMessageAttachmentRole(attachment);
  return `
    <figure class="message-attachment-image ${attachment.role ? escapeAttribute(attachment.role) : ""}" role="listitem">
      <img src="${escapeAttribute(attachment.previewSrc)}" alt="${escapeAttribute(attachment.name)}" loading="lazy" />
      <figcaption class="message-attachment-caption">
        ${roleLabel}
        <span class="message-attachment-name">${escapeHtml(attachment.name)}</span>
      </figcaption>
    </figure>
  `;
}

function renderConversationMessageAttachmentFile(attachment: ConversationMessageAttachment): string {
  const meta = [
    formatConversationAttachmentKindLabel(attachment),
    formatConversationAttachmentSize(attachment.sizeBytes),
  ].filter(Boolean);

  return `
    <div class="message-attachment-file" role="listitem">
      <span class="message-attachment-file-icon" aria-hidden="true">${renderMessageActionIcon("file")}</span>
      <span class="message-attachment-file-text">
        <strong>${escapeHtml(attachment.name)}</strong>
        <small>${escapeHtml(meta.join(" · "))}</small>
      </span>
    </div>
  `;
}

function renderConversationMessageAttachmentRole(attachment: ConversationMessageAttachment): string {
  if (!attachment.role) {
    return "";
  }
  const label =
    attachment.role === "target"
      ? state.uiLocale === "ko"
        ? "대상"
        : "Target"
      : state.uiLocale === "ko"
        ? "참조"
        : "Reference";
  return `<span class="message-attachment-role ${escapeAttribute(attachment.role)}">${escapeHtml(label)}</span>`;
}

function formatConversationAttachmentKindLabel(attachment: ConversationMessageAttachment): string {
  if (state.uiLocale !== "ko") {
    switch (attachment.kind) {
      case "image":
        return "Image";
      case "pdf":
        return "PDF";
      case "docx":
        return "Document";
      case "spreadsheet":
        return "Spreadsheet";
      case "text":
        return "Text";
      case "binary":
      default:
        return "File";
    }
  }

  switch (attachment.kind) {
    case "image":
      return "이미지";
    case "pdf":
      return "PDF";
    case "docx":
      return "문서";
    case "spreadsheet":
      return "스프레드시트";
    case "text":
      return "텍스트";
    case "binary":
    default:
      return "파일";
  }
}

function formatConversationAttachmentSize(sizeBytes: number): string {
  if (!Number.isFinite(sizeBytes) || sizeBytes <= 0) {
    return "";
  }
  if (sizeBytes < 1024) {
    return `${Math.round(sizeBytes)} B`;
  }
  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(sizeBytes < 10 * 1024 ? 1 : 0)} KB`;
  }
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderMessageTrace(trace: ConversationMessage["trace"] | undefined): string {
  const items = (trace ?? []).slice(-MAX_TRACE_ITEMS);
  if (!items.length) {
    return "";
  }
  const shouldOpen = items.some((item) => item.status === "running");
  return `
    <details class="message-trace-text"${shouldOpen ? " open" : ""}>
      <summary class="message-trace-summary">
        <span>${escapeHtml(formatTraceSummary(items))}</span>
        <span class="message-trace-caret" aria-hidden="true">${renderUiIcon("chevron-down")}</span>
      </summary>
      <div class="message-trace-lines" role="list">
        ${items.map((item) => renderMessageTraceItem(item)).join("")}
      </div>
    </details>
  `;
}

function renderMessageTraceItem(item: NonNullable<ConversationMessage["trace"]>[number]): string {
  const title = formatTraceTitle(item);
  const detail = formatTraceDetail(item, title);
  return `
    <div class="message-trace-line ${escapeAttribute(item.kind)} ${escapeAttribute(item.status)}" role="listitem">
      <span class="message-trace-line-text">
        <span class="message-trace-line-main">${escapeHtml(title)}</span>
        ${detail ? `<span class="message-trace-line-detail">${escapeHtml(detail)}</span>` : ""}
      </span>
    </div>
  `;
}

function formatTraceSummary(items: NonNullable<ConversationMessage["trace"]>): string {
  const ko = state.uiLocale === "ko";
  const fileCount = items.filter((item) => item.kind === "file").length;
  const webCount = items.filter((item) => item.kind === "web").length;
  const imageCount = items.filter((item) => item.kind === "image").length;
  const commandCount = items.filter((item) => item.kind === "command").length;
  const browserCount = items.filter((item) => item.kind === "browser").length;
  const toolCount = items.filter((item) => item.kind === "tool").length;
  const running = items.some((item) => item.status === "running");
  const parts: string[] = [];

  if (ko) {
    if (fileCount) parts.push(`파일 ${fileCount}개`);
    if (webCount) parts.push(`검색 ${webCount}건`);
    if (imageCount) parts.push(`이미지 ${imageCount}개`);
    if (commandCount) parts.push(`명령 ${commandCount}회`);
    if (browserCount) parts.push(`브라우저 ${browserCount}회`);
    if (toolCount) parts.push(`도구 ${toolCount}회`);
    return `${parts.length ? parts.join(", ") : `작업 ${items.length}개`} ${running ? "탐색 중" : "탐색 마침"}`;
  }

  if (fileCount) parts.push(`${fileCount} file${fileCount === 1 ? "" : "s"}`);
  if (webCount) parts.push(`${webCount} search${webCount === 1 ? "" : "es"}`);
  if (imageCount) parts.push(`${imageCount} image${imageCount === 1 ? "" : "s"}`);
  if (commandCount) parts.push(`${commandCount} command${commandCount === 1 ? "" : "s"}`);
  if (browserCount) parts.push(`${browserCount} browser step${browserCount === 1 ? "" : "s"}`);
  if (toolCount) parts.push(`${toolCount} tool${toolCount === 1 ? "" : "s"}`);
  return `${parts.length ? parts.join(", ") : `${items.length} step${items.length === 1 ? "" : "s"}`} ${running ? "exploring" : "explored"}`;
}

function formatTraceDetail(item: NonNullable<ConversationMessage["trace"]>[number], title: string): string {
  const detail = item.detail.trim();
  if (!detail || detail === item.title.trim() || detail === title || isNoisyTraceText(detail)) {
    return "";
  }
  return detail;
}

function formatTraceTitle(item: NonNullable<ConversationMessage["trace"]>[number]): string {
  const ko = state.uiLocale === "ko";
  const completed = item.status === "completed";
  const explicitTitle = item.title.trim();
  if (item.kind === "reasoning" && explicitTitle && !isNoisyTraceText(explicitTitle)) {
    return explicitTitle;
  }
  switch (item.kind) {
    case "reasoning":
      return ko ? "작업 계획" : "Plan";
    case "web":
      return ko ? (completed ? "웹 검색 완료" : "웹 검색 중") : completed ? "Web search complete" : "Searching the web";
    case "file":
      return ko ? (completed ? "파일 탐색 완료" : "파일 탐색 중") : completed ? "File exploration complete" : "Exploring files";
    case "command":
      return ko ? (completed ? "명령 실행 완료" : "명령 실행 중") : completed ? "Command complete" : "Running command";
    case "browser":
      return ko ? (completed ? "브라우저 컨텍스트 확인 완료" : "브라우저 컨텍스트 확인 중") : completed ? "Browser context ready" : "Inspecting browser context";
    case "image":
      return ko ? (completed ? "이미지 작업 완료" : "이미지 작업 중") : completed ? "Image work complete" : "Working on image";
    case "response":
      return ko ? (completed ? "최종 응답 준비 완료" : "최종 응답 작성 중") : completed ? "Final answer ready" : "Writing final answer";
    case "tool":
    default:
      return ko ? (completed ? "도구 실행 완료" : "도구 실행 중") : completed ? "Tool result ready" : "Using tool";
  }
}

function isNoisyTraceText(value: string): boolean {
  const normalized = value.replace(/\s+/gu, " ").trim().toLowerCase();
  if (!normalized) {
    return false;
  }
  return (
    normalized === "reviewing the request and planning the next step." ||
    normalized === "preparing the user-facing response." ||
    normalized.includes("without exposing hidden chain-of-thought") ||
    normalized.includes("final answer preparation")
  );
}

function isImageResultAssistantMessage(message: ConversationMessage): boolean {
  if (message.role !== "assistant") {
    return false;
  }
  return (message.images ?? []).some((image) => image.src || image.assetRef || image.status === "loading" || image.status === "error" || image.status === "deleted");
}

function renderVoiceConversationBody(message: ConversationMessage): string {
  if (message.role === "user") {
    return `
      <div class="message-content voice-transcript-content">
        <span class="voice-transcript-quote" aria-hidden="true">“</span>${escapeHtml(message.text.trim())}<span class="voice-transcript-quote" aria-hidden="true">”</span>
      </div>
    `;
  }

  return `
    <div class="voice-assistant-label">
      <span class="voice-message-icon" aria-hidden="true">${renderVoiceMessageIcon("mic")}</span>
      <span>${escapeHtml(state.uiLocale === "ko" ? "음성 응답" : "Voice response")}</span>
    </div>
    <div class="message-content voice-transcript-content">${renderMessageContentHtml(message.text, {
      enableYouTubeTimestampLinks: shouldRenderYouTubeTimestampLinks(),
    })}</div>
  `;
}

function renderVoiceMessageMeta(message: ConversationMessage): string {
  const label =
    message.role === "user"
      ? formatVoiceDurationLabel(getVoiceMessageDurationMs(message))
      : state.uiLocale === "ko"
        ? "실시간 음성"
        : "Realtime voice";

  return `
    <div class="voice-message-meta ${message.role}">
      <span class="voice-message-icon" aria-hidden="true">${renderVoiceMessageIcon("mic")}</span>
      <span>${escapeHtml(label)}</span>
    </div>
  `;
}

function getVoiceMessageDurationMs(message: ConversationMessage): number | undefined {
  if (message.delivery !== "voice" || !message.voice) {
    return undefined;
  }
  if (isActiveVoiceTranscriptMessage(voiceTranscriptMirror, message)) {
    return Math.max(0, voiceDurationNow - message.voice.startedAt);
  }
  if (typeof message.voice.durationMs === "number") {
    return message.voice.durationMs;
  }
  return undefined;
}

function renderMessageProfileBadge(profile: ConversationMessage["profile"] | undefined): string {
  if (!profile?.id || !profile.name || profile.id === "default") {
    return "";
  }
  const color = normalizeProfileColorForUi(profile.color);
  return `
    <div class="message-profile-badge" style="--profile-color: ${escapeAttribute(color)}" title="${escapeAttribute(profile.name)}">
      ${renderProfileIcon(profile.icon ?? DEFAULT_PROFILE_VISUAL_ICON)}
      <span>${escapeHtml(profile.name)}</span>
    </div>
  `;
}

function shouldRenderYouTubeTimestampLinks(): boolean {
  const currentTab = getCurrentTabReference();
  if (currentTab && isYouTubeLikeUrl(currentTab.url)) {
    return true;
  }

  return state.openTabOptions
    .filter((tab) => state.selectedTabIds.includes(tab.tabId))
    .some((tab) => isYouTubeLikeUrl(tab.url));
}

function renderMessageEditComposer(
  message: ConversationMessage,
  strings: ReturnType<typeof getUiStrings>,
): string {
  const disabled = canSendCurrentComposerMessage() ? "" : "disabled";
  return `
    <div class="message-edit-box">
      <textarea data-message-edit-input="${escapeAttribute(message.id)}">${escapeHtml(message.text)}</textarea>
      <div class="message-edit-actions">
        <button type="button" class="message-action-button primary" data-message-edit-save="${escapeAttribute(message.id)}" ${disabled}>
          ${escapeHtml(strings.actions.saveEdit)}
        </button>
        <button type="button" class="message-action-button" data-message-edit-cancel="${escapeAttribute(message.id)}">
          ${escapeHtml(strings.actions.cancelEdit)}
        </button>
      </div>
    </div>
  `;
}

function getMessageActionTooltip(
  action: "copy" | "copied" | "edit" | "regenerate",
  strings: ReturnType<typeof getUiStrings>,
): string {
  if (state.uiLocale === "ko") {
    switch (action) {
      case "copy":
        return "메시지 복사";
      case "copied":
        return "복사됨";
      case "edit":
        return "메시지 수정";
      case "regenerate":
        return "다시 생성";
    }
  }

  switch (action) {
    case "copy":
      return "Copy message";
    case "copied":
      return "Copied";
    case "edit":
      return strings.actions.editMessage;
    case "regenerate":
      return strings.actions.regenerateMessage;
  }
}

function renderMessageCopiedIndicator(): string {
  return `<span class="message-action-check" aria-hidden="true">${renderUiIcon("check")}</span>`;
}

function renderMessageCopyButton(
  message: ConversationMessage,
  strings: ReturnType<typeof getUiStrings>,
): string {
  if (!message.text.trim()) {
    return "";
  }

  const copied = state.copiedMessageId === message.id;
  const label = getMessageActionTooltip(copied ? "copied" : "copy", strings);
  const copiedClass = copied ? " copied" : "";
  return `<button
    type="button"
    class="message-action-button icon${copiedClass}"
    data-message-copy="${escapeAttribute(message.id)}"
    aria-label="${escapeAttribute(label)}"
    data-tooltip="${escapeAttribute(label)}"
  >${copied ? renderMessageCopiedIndicator() : renderMessageActionIcon("copy")}</button>`;
}

function renderMessageActions(
  message: ConversationMessage,
  strings: ReturnType<typeof getUiStrings>,
): string {
  if (isTraceOnlyAssistantMessage(message)) {
    return "";
  }
  if (state.editingMessageId === message.id) {
    return "";
  }

  const disabled = canSendCurrentComposerMessage() ? "" : "disabled";
  if (message.role === "assistant") {
    if (
      !shouldRenderAssistantMessageActions({
        messageId: message.id,
        promptActivityActive: Boolean(state.promptActivity),
        turnActive: isCurrentTurnActive(),
        streamingMessageIds: state.streamingAssistantMessageIds,
      })
    ) {
      return "";
    }
    const copyButton = renderMessageCopyButton(message, strings);
    const regenerateLabel = getMessageActionTooltip("regenerate", strings);
    return `
      <div class="message-actions assistant">
        ${copyButton}
        <button
          type="button"
          class="message-action-button icon"
          data-message-regenerate="${escapeAttribute(message.id)}"
          aria-label="${escapeAttribute(regenerateLabel)}"
          data-tooltip="${escapeAttribute(regenerateLabel)}"
          ${disabled}
        >${renderMessageActionIcon("regenerate")}</button>
      </div>
    `;
  }

  const copyButton = renderMessageCopyButton(message, strings);
  const editLabel = getMessageActionTooltip("edit", strings);
  return `
    <div class="message-actions user user-icon-actions">
      ${copyButton}
      <button
        type="button"
        class="message-action-button icon"
        data-message-edit="${escapeAttribute(message.id)}"
        aria-label="${escapeAttribute(editLabel)}"
        data-tooltip="${escapeAttribute(editLabel)}"
        ${disabled}
      >${renderMessageActionIcon("edit")}</button>
    </div>
  `;
}

function renderConversationMessageImages(messageId: string, images: ConversationMessage["images"] | undefined): string {
  const renderableImages = (images ?? [])
    .map((image, index) => ({ image, index }))
    .filter(
      ({ image }) => isSafeMessageImageUrl(image.src) || image.status === "loading" || image.status === "error" || image.status === "deleted",
    );
  if (!renderableImages.length) {
    return "";
  }

  return `
    <div class="message-images">
      ${renderableImages
        .map(({ image, index }) => {
          if (isSafeMessageImageUrl(image.src)) {
            return `
              <figure class="message-image-frame">
                <button
                  type="button"
                  class="message-image-select"
                  data-image-followup="1"
                  data-image-message-id="${escapeAttribute(messageId)}"
                  data-image-index="${index}"
                  title="${escapeAttribute(state.uiLocale === "ko" ? "이 이미지 후속 편집" : "Follow-up edit this image")}"
                  aria-label="${escapeAttribute(state.uiLocale === "ko" ? "이 이미지 후속 편집" : "Follow-up edit this image")}"
                >
                  <img src="${escapeAttribute(image.src)}" alt="${escapeAttribute(image.alt || "Image")}" loading="lazy" />
                </button>
                <figcaption class="message-image-overlay-actions">
                  <button type="button" class="image-action-button overlay edit" data-image-followup="1" data-image-message-id="${escapeAttribute(messageId)}" data-image-index="${index}">
                    ${escapeHtml(state.uiLocale === "ko" ? "편집" : "Edit")}
                  </button>
                  <button
                    type="button"
                    class="image-action-button overlay icon"
                    data-image-open="1"
                    data-image-message-id="${escapeAttribute(messageId)}"
                    data-image-index="${index}"
                    title="${escapeAttribute(stringsForState().actions.openPreview)}"
                    aria-label="${escapeAttribute(stringsForState().actions.openPreview)}"
                  >
                    ${renderMessageActionIcon("open")}
                  </button>
                </figcaption>
              </figure>
            `;
          }
          const status = image.status ?? "loading";
          if (status === "loading") {
            const detail = image.alt || (state.uiLocale === "ko" ? "이미지 생성 중" : "Generating image");
            return `
              <figure class="message-image-frame pending loading" aria-label="${escapeAttribute(detail)}">
                <div class="message-image-skeleton" aria-hidden="true"></div>
              </figure>
            `;
          }
          const label =
            status === "deleted"
              ? state.uiLocale === "ko"
                ? "삭제된 이미지입니다. 원본 파일이 없어 미리보기를 복원할 수 없습니다."
                : "Deleted image. The original file is no longer available."
              : state.uiLocale === "ko"
                ? "이미지 미리보기를 불러오지 못했습니다."
                : "Image preview could not be loaded.";
          return `
            <figure class="message-image-frame pending ${status}">
              <div class="message-image-placeholder">
                <span>${escapeHtml(label)}</span>
              </div>
            </figure>
          `;
        })
        .join("")}
    </div>
  `;
}

function renderContextView(strings: ReturnType<typeof getUiStrings>): string {
  const hasPageContext =
    state.attachments.has("current-page") ||
    state.attachments.has("selection") ||
    state.attachments.has("image");

  return `
    <div class="view-scroll context-view" data-scroll-key="context-view">
      ${renderBackToChatHeader(strings, "context")}
      <section class="surface stack">
        <div class="stack-header">
          <h2>${escapeHtml(strings.labels.attachedContext)}</h2>
        </div>
        <div class="chips source-chips">
          ${renderContextReferenceChip("open-tabs", renderOpenTabsLabel(strings))}
        </div>
        ${
          state.attachments.size || state.fileAttachments.length || state.structuredInputs.length
            ? `<div class="context-summary">${renderAttachedContextSummary(strings)}</div>`
            : `<p class="empty-state">${escapeHtml(strings.help.emptyConversation)}</p>`
        }
      </section>

      ${
        state.structuredInputs.length
          ? `<section class="surface stack">
              <div class="stack-header">
                <h2>${escapeHtml(strings.labels.attachedContext)}</h2>
              </div>
              <div class="chips secondary">
                ${state.structuredInputs
                  .map(
                    (input) => `
                      <button class="chip active structured-chip" data-structured-id="${escapeAttribute(input.id)}">
                        ${escapeHtml(structuredInputRoleLabel(input, strings))}: ${escapeHtml(input.name)}
                      </button>
                    `,
                  )
                  .join("")}
              </div>
            </section>`
          : ""
      }

      ${
        hasPageContext
          ? `<section class="surface stack">
              <div class="stack-header">
                <h2>${escapeHtml(strings.labels.readStrategy)}</h2>
              </div>
              <p class="stack-copy">${escapeHtml(strings.help.contextRefine)}</p>
              <div class="read-modes">
                ${renderReadModeButton("auto", strings.readModes.auto)}
                ${renderReadModeButton("dom", strings.readModes.dom)}
                ${renderReadModeButton("vision", strings.readModes.vision)}
                ${renderReadModeButton("hybrid", strings.readModes.hybrid)}
              </div>
            </section>`
          : ""
      }

      ${
        state.attachments.has("open-tabs")
          ? `<section class="surface stack">
              <div class="stack-header">
                <h2>${escapeHtml(strings.labels.openTabsPanel)}</h2>
                <button id="load-tabs">${escapeHtml(strings.actions.refresh)}</button>
              </div>
              <p class="stack-copy">${escapeHtml(strings.help.contextRefine)}</p>
              <div id="tabs-container"></div>
            </section>`
          : ""
      }

      ${
        state.attachments.has("history")
          ? `<section class="surface stack">
              <div class="stack-header">
                <h2>${escapeHtml(strings.labels.historyPanel)}</h2>
              </div>
              <p class="stack-copy">${escapeHtml(strings.help.contextRefine)}</p>
              <div class="inline-form">
                <input id="history-query" placeholder="${escapeAttribute(strings.historyPlaceholder)}" value="${escapeAttribute(state.historyQuery)}" />
                <button id="search-history">${escapeHtml(strings.actions.search)}</button>
              </div>
              <div id="history-container">
                ${state.historyItems
                  .map((item) => `<label class="history-item"><span>${escapeHtml(item.title)}</span><small>${escapeHtml(item.url)}</small></label>`)
                  .join("")}
              </div>
            </section>`
          : ""
      }

      <section class="surface stack">
        <div class="stack-header">
          <h2>${escapeHtml(strings.labels.codexSkills)}</h2>
          <button id="upload-skill-archive" class="ghost-button small">${escapeHtml(strings.actions.uploadSkillArchive)}</button>
          <input id="skill-archive-input" type="file" accept=".zip,application/zip" hidden />
        </div>
        <p class="stack-copy">${escapeHtml(strings.help.codexSkills)}</p>
        ${
          state.appServerSkills.length
            ? `<div class="codex-skill-list">${state.appServerSkills.map((skill) => renderCodexSkillToggle(skill)).join("")}</div>`
            : `<p class="empty-state">${escapeHtml(strings.help.emptySkills)}</p>`
        }
      </section>
    </div>
  `;
}

function renderBackToChatHeader(strings: ReturnType<typeof getUiStrings>, view: "context" | "settings"): string {
  return `
    <div class="view-return-header ${view}" data-view-return-header="${escapeAttribute(view)}">
      <button class="settings-back" data-view="chat" type="button">
        <span aria-hidden="true">${renderUiIcon("arrow-left")}</span>
        <span>${escapeHtml(strings.settingsPanel.backToChat)}</span>
      </button>
    </div>
  `;
}

function renderCodexSkillToggle(skill: CodexSkillOption): string {
  const enabled = isCodexSkillEnabled(skill.id);
  return `
    <label class="codex-skill-toggle ${enabled ? "enabled" : ""}">
      <span class="codex-skill-copy">
        <strong>${escapeHtml(skill.name)}</strong>
        <span>${escapeHtml(skill.description || skill.path)}</span>
      </span>
      <span class="settings-switch codex-skill-switch">
        <input
          type="checkbox"
          data-codex-skill-toggle="${escapeAttribute(skill.id)}"
          aria-label="${escapeAttribute(skill.name)}"
          ${enabled ? "checked" : ""}
        />
        <span aria-hidden="true"></span>
      </span>
    </label>
  `;
}

function isCodexSkillEnabled(skillId: string): boolean {
  return state.settings.enabledCodexSkillIds.includes(skillId);
}

function renderWorkspaceView(strings: ReturnType<typeof getUiStrings>): string {
  const isLoggedIn = Boolean(state.accountStatus?.codexAuthenticated);
  const selectedModelOption = getSelectedModelOption();
  const selectedProfile = getSelectedProfile();
  const canDeleteSelectedProfile = Boolean(selectedProfile && selectedProfile.id !== "default");
  const sections = listSettingsSections(state.uiLocale);
  const nativeHostHealth = getNativeHostHealth({
    modelCatalogState: state.modelCatalogState,
    modelCatalogErrorMessage: state.modelCatalogErrorMessage,
  });
  const codexBinaryHealth = getCodexBinaryHealth({
    nativeHostStatus: nativeHostHealth.status,
    runtimeConfig: state.runtimeConfig,
    modelCatalogState: state.modelCatalogState,
  });
  return `
    <div class="view-scroll workspace-view settings-view" data-scroll-key="workspace-view">
      ${renderBackToChatHeader(strings, "settings")}
      <section class="settings-content">
        <header class="settings-page-header">
          <p class="eyebrow">${escapeHtml(strings.brandEyebrow)}</p>
          <h2>${escapeHtml(strings.labels.settings)}</h2>
          <p>${escapeHtml(strings.settingsPanel.overview)}</p>
        </header>

        ${renderSettingsCard(
          "general",
          sections[0]?.label ?? strings.labels.settings,
          strings.settingsPanel.generalDescription,
          [
            renderSettingsRow(
              "language",
              strings.labels.language,
              strings.settings.uiLanguage,
              renderLanguageSelect(),
              {},
            ),
            renderSettingsRow(
              "profile",
              strings.labels.profile,
              strings.settingsPanel.profileDescription,
              `<div class="profile-settings-control">
                ${selectedProfile ? renderProfileVisualBadge(selectedProfile) : `<span class="profile-visual-badge empty" aria-hidden="true"></span>`}
                <label class="settings-select-shell">
                  <select id="profile-select" aria-label="${escapeAttribute(strings.labels.profile)}">
                    ${state.profiles
                      .map(
                        (profile) =>
                          `<option value="${profile.id}" ${
                            profile.id === state.selectedProfileId ? "selected" : ""
                          }>${escapeHtml(profile.name)}</option>`,
                      )
                      .join("")}
                  </select>
                  <span aria-hidden="true">${renderUiIcon("chevron-down")}</span>
                </label>
                <div class="profile-settings-actions">
                  <button id="create-profile" class="settings-compact-button" type="button">${escapeHtml(
                    strings.actions.createProfile,
                  )}</button>
                  <button id="edit-profile" class="settings-compact-button" type="button" ${
                    selectedProfile ? "" : "disabled"
                  }>${escapeHtml(strings.actions.editProfile)}</button>
                  <button id="delete-profile" class="settings-compact-button danger" type="button" ${
                    canDeleteSelectedProfile ? "" : "disabled"
                  } title="${escapeAttribute(canDeleteSelectedProfile ? strings.actions.deleteProfile : strings.profileEditor.deleteDisabled)}">${escapeHtml(
                    strings.actions.deleteProfile,
                  )}</button>
                </div>
              </div>`,
              { expanded: true },
            ),
            renderSettingsRow(
              "site-suggestions",
              strings.labels.siteSuggestions,
              strings.settingsPanel.siteSuggestionsDescription,
              renderCustomSiteSuggestionSettings(strings),
              { expanded: true },
            ),
            renderSettingsRow(
              strings.labels.currentModel,
              strings.settingsPanel.modelDescription,
              `<label class="settings-select-shell ${state.modelCatalogState !== "ready" || !state.models.length ? "disabled" : ""}">
                <select id="model-select" aria-label="${escapeAttribute(strings.labels.currentModel)}" ${state.modelCatalogState !== "ready" || !state.models.length ? "disabled" : ""}>
                  ${
                    state.modelCatalogState === "ready" && state.models.length
                      ? state.models
                          .map(
                            (model) =>
                              `<option value="${escapeAttribute(model.id)}" ${
                                model.id === (selectedModelOption?.id ?? "") ? "selected" : ""
                              }>${escapeHtml(model.label)}${model.isDefault ? ` (${escapeHtml(strings.labels.defaultModel)})` : ""}</option>`,
                          )
                          .join("")
                      : `<option value="">${escapeHtml(renderModelChipLabel(strings, selectedModelOption))}</option>`
                  }
                </select>
                <span aria-hidden="true">${renderUiIcon("chevron-down")}</span>
              </label>`,
            ),
            renderSettingsRow(
              strings.settings.rememberChats,
              strings.settingsPanel.rememberChatsDescription,
              renderSettingsSwitch("setting-remember-chats", state.settings.rememberChats, strings.settings.rememberChats),
            ),
            renderSettingsRow(
              "chat-history",
              strings.labels.recentChats,
              strings.settingsPanel.chatHistoryDescription,
              `<button class="settings-compact-button danger" type="button" data-clear-chat-history="settings" ${
                state.recentChats.length ? "" : "disabled"
              }>${escapeHtml(strings.actions.clearRecentChats)}</button>`,
              {},
            ),
            renderSettingsRow(
              strings.settings.autoCompactConversations,
              strings.settingsPanel.autoCompactDescription,
              renderSettingsSwitch(
                "setting-auto-compact",
                state.settings.autoCompactConversations,
                strings.settings.autoCompactConversations,
              ),
            ),
            renderSettingsRow(
              strings.actions.resetSettings,
              strings.settingsPanel.resetDescription,
              `<button id="reset-settings" class="settings-compact-button danger" type="button">${escapeHtml(strings.actions.resetSettings)}</button>`,
            ),
          ],
        )}

        ${renderSettingsCard(
          "connection",
          sections[1]?.label ?? strings.labels.connection,
          strings.settingsPanel.connectionDescription,
          [
            renderSettingsRow(
              "account",
              strings.account,
              strings.accountHelp,
              `<div class="settings-action-cluster account-settings-actions">
                <span class="settings-status-pill accent">${escapeHtml(renderAccountBadge())}</span>
                ${state.rateLimits ? `<span class="settings-status-pill">${escapeHtml(renderRateLimitBadge(state.rateLimits))}</span>` : ""}
                ${!isLoggedIn ? `<button id="chatgpt-login">${escapeHtml(strings.actions.chatgptLogin)}</button>` : ""}
                <button id="apikey-login">${escapeHtml(strings.actions.apiKeyFallback)}</button>
                ${isLoggedIn ? `<button id="logout">${escapeHtml(strings.actions.logout)}</button>` : ""}
              </div>`,
              { expanded: true },
            ),
            renderSettingsRow(
              strings.labels.nativeHost,
              renderNativeHostDetail(strings, nativeHostHealth),
              renderSettingsStatusPill(renderNativeHostStatus(strings, nativeHostHealth), nativeHostHealth.tone),
            ),
            renderSettingsRow(
              strings.labels.codexBinary,
              renderCodexBinaryDetail(strings, codexBinaryHealth),
              renderSettingsStatusPill(
                renderCodexBinaryStatus(strings, codexBinaryHealth),
                codexBinaryHealth.tone,
              ),
            ),
            renderSettingsRow(
              strings.actions.reconnect,
              strings.settingsPanel.reconnectDescription,
              `<button id="reconnect-connection">${escapeHtml(strings.actions.reconnect)}</button>`,
            ),
            renderSettingsRow(
              strings.labels.generatedImages,
              renderImageAssetFolderDetail(strings),
              `<div class="settings-action-cluster">
                <span class="settings-status-pill neutral">${escapeHtml(
                  state.imageAssetFolder.assetCount
                    ? `${state.imageAssetFolder.assetCount} ${state.uiLocale === "ko" ? "개" : "files"}`
                    : strings.status.noGeneratedImages,
                )}</span>
                <button id="refresh-image-folder">${escapeHtml(strings.actions.refresh)}</button>
                <button id="open-image-folder" ${state.imageAssetFolder.latestFolder ? "" : "disabled"}>${escapeHtml(strings.actions.openFolder)}</button>
              </div>`,
            ),
            renderSettingsRow(
              strings.labels.diagnosticLogs,
              renderDiagnosticLogFolderDetail(strings),
              `<div class="settings-action-cluster">
                <span class="settings-status-pill neutral">${escapeHtml(
                  state.diagnosticLogFolder.files.length
                    ? `${state.diagnosticLogFolder.files.length} ${state.uiLocale === "ko" ? "개" : "files"}`
                    : strings.status.pending,
                )}</span>
                <button id="refresh-log-folder">${escapeHtml(strings.actions.refresh)}</button>
                <button id="open-log-folder" ${state.diagnosticLogFolder.rootDir ? "" : "disabled"}>${escapeHtml(strings.actions.openFolder)}</button>
              </div>`,
            ),
          ],
        )}

        ${renderSettingsCard(
          "permissions",
          sections[2]?.label ?? strings.permissions.generic,
          strings.settingsPanel.permissionsDescription,
          [
            renderSettingsRow(
              "browser-actions",
              strings.settings.allowBrowserActions,
              strings.permissions.currentPageAction,
              renderBrowserActionPermissionSettings(strings),
              { expanded: true },
            ),
          ],
        )}

        ${renderSettingsCard(
          "voice",
          sections[3]?.label ?? strings.labels.voice,
          strings.settingsPanel.voiceDescription,
          [
            renderSettingsRow(
              strings.settings.liveCaptions,
              strings.settingsPanel.liveCaptionsDescription,
              renderSettingsSwitch("setting-live-captions", state.settings.liveCaptions, strings.settings.liveCaptions),
            ),
            renderSettingsRow(
              strings.settings.voiceNavigation,
              strings.settingsPanel.voiceNavigationDescription,
              renderSettingsSwitch("setting-voice-navigation", state.settings.allowVoiceNavigation, strings.settings.voiceNavigation),
            ),
            renderSettingsRow(
              strings.labels.voice,
              strings.settingsPanel.voiceSelectDescription,
              `<label class="settings-select-shell">
                <select id="voice-select" aria-label="${escapeAttribute(strings.labels.voice)}">
                  <option value="">${escapeHtml(strings.settings.systemDefault)}</option>
                  ${state.voiceOptions
                    .map(
                      (voice) =>
                        `<option value="${escapeAttribute(voice.id)}" ${
                          voice.id === state.settings.preferredVoice ? "selected" : ""
                        }>${escapeHtml(voice.label)}</option>`,
                    )
                    .join("")}
                </select>
                <span aria-hidden="true">${renderUiIcon("chevron-down")}</span>
              </label>`,
            ),
          ],
        )}

      </section>
    </div>
  `;
}

function getSelectedProfile(): ProfileTemplate | null {
  return state.profiles.find((profile) => profile.id === state.selectedProfileId) ?? null;
}

function renderCustomSiteSuggestionSettings(strings: ReturnType<typeof getUiStrings>): string {
  const siteKey = state.currentTabReference ? resolveCustomSiteSuggestionKey(state.currentTabReference.url) : null;
  const siteLabel = siteKey ?? (state.uiLocale === "ko" ? "일반 웹사이트에서 사용할 수 있습니다" : "Available on normal web sites");
  const suggestions = listCustomSiteSuggestionsForTab(
    state.currentTabReference,
    state.settings.customSiteSuggestions,
  ).slice(0, 6);
  const disabledAttribute = siteKey ? "" : "disabled";
  const placeholder = strings.prompts.customSiteSuggestion;
  const emptyLabel =
    state.uiLocale === "ko"
      ? "이 사이트에 저장된 추천 명령어가 없습니다."
      : "No custom suggestions saved for this site.";

  return `
    <div class="custom-site-suggestion-control">
      <div class="custom-site-suggestion-site">
        ${renderSiteSuggestionIcon(state.currentTabReference)}
        <span>${escapeHtml(siteLabel)}</span>
      </div>
      <form class="custom-site-suggestion-form" id="custom-site-suggestion-form">
        <input
          id="custom-site-suggestion-input"
          type="text"
          maxlength="280"
          placeholder="${escapeAttribute(placeholder)}"
          ${disabledAttribute}
        />
        <button class="settings-compact-button primary" type="submit" ${disabledAttribute}>${escapeHtml(
          strings.actions.addSiteSuggestion,
        )}</button>
      </form>
      <div class="custom-site-suggestion-list">
        ${
          suggestions.length
            ? suggestions
                .map(
                  (suggestion) => `
                    <div class="custom-site-suggestion-item">
                      <span>${escapeHtml(suggestion.prompt)}</span>
                      <button
                        class="settings-compact-button danger icon-only"
                        type="button"
                        data-delete-custom-site-suggestion="${escapeAttribute(suggestion.id)}"
                        title="${escapeAttribute(strings.actions.deleteProfile)}"
                        aria-label="${escapeAttribute(strings.actions.deleteProfile)}"
                      >${renderUiIcon("x")}</button>
                    </div>
                  `,
                )
                .join("")
            : `<p class="custom-site-suggestion-empty">${escapeHtml(emptyLabel)}</p>`
        }
      </div>
    </div>
  `;
}

function ensureComposerProfileSelection(): string {
  const resolved = resolveComposerProfileSelection({
    selectedProfileId: state.selectedProfileId,
    profiles: state.profiles,
    composerCommandPills: state.composerCommandPills,
  });
  state.selectedProfileId = resolved.selectedProfileId;
  state.composerCommandPills = resolved.composerCommandPills;
  return state.selectedProfileId;
}

function selectProfileForComposer(profileId: string, options: { visible: boolean }): string {
  const selectedProfileId = normalizeSelectedProfileIdForProfiles(profileId, state.profiles);
  state.selectedProfileId = selectedProfileId;
  if (!options.visible || selectedProfileId === DEFAULT_PROFILE_ID) {
    state.composerCommandPills = state.composerCommandPills.filter((pill) => pill.kind !== "profile");
    return selectedProfileId;
  }

  const profile = state.profiles.find((candidate) => candidate.id === selectedProfileId);
  state.composerCommandPills = upsertComposerCommandPill(state.composerCommandPills, {
    kind: "profile",
    id: selectedProfileId,
    label: profile?.name ?? selectedProfileId,
  });
  return selectedProfileId;
}

function getProfileVisualById(profileId: string): ProfileTemplate["visual"] | undefined {
  return state.profiles.find((profile) => profile.id === profileId)?.visual;
}

async function submitPendingProfileQuestion(answerOverride?: string): Promise<void> {
  const pending = state.pendingProfileQuestion;
  if (!pending || !canSendCurrentComposerMessage()) {
    return;
  }

  const inputAnswer = answerOverride ?? root.querySelector<HTMLTextAreaElement>("#profile-question-answer")?.value ?? pending.answer;
  const answer = inputAnswer.trim();
  if (!answer) {
    state.pendingProfileQuestion = {
      ...pending,
      answer: inputAnswer,
    };
    render();
    return;
  }

  state.pendingProfileQuestion = null;
  const selectedProfileId = selectProfileForComposer(pending.profileId, { visible: pending.profileId !== DEFAULT_PROFILE_ID });
  if (selectedProfileId !== state.selectedProfileId) {
    state.selectedProfileId = selectedProfileId;
  }
  void sendRuntimeMessage({ type: "profile.select", profileId: selectedProfileId }).catch((error) => {
    state.initError = toUserFacingRuntimeError(error, stringsForState().errors.init);
    render();
  });
  render();
  await sendPrompt(answer);
}

function createMessageProfileSnapshot(): ConversationMessageProfile | undefined {
  ensureComposerProfileSelection();
  const profile = getSelectedProfile();
  if (!profile || profile.id === DEFAULT_PROFILE_ID) {
    return undefined;
  }
  return {
    id: profile.id,
    name: profile.name,
    color: normalizeProfileColorForUi(profile.visual?.color),
    icon: profile.visual?.icon ?? DEFAULT_PROFILE_VISUAL_ICON,
  };
}

function createProfileEditorState(mode: "create" | "edit", profile?: ProfileTemplate | null): ProfileEditorState {
  const visual = profile?.visual ?? {};
  const suggestions = profile?.suggestedPrompts ?? [];
  return {
    mode,
    ...(profile?.id ? { profileId: profile.id } : {}),
    name: mode === "edit" ? (profile?.name ?? "") : "",
    systemPrompt: mode === "edit" ? (profile?.systemPrompt ?? "") : "",
    color: visual.color ?? DEFAULT_PROFILE_VISUAL_COLOR,
    icon: visual.icon ?? DEFAULT_PROFILE_VISUAL_ICON,
    imageDataUrl: visual.imageDataUrl ?? "",
    suggestedPrompts: [suggestions[0] ?? "", suggestions[1] ?? "", suggestions[2] ?? ""],
    visualPickerOpen: false,
  };
}

function renderProfileVisualBadge(profile: ProfileTemplate): string {
  const visual = profile.visual ?? {};
  const color = normalizeProfileColorForUi(visual.color);
  return `
    <span class="profile-visual-badge" style="--profile-color: ${escapeAttribute(color)}" aria-hidden="true">
      ${
        visual.imageDataUrl
          ? `<img src="${escapeAttribute(visual.imageDataUrl)}" alt="" />`
          : renderProfileIcon(visual.icon ?? DEFAULT_PROFILE_VISUAL_ICON)
      }
    </span>
  `;
}

function renderProfileEditorModal(strings: ReturnType<typeof getUiStrings>): string {
  const editor = state.profileEditor;
  if (!editor) {
    return "";
  }

  const title = editor.mode === "create" ? strings.profileEditor.createTitle : strings.profileEditor.editTitle;
  const suggestions = [0, 1, 2].map((index) => editor.suggestedPrompts[index] ?? "");
  return `
    <div class="profile-editor-backdrop" role="presentation" data-profile-editor-backdrop>
      <section class="profile-editor-modal" role="dialog" aria-modal="true" aria-labelledby="profile-editor-title">
        <header class="profile-editor-header">
          <div class="profile-editor-title-row">
            <div class="profile-editor-visual-anchor">
              <button
                id="profile-visual-trigger"
                class="profile-editor-preview-trigger"
                type="button"
                aria-haspopup="dialog"
                aria-expanded="${editor.visualPickerOpen ? "true" : "false"}"
                aria-label="${escapeAttribute(`${strings.profileEditor.color} / ${strings.profileEditor.icon} / ${strings.profileEditor.image}`)}"
              >
                ${renderProfileEditorPreview(editor)}
              </button>
              ${editor.visualPickerOpen ? renderProfileVisualPicker(editor, strings) : ""}
            </div>
            <h2 id="profile-editor-title">${escapeHtml(title)}</h2>
          </div>
          <button id="close-profile-editor" class="icon-button" type="button" aria-label="${escapeAttribute(strings.actions.closeProfileEditor)}">
            ${renderUiIcon("x")}
          </button>
        </header>
        <input id="profile-image-input" type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden />

        <div class="profile-editor-body">
          ${
            editor.error
              ? `<p class="profile-editor-error" role="alert">${escapeHtml(editor.error)}</p>`
              : ""
          }
          <label class="profile-editor-field">
            <span>${escapeHtml(strings.profileEditor.name)}</span>
            <input id="profile-editor-name" class="profile-editor-input" type="text" value="${escapeAttribute(editor.name)}" placeholder="${escapeAttribute(strings.profileEditor.namePlaceholder)}" maxlength="80" />
          </label>
          <label class="profile-editor-field">
            <span>${escapeHtml(strings.profileEditor.instructions)}</span>
            <textarea id="profile-editor-prompt" class="profile-editor-textarea" rows="5" maxlength="${MAX_PROFILE_SYSTEM_PROMPT_LENGTH}" placeholder="${escapeAttribute(strings.profileEditor.instructionsPlaceholder)}">${escapeHtml(editor.systemPrompt)}</textarea>
          </label>

          <section class="profile-editor-section">
            <h3>${escapeHtml(strings.profileEditor.recommendations)}</h3>
            <div class="profile-recommendation-list">
              ${suggestions
                .map(
                  (suggestion, index) => `
                    <input
                      class="profile-editor-input"
                      data-profile-suggestion-input="${index}"
                      type="text"
                      value="${escapeAttribute(suggestion)}"
                      placeholder="${escapeAttribute(strings.profileEditor.recommendationPlaceholder(index + 1))}"
                      maxlength="180"
                    />
                  `,
                )
                .join("")}
            </div>
          </section>
        </div>

        <footer class="profile-editor-actions">
          ${
            editor.mode === "edit" && editor.profileId !== "default"
              ? `<button id="delete-profile-in-editor" class="settings-compact-button danger" type="button">${escapeHtml(strings.actions.deleteProfile)}</button>`
              : `<span></span>`
          }
          <div>
            <button id="cancel-profile-editor" class="settings-compact-button" type="button">${escapeHtml(strings.actions.closeProfileEditor)}</button>
            <button id="save-profile-editor" class="settings-compact-button primary" type="button">${escapeHtml(strings.actions.saveProfile)}</button>
          </div>
        </footer>
      </section>
    </div>
  `;
}

function renderProfileEditorPreview(editor: ProfileEditorState): string {
  return `
    <span class="profile-editor-preview" style="--profile-color: ${escapeAttribute(normalizeProfileColorForUi(editor.color))}">
      ${
        editor.imageDataUrl
          ? `<img src="${escapeAttribute(editor.imageDataUrl)}" alt="" />`
          : renderProfileIcon(editor.icon)
      }
    </span>
  `;
}

function renderProfileVisualPicker(
  editor: ProfileEditorState,
  strings: ReturnType<typeof getUiStrings>,
): string {
  const selectedColor = normalizeProfileColorForUi(editor.color);
  return `
    <div class="profile-visual-picker" role="dialog" aria-label="${escapeAttribute(`${strings.profileEditor.color} / ${strings.profileEditor.icon}`)}">
      <div class="profile-color-grid" role="radiogroup" aria-label="${escapeAttribute(strings.profileEditor.color)}">
        ${PROFILE_EDITOR_COLORS.map(
          (color) => `
            <label class="profile-color-option ${selectedColor === color ? "selected" : ""}" style="--profile-color: ${escapeAttribute(color)}">
              <input type="radio" name="profile-editor-color" value="${escapeAttribute(color)}" ${selectedColor === color ? "checked" : ""} />
              <span></span>
            </label>
          `,
        ).join("")}
      </div>
      <div class="profile-visual-picker-divider" aria-hidden="true"></div>
      <div class="profile-icon-grid" role="radiogroup" aria-label="${escapeAttribute(strings.profileEditor.icon)}">
        ${PROFILE_EDITOR_ICONS.map(
          (icon) => `
            <label class="profile-icon-option ${editor.icon === icon ? "selected" : ""}">
              <input type="radio" name="profile-editor-icon" value="${escapeAttribute(icon)}" ${editor.icon === icon ? "checked" : ""} />
              ${renderProfileIcon(icon)}
            </label>
          `,
        ).join("")}
      </div>
      <div class="profile-visual-picker-divider" aria-hidden="true"></div>
      <div class="profile-visual-image-actions">
        <button id="choose-profile-image" class="settings-compact-button" type="button">${escapeHtml(strings.actions.chooseProfileImage)}</button>
        <button id="remove-profile-image" class="settings-compact-button" type="button" ${editor.imageDataUrl ? "" : "disabled"}>${escapeHtml(strings.actions.removeProfileImage)}</button>
      </div>
      <div class="profile-visual-picker-divider" aria-hidden="true"></div>
      <button id="close-profile-visual-picker" class="profile-visual-picker-close" type="button">${escapeHtml(strings.actions.closeProfileEditor)}</button>
    </div>
  `;
}

function normalizeProfileColorForUi(color: string | undefined): string {
  return typeof color === "string" && /^#[0-9a-f]{6}$/iu.test(color) ? color.toLowerCase() : DEFAULT_PROFILE_VISUAL_COLOR;
}

function clearProfileEditorError(editor: ProfileEditorState): ProfileEditorState {
  const { error: _error, ...rest } = editor;
  return rest;
}

function openProfileEditor(mode: "create" | "edit", profile?: ProfileTemplate | null): void {
  state.profileEditor = createProfileEditorState(mode, profile);
  closeFloatingSurfaces();
  render();
}

function closeProfileEditor(): void {
  state.profileEditor = null;
  render();
}

function createNativeTextDialog(kind: NativeTextDialogState["kind"]): NativeTextDialogState {
  const strings = getUiStrings(state.uiLocale);
  const isKo = state.uiLocale === "ko";
  return {
    kind,
    title: strings.actions.apiKeyFallback,
    description: isKo
      ? "API 키는 확장 프로그램 저장소에 저장하지 않고 로컬 네이티브 브리지로만 전달합니다."
      : "The extension does not store the API key; it is only passed to the local native bridge.",
    label: strings.prompts.apiKey,
    placeholder: "sk-...",
    confirmLabel: strings.actions.save,
    cancelLabel: strings.actions.cancelEdit,
    inputType: "password",
  };
}

function openNativeTextDialog(kind: NativeTextDialogState["kind"]): void {
  state.nativeTextDialog = createNativeTextDialog(kind);
  closeFloatingSurfaces();
  render();
  window.setTimeout(() => root.querySelector<HTMLInputElement>("#native-text-input")?.focus(), 0);
}

async function startCodexOauthLogin(): Promise<void> {
  try {
    await sendRuntimeMessage({ type: "account.login.start", loginType: "chatgpt" });
    await scheduleInitialize();
    state.initError = "";
    state.actionStatus = "";
  } catch (error) {
    state.initError = toUserFacingRuntimeError(error);
    render();
  }
}

function closeNativeTextDialog(): void {
  state.nativeTextDialog = null;
  render();
}

async function submitNativeTextDialog(): Promise<void> {
  const dialog = state.nativeTextDialog;
  if (!dialog || dialog.submitting) {
    return;
  }
  const value = root.querySelector<HTMLInputElement>("#native-text-input")?.value.trim() ?? "";
  if (!value) {
    state.nativeTextDialog = {
      ...dialog,
      error: state.uiLocale === "ko" ? "값을 입력해 주세요." : "Enter a value.",
    };
    render();
    return;
  }

  state.nativeTextDialog = { ...dialog, submitting: true };
  render();

  try {
    await sendRuntimeMessage({ type: "account.login.start", loginType: "apiKey", apiKey: value });
    await scheduleInitialize();
    state.initError = "";
    state.actionStatus = "";
    state.nativeTextDialog = null;
    render();
  } catch (error) {
    state.nativeTextDialog = {
      ...dialog,
      error: toUserFacingRuntimeError(error),
      submitting: false,
    };
    render();
  }
}

function requestNativeConfirmation(
  message: string,
  options: {
    title?: string;
    confirmLabel?: string;
    tone?: NativeConfirmationDialogState["tone"];
  } = {},
): Promise<boolean> {
  const strings = getUiStrings(state.uiLocale);
  const labels =
    state.uiLocale === "ko"
      ? { title: "작업 허용", approve: "허용" }
      : { title: "Allow action", approve: "Allow" };

  nativeConfirmationResolver?.(false);
  state.nativeConfirmationDialog = {
    title: options.title ?? labels.title,
    message,
    confirmLabel: options.confirmLabel ?? labels.approve,
    cancelLabel: strings.actions.cancelEdit,
    tone: options.tone ?? "default",
  };
  closeFloatingSurfaces();
  render();
  window.setTimeout(() => root.querySelector<HTMLButtonElement>("#native-confirmation-approve")?.focus(), 0);

  return new Promise((resolve) => {
    nativeConfirmationResolver = resolve;
  });
}

function resolveNativeConfirmation(approved: boolean): void {
  const resolver = nativeConfirmationResolver;
  nativeConfirmationResolver = null;
  state.nativeConfirmationDialog = null;
  render();
  resolver?.(approved);
}

function readProfileEditorForm(): ProfileEditorState {
  const current = state.profileEditor ?? createProfileEditorState("create");
  const name = root.querySelector<HTMLInputElement>("#profile-editor-name")?.value ?? current.name;
  const systemPrompt = root.querySelector<HTMLTextAreaElement>("#profile-editor-prompt")?.value ?? current.systemPrompt;
  const color =
    root.querySelector<HTMLInputElement>('input[name="profile-editor-color"]:checked')?.value ?? current.color;
  const icon =
    root.querySelector<HTMLInputElement>('input[name="profile-editor-icon"]:checked')?.value ?? current.icon;
  const suggestedPrompts = Array.from(root.querySelectorAll<HTMLInputElement>("[data-profile-suggestion-input]"))
    .sort(
      (left, right) =>
        Number(left.dataset.profileSuggestionInput ?? 0) - Number(right.dataset.profileSuggestionInput ?? 0),
    )
    .map((input) => input.value);
  return {
    ...current,
    name,
    systemPrompt,
    color,
    icon,
    suggestedPrompts,
  };
}

async function submitProfileEditor(): Promise<void> {
  const editor = readProfileEditorForm();
  const name = editor.name.trim();
  const strings = getUiStrings(state.uiLocale);
  if (!name) {
    state.profileEditor = {
      ...editor,
      error: strings.profileEditor.name,
    };
    render();
    return;
  }

  try {
    const result = await sendRuntimeMessage<{
      profiles: ProfileTemplate[];
      selectedProfileId: string;
    }>({
      type: editor.mode === "create" ? "profile.create" : "profile.update",
      profileId: editor.profileId,
      name,
      systemPrompt: editor.systemPrompt,
      visual: {
        color: normalizeProfileColorForUi(editor.color),
        icon: editor.icon,
        ...(editor.imageDataUrl ? { imageDataUrl: editor.imageDataUrl } : {}),
      },
      suggestedPrompts: editor.suggestedPrompts,
    });
    state.profiles = localizeBuiltinProfiles(result.profiles, state.uiLocale);
    selectProfileForComposer(result.selectedProfileId, { visible: true });
    state.profileEditor = null;
    state.actionStatus = strings.status.profileSaved;
    scheduleConversationPersist();
    render();
  } catch (error) {
    state.profileEditor = {
      ...editor,
      error: toUserFacingRuntimeError(error),
    };
    render();
  }
}

async function deleteProfile(profileId: string): Promise<void> {
  const strings = getUiStrings(state.uiLocale);
  if (!profileId || profileId === DEFAULT_PROFILE_ID) {
    return;
  }
  try {
    const result = await sendRuntimeMessage<{
      profiles: ProfileTemplate[];
      selectedProfileId: string;
    }>({
      type: "profile.delete",
      profileId,
    });
    state.profiles = localizeBuiltinProfiles(result.profiles, state.uiLocale);
    state.composerCommandPills = removeComposerCommandPill(state.composerCommandPills, profileId);
    selectProfileForComposer(result.selectedProfileId, { visible: result.selectedProfileId !== DEFAULT_PROFILE_ID });
    state.profileEditor = null;
    state.actionStatus = strings.status.profileDeleted;
    scheduleConversationPersist();
    render();
  } catch (error) {
    state.actionStatus = toUserFacingRuntimeError(error);
    render();
  }
}

async function resetSettingsFromUi(): Promise<void> {
  const strings = getUiStrings(state.uiLocale);
  try {
    const result = await sendRuntimeMessage<{
      settings: ExtensionSettings;
      profiles: ProfileTemplate[];
      selectedProfileId: string;
      selectedModel: string;
      selectedReasoningEffort: string;
      selectedServiceTier: string;
    }>({ type: "settings.reset" });
    state.settings = {
      ...result.settings,
      allowBrowserActions: true,
      browserActionPermissionMode: normalizeBrowserActionPermissionMode(result.settings.browserActionPermissionMode),
      uiLanguage: normalizeUiLanguageSetting(result.settings.uiLanguage),
      preferredVoice: normalizeCodexRealtimeVoice(result.settings.preferredVoice),
    };
    state.uiLocale = resolveUiLocale(state.settings.uiLanguage, getBrowserUiLanguage());
    syncDocumentLanguage();
    state.profiles = localizeBuiltinProfiles(result.profiles, state.uiLocale);
    selectProfileForComposer(result.selectedProfileId, { visible: false });
    state.selectedModel = result.selectedModel;
    state.selectedReasoningEffort = result.selectedReasoningEffort;
    state.selectedServiceTier = result.selectedServiceTier;
    state.composerCommandPills = state.composerCommandPills.filter((pill) => pill.kind !== "profile");
    state.actionStatus = strings.status.settingsReset;
    scheduleConversationPersist();
    render();
  } catch (error) {
    state.actionStatus = toUserFacingRuntimeError(error);
    render();
  }
}

async function setProfileEditorImageFromFile(file: File): Promise<void> {
  const editor = readProfileEditorForm();
  if (file.size > MAX_PROFILE_IMAGE_BYTES) {
    state.profileEditor = {
      ...editor,
      error:
        state.uiLocale === "ko"
          ? "프로필 이미지는 180KB 이하만 사용할 수 있습니다."
          : "Profile images must be 180 KB or smaller.",
    };
    render();
    return;
  }

  const dataUrl = await readFileAsDataUrl(file);
  if (!/^data:image\/(?:png|jpeg|jpg|webp|gif);base64,/iu.test(dataUrl)) {
    state.profileEditor = {
      ...editor,
      error: state.uiLocale === "ko" ? "지원하지 않는 이미지 형식입니다." : "Unsupported image format.",
    };
    render();
    return;
  }

  state.profileEditor = {
    ...clearProfileEditorError(editor),
    imageDataUrl: dataUrl,
  };
  render();
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Failed to read file."));
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsDataURL(file);
  });
}

function renderSettingsCard(id: string, title: string, description: string, rows: string[]): string {
  return `
    <section id="settings-${escapeAttribute(id)}" class="settings-card">
      <div class="settings-card-header">
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(description)}</p>
      </div>
      <div class="settings-row-list">
        ${rows.join("")}
      </div>
    </section>
  `;
}

type SettingsRowOptions = {
  expanded?: boolean;
};

function renderSettingsRow(title: string, description: string, control: string): string;
function renderSettingsRow(id: string, title: string, description: string, control: string, options: SettingsRowOptions): string;
function renderSettingsRow(
  first: string,
  second: string,
  third: string,
  fourth?: string,
  fifth: SettingsRowOptions = {},
): string {
  const hasId = typeof fourth === "string";
  const id = hasId ? first : "";
  const title = hasId ? second : first;
  const description = hasId ? third : second;
  const control = hasId ? fourth : third;
  const options = hasId ? fifth : {};
  const rowClasses = ["settings-row", id ? `settings-row-${id}` : "", options.expanded ? "expanded-control" : ""]
    .filter(Boolean)
    .join(" ");
  return `
    <div class="${escapeAttribute(rowClasses)}">
      <div class="settings-row-copy">
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(description)}</span>
      </div>
      <div class="settings-row-control">${control}</div>
    </div>
  `;
}

function renderSettingsSwitch(id: string, checked: boolean, label: string): string {
  return `
    <label class="settings-switch" aria-label="${escapeAttribute(label)}">
      <input id="${escapeAttribute(id)}" type="checkbox" ${checked ? "checked" : ""} />
      <span aria-hidden="true"></span>
    </label>
  `;
}

function renderLanguageSelect(): string {
  const selectedLanguage = normalizeUiLanguageSetting(state.settings.uiLanguage);
  const strings = getUiStrings(state.uiLocale);
  return `
    <label class="settings-select-shell language-select-shell">
      <select id="setting-ui-language" aria-label="${escapeAttribute(strings.settings.uiLanguage)}">
        ${listSupportedUiLanguageOptions()
          .map(
            (option) =>
              `<option value="${escapeAttribute(option.locale)}" ${
                option.locale === selectedLanguage ? "selected" : ""
              }>${escapeHtml(formatUiLanguageOptionLabel(option, state.uiLocale))}</option>`,
          )
          .join("")}
      </select>
      <span aria-hidden="true">${renderUiIcon("chevron-down")}</span>
    </label>
  `;
}

function renderSettingsStatusPill(label: string, tone: "ok" | "warn" | "neutral"): string {
  return `<span class="settings-status-pill ${tone}">${escapeHtml(label)}</span>`;
}

function renderNativeHostStatus(strings: ReturnType<typeof getUiStrings>, health: NativeHostHealth): string {
  switch (health.status) {
    case "setup-needed":
      return strings.status.setupNeeded;
    case "reconnect":
      return strings.status.reconnectRequired;
    case "connected":
    default:
      return strings.status.connected;
  }
}

function renderNativeHostDetail(strings: ReturnType<typeof getUiStrings>, health: NativeHostHealth): string {
  if (health.detailSource === "error" && state.modelCatalogErrorMessage) {
    return state.modelCatalogErrorMessage;
  }

  return strings.help.nativeHost;
}

function renderCodexBinaryStatus(strings: ReturnType<typeof getUiStrings>, health: CodexBinaryHealth): string {
  switch (health.status) {
    case "pending":
      return strings.status.pending;
    case "not-detected":
      return strings.status.notDetected;
    case "connected":
      return strings.status.connected;
    case "automatic":
    default:
      return strings.status.automatic;
  }
}

function renderCodexBinaryDetail(strings: ReturnType<typeof getUiStrings>, health: CodexBinaryHealth): string {
  switch (health.detailSource) {
    case "waiting-for-host":
      return strings.help.codexBinaryWaitingForHost;
    case "missing":
      return state.modelCatalogErrorMessage || strings.help.codexBinaryMissing;
    case "recovered":
      return strings.help.codexBinaryRecovered;
    case "detected":
    default:
      return strings.help.codexBinaryDetected;
  }
}

function renderImageAssetFolderDetail(strings: ReturnType<typeof getUiStrings>): string {
  const folder = state.imageAssetFolder.latestFolder || state.imageAssetFolder.rootDir;
  if (!folder) {
    return strings.settingsPanel.generatedImagesEmptyDescription;
  }
  const latest = state.imageAssetFolder.latestAssetPath
    ? `${strings.labels.generatedImageLatest}: ${state.imageAssetFolder.latestAssetPath}`
    : strings.settingsPanel.generatedImagesDescription;
  return `${folder} · ${latest}`;
}

function renderDiagnosticLogFolderDetail(strings: ReturnType<typeof getUiStrings>): string {
  if (!state.diagnosticLogFolder.rootDir) {
    return strings.settingsPanel.diagnosticLogsDescription;
  }
  const latest = state.diagnosticLogFolder.latestLogPath
    ? `${state.uiLocale === "ko" ? "최근 로그" : "Latest log"}: ${state.diagnosticLogFolder.latestLogPath}`
    : strings.settingsPanel.diagnosticLogsDescription;
  return `${state.diagnosticLogFolder.rootDir} · ${latest}`;
}

function renderWorkspaceDiagnostics(strings: ReturnType<typeof getUiStrings>): string {
  return `
    <details class="surface stack diagnostics-panel">
      <summary>${escapeHtml(strings.labels.diagnostics)}</summary>
      <section class="stack">
        <div class="stack-header">
          <h2>${escapeHtml(strings.labels.recentChats)}</h2>
          ${
            state.recentChats.length
              ? `<button class="settings-compact-button danger" type="button" data-clear-chat-history="1">${escapeHtml(strings.actions.clearRecentChats)}</button>`
              : ""
          }
        </div>
        ${
          state.recentChats
            .map(
              (chat) => `
                <div class="recent-chat-row">
                  <button class="recent-chat ${chat.id === state.currentConversationId ? "selected" : ""}" data-chat-id="${chat.id}">
                    <strong>${escapeHtml(chat.title)}</strong>
                    <span>${escapeHtml(chat.profileId)}</span>
                    <small>${escapeHtml(formatTimestamp(chat.updatedAt))}</small>
                  </button>
                  <button
                    class="settings-compact-button danger recent-chat-delete"
                    type="button"
                    data-delete-chat-id="${escapeAttribute(chat.id)}"
                    aria-label="${escapeAttribute(strings.actions.deleteChat)}"
                    title="${escapeAttribute(strings.actions.deleteChat)}"
                  >${renderUiIcon("x")}</button>
                </div>
              `,
            )
            .join("") || `<p class="empty-state">${escapeHtml(strings.help.emptyRecentChats)}</p>`
        }
      </section>
      <section class="stack">
        <div class="stack-header">
          <h2>${escapeHtml(strings.labels.codexThreads)}</h2>
        </div>
        ${
          state.serverThreads
            .map(
              (thread) => `
                <button class="recent-chat ${thread.id === state.threadId ? "selected" : ""}" data-server-thread-id="${escapeAttribute(thread.id)}">
                  <strong>${escapeHtml(thread.title)}</strong>
                  <span>${escapeHtml(thread.status)}</span>
                  <small>${escapeHtml(formatTimestamp(thread.updatedAt))}</small>
                </button>
              `,
            )
            .join("") || `<p class="empty-state">${escapeHtml(strings.help.emptyThreads)}</p>`
        }
      </section>
      <section class="stack">
        <div class="stack-header">
          <h2>${escapeHtml(strings.labels.turnPlan)}</h2>
        </div>
        ${
          state.latestPlan?.steps.length
            ? `<div class="meta-list">
                ${state.latestPlan.steps
                  .map((step) => `<p><strong>${escapeHtml(step.status)}</strong><span>${escapeHtml(step.step)}</span></p>`)
                  .join("")}
              </div>`
            : `<p class="empty-state">${escapeHtml(strings.help.emptyPlan)}</p>`
        }
      </section>
      <section class="stack">
        <div class="stack-header">
          <h2>${escapeHtml(strings.labels.turnDiff)}</h2>
        </div>
        ${
          state.latestDiff?.diff
            ? `<pre class="diff-preview">${escapeHtml(state.latestDiff.diff)}</pre>`
            : `<p class="empty-state">${escapeHtml(strings.help.emptyDiff)}</p>`
        }
      </section>
      <section class="stack">
        <div class="stack-header">
          <h2>${escapeHtml(strings.labels.workspaceHarness)}</h2>
        </div>
        ${renderWorkspaceHarness(strings)}
      </section>
    </details>
  `;
}

function hasComposerContextReferences(): boolean {
  return Boolean(
    getCurrentTabReference() ||
      state.attachments.size ||
      state.fileAttachments.length ||
      state.structuredInputs.length,
  );
}

function renderAttachedContextSummary(strings: ReturnType<typeof getUiStrings>): string {
  const currentTab = getCurrentTabReference();
  const currentTabChip = currentTab
    ? [renderPassiveTabReferenceChip(currentTab, strings.labels.currentTab, formatCurrentTabReferenceLabel(currentTab))]
    : [];
  const chips = Array.from(state.attachments).flatMap((attachment) => {
    if (attachment === "open-tabs") {
      return renderOpenTabReferenceChips(strings);
    }
    return [
      `<button class="summary-chip context-chip" data-remove-attachment="${escapeAttribute(attachment)}" title="${escapeAttribute(strings.actions.removeAttachment)}" aria-label="${escapeAttribute(strings.actions.removeAttachment)}">
        <span>@${escapeHtml(attachment)}</span>
        <span class="summary-chip-dismiss">${renderUiIcon("x")}</span>
      </button>`,
    ];
  });
  const files = state.fileAttachments.map((attachment) => renderFileAttachmentChip(attachment, strings));

  const structured = state.structuredInputs.map(
    (input) =>
      `<span class="summary-chip subtle">${escapeHtml(structuredInputRoleLabel(input, strings))}: ${escapeHtml(input.name)}</span>`,
  );

  const contextReferences = [...currentTabChip, ...chips, ...structured];
  const sections: string[] = [];
  if (contextReferences.length) {
    sections.push(`
      <div class="composer-context-group" data-composer-context-group="references">
        ${contextReferences.join("")}
      </div>
    `);
  }
  if (files.length) {
    const label = state.uiLocale === "ko" ? "파일" : "Files";
    sections.push(`
      <div class="composer-file-group" data-composer-file-group="files">
        <span class="composer-file-label">${escapeHtml(label)}</span>
        <div class="composer-file-list">
          ${files.join("")}
        </div>
      </div>
    `);
  }

  return sections.join("");
}

function renderFileAttachmentChip(attachment: UserFileAttachment, strings: ReturnType<typeof getUiStrings>): string {
  if (attachment.kind === "image" && isAnnotatableImageAttachment(attachment)) {
    const label =
      state.uiLocale === "ko"
        ? `${attachment.name} 편집 영역 표시`
        : `Mark edit area on ${attachment.name}`;
    return `
      <span class="summary-chip file-chip image-file-chip">
        <button
          class="file-chip-preview"
          data-edit-file-image-id="${escapeAttribute(attachment.id)}"
          title="${escapeAttribute(label)}"
          aria-label="${escapeAttribute(label)}"
        >
          <img src="${escapeAttribute(getImageAttachmentDataUrl(attachment))}" alt="" loading="lazy" />
          <span>${escapeHtml(createFileChipLabel(attachment))}</span>
        </button>
        <button
          class="file-chip-remove"
          data-remove-file-id="${escapeAttribute(attachment.id)}"
          title="${escapeAttribute(strings.actions.removeAttachment)}"
          aria-label="${escapeAttribute(strings.actions.removeAttachment)}"
        >${renderUiIcon("x")}</button>
      </span>
    `;
  }

  return `
    <button class="summary-chip file-chip" data-remove-file-id="${escapeAttribute(attachment.id)}" title="${escapeAttribute(strings.actions.removeAttachment)}" aria-label="${escapeAttribute(strings.actions.removeAttachment)}">
      <span>${escapeHtml(createFileChipLabel(attachment))}</span>
      <span class="summary-chip-dismiss">${renderUiIcon("x")}</span>
    </button>
  `;
}

function renderImageAnnotationEditor(strings: ReturnType<typeof getUiStrings>): string {
  if (!state.imageAnnotationEditor) {
    return "";
  }
  const editorSource = resolveImageAnnotationEditorSource();
  if (!editorSource) {
    return "";
  }

  const labels =
    state.uiLocale === "ko"
      ? {
          title: editorSource.mode === "followup" ? "선택 항목 편집" : "편집할 위치 표시",
          close: "닫기",
          done: editorSource.mode === "followup" ? "첨부" : "완료",
          send: "보내기",
          undo: "되돌리기",
          clear: "전체 지우기",
          deleteSelected: "선택 삭제",
          select: "선택",
          draw: "그리기",
          arrow: "화살표",
          text: "텍스트",
          promptPlaceholder: "편집 내용을 설명하세요",
          addReference: "이미지 추가",
          zoomIn: "확대",
          zoomOut: "축소",
          zoomReset: "맞춤",
          help:
            editorSource.mode === "followup"
              ? "생성된 이미지에서 수정할 영역을 표시한 뒤 후속 명령을 입력해 바로 편집을 요청할 수 있습니다."
              : "이미지 위에 그리거나 화살표/텍스트를 남기면 Codex가 편집할 영역을 더 정확히 이해합니다.",
        }
      : {
          title: editorSource.mode === "followup" ? "Edit selected image" : "Mark edit area",
          close: "Close",
          done: editorSource.mode === "followup" ? "Attach" : "Done",
          send: "Send",
          undo: "Undo",
          clear: "Clear",
          deleteSelected: "Delete selected",
          select: "Select",
          draw: "Draw",
          arrow: "Arrow",
          text: "Text",
          promptPlaceholder: "Describe the edit",
          addReference: "Add image",
          zoomIn: "Zoom in",
          zoomOut: "Zoom out",
          zoomReset: "Fit",
          help:
            editorSource.mode === "followup"
              ? "Mark the generated image and send a follow-up edit instruction directly."
              : "Draw, add arrows, or add text on the image so Codex can understand exactly where to edit.",
        };
  const colors = ["#ff453a", "#ffcc00", "#30d158", "#0a84ff", "#ffffff"];
  return `
    <div class="image-annotation-backdrop" role="dialog" aria-modal="true" aria-label="${escapeAttribute(labels.title)}">
      <header class="image-annotation-topbar">
        <button class="icon-button image-annotation-close" data-image-annotation-cancel aria-label="${escapeAttribute(labels.close)}">
          ${renderUiIcon("arrow-left")}
        </button>
        <div class="image-annotation-title">
          <strong>${escapeHtml(labels.title)}</strong>
          <span>${escapeHtml(editorSource.name)}</span>
        </div>
        <button class="image-annotation-done" data-image-annotation-done>${escapeHtml(labels.done)}</button>
      </header>
      <div class="image-annotation-workspace">
        <div class="image-annotation-stage">
          <div class="image-annotation-viewport" data-image-annotation-viewport>
            <div class="image-annotation-stage-inner" data-image-annotation-stage-inner>
              <img id="annotation-source-image" src="${escapeAttribute(editorSource.dataUrl)}" alt="${escapeAttribute(editorSource.name)}" />
              <canvas id="annotation-canvas"></canvas>
            </div>
          </div>
          <form class="annotation-text-popover" data-annotation-text-popover hidden>
            <input
              id="annotation-text-input"
              type="text"
              placeholder="${escapeAttribute(labels.text)}"
              autocomplete="off"
            />
            <button type="button" data-annotation-text-cancel>${escapeHtml(labels.close)}</button>
            <button type="submit">${escapeHtml(labels.done)}</button>
          </form>
        </div>
        <div class="image-annotation-zoom-controls" aria-label="${escapeAttribute(labels.title)}">
          <button type="button" data-image-annotation-zoom-out aria-label="${escapeAttribute(labels.zoomOut)}">${renderUiIcon("minus")}</button>
          <span data-image-annotation-zoom-label>100%</span>
          <button type="button" data-image-annotation-zoom-in aria-label="${escapeAttribute(labels.zoomIn)}">${renderUiIcon("plus")}</button>
          <button type="button" data-image-annotation-zoom-reset>${escapeHtml(labels.zoomReset)}</button>
        </div>
        <p class="image-annotation-help">${escapeHtml(labels.help)}</p>
        <div class="image-annotation-toolbar" aria-label="${escapeAttribute(labels.title)}">
          <div class="image-annotation-colors">
            ${colors
              .map(
                (color, index) => `
                  <button
                    class="annotation-color ${index === 0 ? "selected" : ""}"
                    data-annotation-color="${escapeAttribute(color)}"
                    style="--annotation-color: ${escapeAttribute(color)}"
                    aria-label="${escapeAttribute(color)}"
                  ></button>
                `,
              )
              .join("")}
          </div>
          <div class="image-annotation-tools">
            <button class="annotation-tool selected" data-annotation-tool="select">${escapeHtml(labels.select)}</button>
            <button class="annotation-tool" data-annotation-tool="draw">${escapeHtml(labels.draw)}</button>
            <button class="annotation-tool" data-annotation-tool="arrow">${escapeHtml(labels.arrow)}</button>
            <button class="annotation-tool" data-annotation-tool="text">${escapeHtml(labels.text)}</button>
          </div>
          <div class="image-annotation-actions">
            <button class="annotation-secondary" data-image-annotation-undo>${escapeHtml(labels.undo)}</button>
            <button class="annotation-secondary danger" data-image-annotation-delete-selected>${escapeHtml(labels.deleteSelected)}</button>
            <button class="annotation-secondary" data-image-annotation-clear>${escapeHtml(labels.clear)}</button>
          </div>
        </div>
        ${
          editorSource.mode === "followup"
            ? `<form class="image-annotation-followup" data-image-annotation-followup>
                <input id="image-annotation-reference-input" type="file" accept="image/*" multiple hidden />
                ${renderImageAnnotationReferenceChips(strings)}
                <button
                  type="button"
                  class="icon-button annotation-plus"
                  data-image-annotation-add-reference
                  title="${escapeAttribute(labels.addReference)}"
                  aria-label="${escapeAttribute(labels.addReference)}"
                >${renderUiIcon("plus")}</button>
                <textarea id="image-annotation-followup-input" placeholder="${escapeAttribute(labels.promptPlaceholder)}"></textarea>
                <button class="image-annotation-send" type="submit" aria-label="${escapeAttribute(labels.send)}">
                  ${renderUiIcon("send")}
                </button>
              </form>`
            : ""
        }
      </div>
    </div>
  `;
}

function renderImageAnnotationReferenceChips(strings: ReturnType<typeof getUiStrings>): string {
  const references = state.imageAnnotationReferenceAttachments;
  if (references.length === 0) {
    return "";
  }
  return `
    <div class="image-annotation-reference-chips" aria-label="${escapeAttribute(strings.labels.files)}">
      ${references.map((attachment) => renderImageAnnotationReferenceChip(attachment, strings)).join("")}
    </div>
  `;
}

function renderImageAnnotationReferenceChip(
  attachment: UserFileAttachment,
  strings: ReturnType<typeof getUiStrings>,
): string {
  return `
    <button
      class="summary-chip file-chip"
      data-remove-image-annotation-reference-id="${escapeAttribute(attachment.id)}"
      title="${escapeAttribute(strings.actions.removeAttachment)}"
      aria-label="${escapeAttribute(strings.actions.removeAttachment)}"
      type="button"
    >
      <span>${escapeHtml(createFileChipLabel(attachment))}</span>
      <span class="summary-chip-dismiss">${renderUiIcon("x")}</span>
    </button>
  `;
}

function resolveImageAnnotationEditorSource():
  | { mode: "attachment"; name: string; dataUrl: string; attachment: UserFileAttachment }
  | { mode: "followup"; name: string; dataUrl: string }
  | null {
  const editor = state.imageAnnotationEditor;
  if (!editor) {
    return null;
  }
  if (editor.source === "conversation") {
    return {
      mode: "followup",
      name: editor.name,
      dataUrl: editor.dataUrl,
    };
  }

  const attachment = state.fileAttachments.find((item) => item.id === editor.attachmentId);
  if (!attachment || !isAnnotatableImageAttachment(attachment)) {
    return null;
  }
  return {
    mode: "attachment",
    name: attachment.name,
    dataUrl: getImageAttachmentDataUrl(attachment),
    attachment,
  };
}

function getCurrentTabReference(): OpenTabContext | null {
  if (!state.currentTabReference || isCurrentTabContextDismissed()) {
    return null;
  }
  return state.currentTabReference;
}

function getCurrentTabContextKey(tab: OpenTabContext | null = state.currentTabReference): string {
  return tab ? `${tab.tabId}:${tab.url}` : "";
}

function isCurrentTabContextDismissed(): boolean {
  const key = getCurrentTabContextKey();
  return Boolean(key && state.currentTabContextDismissedKey === key);
}

function renderOpenTabReferenceChips(strings: ReturnType<typeof getUiStrings>): string[] {
  const selectedTabs = state.openTabOptions.filter((tab) => state.selectedTabIds.includes(tab.tabId));
  if (selectedTabs.length === 0) {
    return [
      `<button class="summary-chip context-chip" data-remove-attachment="open-tabs" title="${escapeAttribute(strings.actions.removeAttachment)}" aria-label="${escapeAttribute(strings.actions.removeAttachment)}">
        <span>@${escapeHtml(renderOpenTabsSummaryLabel(strings))}</span>
        <span class="summary-chip-dismiss">${renderUiIcon("x")}</span>
      </button>`,
    ];
  }

  return selectedTabs.slice(0, 4).map(
    (tab) => `
      <button class="summary-chip tab-reference-chip removable" data-remove-tab-id="${tab.tabId}" title="${escapeAttribute(strings.actions.removeAttachment)}" aria-label="${escapeAttribute(strings.actions.removeAttachment)}">
        ${renderTabReferenceIcon(tab)}
        <span>${escapeHtml(formatTabReferenceLabel(tab))}</span>
        <span class="summary-chip-dismiss">${renderUiIcon("x")}</span>
      </button>
    `,
  );
}

function renderPassiveTabReferenceChip(tab: OpenTabContext, title: string, label = formatTabReferenceLabel(tab)): string {
  return `
    <button class="summary-chip tab-reference-chip current removable" data-remove-current-tab-context title="${escapeAttribute(title)}" aria-label="${escapeAttribute(title)}">
      ${renderTabReferenceIcon(tab, label)}
      <span>${escapeHtml(label)}</span>
      <span class="summary-chip-dismiss">${renderUiIcon("x")}</span>
    </button>
  `;
}

function renderTabReferenceIcon(tab: OpenTabContext, label = formatTabReferenceLabel(tab)): string {
  if (tab.favIconUrl) {
    return `<span class="tab-reference-icon image"><img src="${escapeAttribute(tab.favIconUrl)}" alt="" loading="lazy" /></span>`;
  }
  return `<span class="tab-reference-icon fallback-web" title="${escapeAttribute(label)}">${renderUiIcon("globe", "tab-reference-lucide-icon")}</span>`;
}

function renderOpenTabsLabel(strings: ReturnType<typeof getUiStrings>): string {
  const count = state.selectedTabIds.length;
  return count ? `${strings.labels.openTabs} (${count})` : strings.labels.openTabs;
}

function renderOpenTabsSummaryLabel(strings: ReturnType<typeof getUiStrings>): string {
  const selectedTabs = state.openTabOptions.filter((tab) => state.selectedTabIds.includes(tab.tabId));
  if (selectedTabs.length === 1) {
    return truncateLabel(selectedTabs[0]?.title || strings.labels.openTabs, 30);
  }
  if (selectedTabs.length > 1) {
    return `${truncateLabel(selectedTabs[0]?.title || strings.labels.openTabs, 22)} +${selectedTabs.length - 1}`;
  }
  return `${strings.labels.openTabs} (${state.selectedTabIds.length || "auto"})`;
}

function truncateLabel(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, Math.max(0, maxLength - 1))}...` : value;
}

function renderContextReferenceChip(
  id: PromptRequestPayload["attachments"][number],
  label: string,
): string {
  return `<span class="chip ${state.attachments.has(id) ? "active" : ""}" title="${escapeAttribute(label)}">@${escapeHtml(id)}</span>`;
}

function defaultPromptForContext(strings: ReturnType<typeof getUiStrings>): string {
  if (state.fileAttachments.length > 0 && state.attachments.has("current-page")) {
    return strings.prompts.analyzeFilesAndPage;
  }

  if (state.fileAttachments.length > 0) {
    return strings.prompts.analyzeFiles;
  }

  return "";
}

function buildConversationContextHint(): string {
  return state.messages
    .slice(-8)
    .map((message) => `${message.role}: ${message.text}`)
    .join("\n")
    .slice(-3000);
}

function hasComposerDropPayload(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) {
    return false;
  }
  if (dataTransfer.files.length > 0) {
    return true;
  }
  const types = Array.from(dataTransfer.types ?? []);
  return types.some((type) => type === "text/html" || type === "text/uri-list" || type === "text/plain");
}

async function ingestSelectedFiles(fileList: FileList | File[]): Promise<void> {
  const files = Array.from(fileList);
  if (files.length === 0) {
    return;
  }

  const plan = planAttachmentSelection(
    state.fileAttachments,
    files.map((file) => ({
      name: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      lastModified: file.lastModified,
    })),
  );
  const acceptedByFingerprint = new Map<string, (typeof plan.accepted)[number]>(
    plan.accepted.map((attachment) => [createAttachmentFingerprint(attachment), attachment] as const),
  );
  const nextAttachments: UserFileAttachment[] = [];

  for (const file of files) {
    const key = createAttachmentFingerprint({
      name: file.name,
      sizeBytes: file.size,
      lastModified: file.lastModified,
    });
    const accepted = acceptedByFingerprint.get(key);
    if (!accepted) {
      continue;
    }

    nextAttachments.push({
      id: `file-${Date.now()}-${nextAttachments.length + state.fileAttachments.length}`,
      name: accepted.name,
      mimeType: accepted.mimeType,
      sizeBytes: accepted.sizeBytes,
      lastModified: accepted.lastModified,
      base64: await readFileAsBase64(file),
      kind: accepted.kind,
    });
  }

  state.fileAttachments = [...state.fileAttachments, ...nextAttachments];
  state.actionStatus = summarizeRejectedFiles(plan.rejected, stringsForState());
  render();
}

async function ingestImageAnnotationReferenceFiles(fileList: FileList | File[]): Promise<void> {
  const files = Array.from(fileList);
  if (files.length === 0) {
    return;
  }

  const plan = planAttachmentSelection(
    state.imageAnnotationReferenceAttachments,
    files.map((file) => ({
      name: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      lastModified: file.lastModified,
    })),
  );
  const acceptedByFingerprint = new Map<string, (typeof plan.accepted)[number]>(
    plan.accepted.map((attachment) => [createAttachmentFingerprint(attachment), attachment] as const),
  );
  const nextAttachments: UserFileAttachment[] = [];

  for (const file of files) {
    const key = createAttachmentFingerprint({
      name: file.name,
      sizeBytes: file.size,
      lastModified: file.lastModified,
    });
    const accepted = acceptedByFingerprint.get(key);
    if (!accepted || accepted.kind !== "image") {
      continue;
    }

    nextAttachments.push({
      id: `image-annotation-reference-${Date.now()}-${nextAttachments.length + state.imageAnnotationReferenceAttachments.length}`,
      name: accepted.name,
      mimeType: accepted.mimeType,
      sizeBytes: accepted.sizeBytes,
      lastModified: accepted.lastModified,
      base64: await readFileAsBase64(file),
      kind: accepted.kind,
    });
  }

  state.imageAnnotationReferenceAttachments = [...state.imageAnnotationReferenceAttachments, ...nextAttachments];
  state.actionStatus = summarizeRejectedFiles(plan.rejected, stringsForState());
  render();
}

function ingestRemoteImageUrls(urls: string[]): void {
  const incoming = urls.map((url, index) => createRemoteImageAttachment(url, index));
  if (incoming.length === 0) {
    return;
  }

  const plan = planAttachmentSelection(state.fileAttachments, incoming);
  const acceptedFingerprints = new Set(plan.accepted.map((attachment) => createAttachmentFingerprint(attachment)));
  const nextAttachments = incoming.filter((attachment) => acceptedFingerprints.has(createAttachmentFingerprint(attachment)));
  state.fileAttachments = [...state.fileAttachments, ...nextAttachments];
  state.actionStatus = summarizeRejectedFiles(plan.rejected, stringsForState());
  render();
}

function installImageAnnotationEditorHandlers(): void {
  const editor = state.imageAnnotationEditor;
  if (!editor) {
    return;
  }
  const editorSource = resolveImageAnnotationEditorSource();
  const image = root.querySelector<HTMLImageElement>("#annotation-source-image");
  const canvas = root.querySelector<HTMLCanvasElement>("#annotation-canvas");
  const viewport = root.querySelector<HTMLDivElement>("[data-image-annotation-viewport]");
  const stageInner = root.querySelector<HTMLDivElement>("[data-image-annotation-stage-inner]");
  const zoomLabel = root.querySelector<HTMLSpanElement>("[data-image-annotation-zoom-label]");
  const context = canvas?.getContext("2d");
  const textPopover = root.querySelector<HTMLFormElement>("[data-annotation-text-popover]");
  const textInput = root.querySelector<HTMLInputElement>("#annotation-text-input");
  if (!editorSource || !image || !canvas || !viewport || !stageInner || !context) {
    return;
  }

  type AnnotationTool = "select" | "draw" | "arrow" | "text";
  type AnnotationPoint = { x: number; y: number };
  type VectorAnnotation =
    | { id: string; type: "arrow"; from: AnnotationPoint; to: AnnotationPoint; color: string }
    | { id: string; type: "text"; x: number; y: number; text: string; color: string; rotation: number };
  type AnnotationSnapshot = {
    rasterDataUrl: string;
    annotations: VectorAnnotation[];
  };

  let tool: AnnotationTool = "select";
  let color = "#ff453a";
  let drawing = false;
  let startPoint = { x: 0, y: 0 };
  let selectedAnnotationId: string | null = null;
  let draggedAnnotationId: string | null = null;
  let rotatingAnnotationId: string | null = null;
  let rotationCenter: AnnotationPoint | null = null;
  let rotationStartAngle = 0;
  let rotationStartAnnotation: VectorAnnotation | null = null;
  let lastDragPoint: AnnotationPoint | null = null;
  let panning = false;
  let lastPanClientPoint: AnnotationPoint | null = null;
  let pendingTextPoint: AnnotationPoint | null = null;
  let annotationZoom = 1;
  const undoStack: AnnotationSnapshot[] = [];
  const vectorAnnotations: VectorAnnotation[] = [];
  const rasterCanvas = document.createElement("canvas");
  const rasterContext = rasterCanvas.getContext("2d");
  if (!rasterContext) {
    return;
  }

  const cloneAnnotation = (annotation: VectorAnnotation): VectorAnnotation =>
    annotation.type === "arrow"
      ? {
          ...annotation,
          from: { ...annotation.from },
          to: { ...annotation.to },
        }
      : { ...annotation };

  const cloneAnnotations = (): VectorAnnotation[] => vectorAnnotations.map(cloneAnnotation);

  const fitAnnotationStage = () => {
    const width = image.naturalWidth || canvas.width || 1;
    const height = image.naturalHeight || canvas.height || 1;
    const viewportRect = viewport.getBoundingClientRect();
    const maxWidth = Math.max(160, viewportRect.width - 24);
    const maxHeight = Math.max(160, viewportRect.height - 24);
    const fitScale = Math.min(maxWidth / width, maxHeight / height, 1);
    const displayWidth = Math.max(160, Math.round(width * fitScale * annotationZoom));
    const displayHeight = Math.max(120, Math.round(height * fitScale * annotationZoom));
    stageInner.style.width = `${displayWidth}px`;
    stageInner.style.height = `${displayHeight}px`;
    if (zoomLabel) {
      zoomLabel.textContent = `${Math.round(annotationZoom * 100)}%`;
    }
  };

  const setAnnotationZoom = (nextZoom: number) => {
    annotationZoom = Math.max(0.5, Math.min(4, nextZoom));
    fitAnnotationStage();
  };

  canvas.dataset.annotationTool = tool;

  const initializeCanvas = () => {
    const width = image.naturalWidth || image.clientWidth || 1;
    const height = image.naturalHeight || image.clientHeight || 1;
    canvas.width = width;
    canvas.height = height;
    rasterCanvas.width = width;
    rasterCanvas.height = height;
    context.lineCap = "round";
    context.lineJoin = "round";
    rasterContext.lineCap = "round";
    rasterContext.lineJoin = "round";
    fitAnnotationStage();
    renderCanvas();
  };

  const pointFromEvent = (event: PointerEvent) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - rect.left) / Math.max(1, rect.width)) * canvas.width,
      y: ((event.clientY - rect.top) / Math.max(1, rect.height)) * canvas.height,
    };
  };

  const annotationLineWidth = () => Math.max(5, Math.min(canvas.width, canvas.height) * 0.01);
  const annotationFontSize = () => Math.max(28, Math.min(canvas.width, canvas.height) * 0.045);
  const rotationHandleRadius = () => Math.max(13, annotationLineWidth() * 1.65);

  const normalizeAngle = (angle: number) => {
    const fullTurn = Math.PI * 2;
    return ((angle % fullTurn) + fullTurn) % fullTurn;
  };

  const rotatePoint = (point: AnnotationPoint, center: AnnotationPoint, angle: number): AnnotationPoint => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    return {
      x: center.x + dx * cos - dy * sin,
      y: center.y + dx * sin + dy * cos,
    };
  };

  const angleFromCenter = (center: AnnotationPoint, point: AnnotationPoint) =>
    Math.atan2(point.y - center.y, point.x - center.x);

  const updateSelectedAnnotationDataset = () => {
    const selected = vectorAnnotations.find((annotation) => annotation.id === selectedAnnotationId);
    canvas.dataset.annotationCount = String(vectorAnnotations.length);
    if (!selected) {
      delete canvas.dataset.selectedAnnotationType;
      delete canvas.dataset.selectedAnnotationPosition;
      delete canvas.dataset.selectedAnnotationRotation;
      return;
    }
    canvas.dataset.selectedAnnotationType = selected.type;
    canvas.dataset.selectedAnnotationPosition =
      selected.type === "arrow"
        ? `${selected.from.x.toFixed(2)},${selected.from.y.toFixed(2)},${selected.to.x.toFixed(2)},${selected.to.y.toFixed(2)}`
        : `${selected.x.toFixed(2)},${selected.y.toFixed(2)}`;
    canvas.dataset.selectedAnnotationRotation =
      selected.type === "arrow"
        ? Math.atan2(selected.to.y - selected.from.y, selected.to.x - selected.from.x).toFixed(3)
        : selected.rotation.toFixed(3);
  };

  const drawArrowPath = (
    targetContext: CanvasRenderingContext2D,
    from: AnnotationPoint,
    to: AnnotationPoint,
    arrowColor: string,
    selected: boolean,
  ) => {
    const angle = Math.atan2(to.y - from.y, to.x - from.x);
    const headLength = Math.max(14, Math.min(canvas.width, canvas.height) * 0.035);
    targetContext.save();
    targetContext.strokeStyle = arrowColor;
    targetContext.fillStyle = arrowColor;
    targetContext.lineWidth = annotationLineWidth();
    targetContext.lineCap = "round";
    targetContext.lineJoin = "round";
    targetContext.beginPath();
    targetContext.moveTo(from.x, from.y);
    targetContext.lineTo(to.x, to.y);
    targetContext.stroke();
    targetContext.beginPath();
    targetContext.moveTo(to.x, to.y);
    targetContext.lineTo(to.x - headLength * Math.cos(angle - Math.PI / 6), to.y - headLength * Math.sin(angle - Math.PI / 6));
    targetContext.lineTo(to.x - headLength * Math.cos(angle + Math.PI / 6), to.y - headLength * Math.sin(angle + Math.PI / 6));
    targetContext.closePath();
    targetContext.fill();
    if (selected) {
      targetContext.setLineDash([7, 5]);
      targetContext.lineWidth = Math.max(2, annotationLineWidth() * 0.45);
      targetContext.strokeStyle = "rgba(169, 199, 255, 0.95)";
      targetContext.beginPath();
      targetContext.moveTo(from.x, from.y);
      targetContext.lineTo(to.x, to.y);
      targetContext.stroke();
    }
    targetContext.restore();
  };

  const textBoxFor = (annotation: Extract<VectorAnnotation, { type: "text" }>) => {
    context.save();
    context.font = `700 ${annotationFontSize()}px sans-serif`;
    const metrics = context.measureText(annotation.text);
    context.restore();
    return {
      x: annotation.x - 10,
      y: annotation.y - 8,
      width: metrics.width + 20,
      height: annotationFontSize() + 18,
    };
  };

  const textCenterFor = (annotation: Extract<VectorAnnotation, { type: "text" }>): AnnotationPoint => {
    const box = textBoxFor(annotation);
    return {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2,
    };
  };

  const annotationCenterFor = (annotation: VectorAnnotation): AnnotationPoint =>
    annotation.type === "arrow"
      ? {
          x: (annotation.from.x + annotation.to.x) / 2,
          y: (annotation.from.y + annotation.to.y) / 2,
        }
      : textCenterFor(annotation);

  const rotationHandleFor = (annotation: VectorAnnotation): AnnotationPoint => {
    if (annotation.type === "arrow") {
      const center = annotationCenterFor(annotation);
      const dx = annotation.to.x - annotation.from.x;
      const dy = annotation.to.y - annotation.from.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      const offset = Math.max(40, annotationLineWidth() * 5);
      return {
        x: center.x + (-dy / length) * offset,
        y: center.y + (dx / length) * offset,
      };
    }

    const box = textBoxFor(annotation);
    const center = textCenterFor(annotation);
    return rotatePoint(
      {
        x: box.x + box.width / 2,
        y: box.y - Math.max(34, annotationLineWidth() * 4),
      },
      center,
      annotation.rotation,
    );
  };

  const renderRotationHandle = (targetContext: CanvasRenderingContext2D, annotation: VectorAnnotation) => {
    const center = annotationCenterFor(annotation);
    const handle = rotationHandleFor(annotation);
    targetContext.save();
    targetContext.strokeStyle = "rgba(169, 199, 255, 0.95)";
    targetContext.fillStyle = "rgba(15, 17, 20, 0.86)";
    targetContext.lineWidth = Math.max(2, annotationLineWidth() * 0.36);
    targetContext.setLineDash([6, 5]);
    targetContext.beginPath();
    targetContext.moveTo(center.x, center.y);
    targetContext.lineTo(handle.x, handle.y);
    targetContext.stroke();
    targetContext.setLineDash([]);
    targetContext.beginPath();
    targetContext.arc(handle.x, handle.y, rotationHandleRadius(), 0, Math.PI * 2);
    targetContext.fill();
    targetContext.stroke();
    targetContext.beginPath();
    targetContext.arc(handle.x, handle.y, rotationHandleRadius() * 0.38, 0, Math.PI * 1.45);
    targetContext.stroke();
    targetContext.restore();
  };

  function renderCanvas(): void {
    const targetCanvas = canvas;
    const targetContext = context;
    if (!targetCanvas || !targetContext) {
      return;
    }
    targetContext.clearRect(0, 0, targetCanvas.width, targetCanvas.height);
    targetContext.drawImage(rasterCanvas, 0, 0);
    for (const annotation of vectorAnnotations) {
      if (annotation.type === "arrow") {
        drawArrowPath(targetContext, annotation.from, annotation.to, annotation.color, annotation.id === selectedAnnotationId);
        if (annotation.id === selectedAnnotationId) {
          renderRotationHandle(targetContext, annotation);
        }
        continue;
      }
      const box = textBoxFor(annotation);
      const center = textCenterFor(annotation);
      targetContext.save();
      targetContext.translate(center.x, center.y);
      targetContext.rotate(annotation.rotation);
      if (annotation.id === selectedAnnotationId) {
        targetContext.fillStyle = "rgba(10, 12, 16, 0.42)";
        targetContext.strokeStyle = "rgba(169, 199, 255, 0.95)";
        targetContext.lineWidth = 2;
        targetContext.setLineDash([7, 5]);
        targetContext.strokeRect(box.x - center.x, box.y - center.y, box.width, box.height);
        targetContext.setLineDash([]);
        targetContext.fillRect(box.x - center.x, box.y - center.y, box.width, box.height);
      }
      targetContext.fillStyle = annotation.color;
      targetContext.font = `700 ${annotationFontSize()}px sans-serif`;
      targetContext.textBaseline = "top";
      targetContext.shadowColor = "rgba(0, 0, 0, 0.45)";
      targetContext.shadowBlur = 6;
      targetContext.lineWidth = 5;
      targetContext.strokeStyle = "rgba(0, 0, 0, 0.56)";
      targetContext.strokeText(annotation.text, annotation.x - center.x, annotation.y - center.y);
      targetContext.fillText(annotation.text, annotation.x - center.x, annotation.y - center.y);
      targetContext.restore();
      if (annotation.id === selectedAnnotationId) {
        renderRotationHandle(targetContext, annotation);
      }
    }
    updateSelectedAnnotationDataset();
  }

  const pushUndoSnapshot = () => {
    undoStack.push({
      rasterDataUrl: rasterCanvas.toDataURL("image/png"),
      annotations: cloneAnnotations(),
    });
    if (undoStack.length > 24) {
      undoStack.shift();
    }
  };

  const restoreSnapshot = (snapshot: AnnotationSnapshot) => {
    vectorAnnotations.splice(0, vectorAnnotations.length, ...snapshot.annotations);
    selectedAnnotationId = null;
    const snapshotImage = new Image();
    snapshotImage.onload = () => {
      rasterContext.clearRect(0, 0, rasterCanvas.width, rasterCanvas.height);
      rasterContext.drawImage(snapshotImage, 0, 0, rasterCanvas.width, rasterCanvas.height);
      renderCanvas();
    };
    snapshotImage.src = snapshot.rasterDataUrl;
  };

  const distanceToSegment = (point: AnnotationPoint, start: AnnotationPoint, end: AnnotationPoint) => {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;
    if (lengthSquared === 0) {
      return Math.hypot(point.x - start.x, point.y - start.y);
    }
    const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
    return Math.hypot(point.x - (start.x + t * dx), point.y - (start.y + t * dy));
  };

  const hitTestRotationHandle = (point: AnnotationPoint): VectorAnnotation | null => {
    const selected = vectorAnnotations.find((annotation) => annotation.id === selectedAnnotationId);
    if (!selected) {
      return null;
    }
    const handle = rotationHandleFor(selected);
    return Math.hypot(point.x - handle.x, point.y - handle.y) <= rotationHandleRadius() * 1.35
      ? selected
      : null;
  };

  const hitTestAnnotation = (point: AnnotationPoint): VectorAnnotation | null => {
    for (let index = vectorAnnotations.length - 1; index >= 0; index -= 1) {
      const annotation = vectorAnnotations[index];
      if (!annotation) {
        continue;
      }
      if (annotation.type === "text") {
        const box = textBoxFor(annotation);
        const unrotatedPoint = rotatePoint(point, textCenterFor(annotation), -annotation.rotation);
        if (
          unrotatedPoint.x >= box.x - 8 &&
          unrotatedPoint.x <= box.x + box.width + 8 &&
          unrotatedPoint.y >= box.y - 8 &&
          unrotatedPoint.y <= box.y + box.height + 8
        ) {
          return annotation;
        }
        continue;
      }
      if (distanceToSegment(point, annotation.from, annotation.to) <= Math.max(12, annotationLineWidth() * 1.8)) {
        return annotation;
      }
    }
    return null;
  };

  const moveAnnotation = (annotation: VectorAnnotation, dx: number, dy: number) => {
    if (annotation.type === "text") {
      annotation.x += dx;
      annotation.y += dy;
      return;
    }
    annotation.from.x += dx;
    annotation.from.y += dy;
    annotation.to.x += dx;
    annotation.to.y += dy;
  };

  const rotateAnnotation = (
    annotation: VectorAnnotation,
    center: AnnotationPoint,
    angleDelta: number,
    original: VectorAnnotation,
  ) => {
    if (annotation.type === "text" && original.type === "text") {
      annotation.rotation = normalizeAngle(original.rotation + angleDelta);
      return;
    }
    if (annotation.type === "arrow" && original.type === "arrow") {
      annotation.from = rotatePoint(original.from, center, angleDelta);
      annotation.to = rotatePoint(original.to, center, angleDelta);
    }
  };

  const deleteSelectedAnnotation = () => {
    if (!selectedAnnotationId) {
      return;
    }
    const index = vectorAnnotations.findIndex((annotation) => annotation.id === selectedAnnotationId);
    if (index < 0) {
      selectedAnnotationId = null;
      renderCanvas();
      return;
    }
    pushUndoSnapshot();
    vectorAnnotations.splice(index, 1);
    selectedAnnotationId = null;
    renderCanvas();
  };

  const capturePointer = (event: PointerEvent) => {
    try {
      canvas.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic events and some browsers may not have an active pointer to capture.
    }
  };

  const releasePointer = (event: PointerEvent) => {
    try {
      canvas.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released by the browser.
    }
  };

  const startPanning = (event: PointerEvent) => {
    panning = true;
    lastPanClientPoint = { x: event.clientX, y: event.clientY };
    canvas.dataset.annotationPanning = "true";
    capturePointer(event);
  };

  const stopPanning = () => {
    panning = false;
    lastPanClientPoint = null;
    delete canvas.dataset.annotationPanning;
  };

  const closeTextPopover = () => {
    pendingTextPoint = null;
    if (textPopover) {
      textPopover.hidden = true;
    }
    if (textInput) {
      textInput.value = "";
    }
  };

  const showTextPopover = (point: AnnotationPoint, event: PointerEvent) => {
    if (!textPopover || !textInput) {
      return;
    }
    pendingTextPoint = point;
    const stageRect = textPopover.parentElement?.getBoundingClientRect();
    const left = stageRect ? Math.max(16, Math.min(stageRect.width - 16, event.clientX - stageRect.left)) : 16;
    const top = stageRect ? Math.max(16, Math.min(stageRect.height - 16, event.clientY - stageRect.top)) : 16;
    textPopover.style.left = `${left}px`;
    textPopover.style.top = `${top}px`;
    textPopover.hidden = false;
    textInput.value = "";
    window.setTimeout(() => textInput.focus(), 0);
  };

  const addText = (point: AnnotationPoint, value: string) => {
    const text = value.trim();
    if (!text) {
      closeTextPopover();
      return;
    }
    pushUndoSnapshot();
    const annotation = {
      id: `annotation-text-${Date.now()}-${vectorAnnotations.length}`,
      type: "text" as const,
      x: point.x,
      y: point.y,
      text,
      color,
      rotation: 0,
    };
    vectorAnnotations.push(annotation);
    selectedAnnotationId = annotation.id;
    closeTextPopover();
    renderCanvas();
  };

  if (image.complete) {
    initializeCanvas();
  } else {
    image.addEventListener("load", initializeCanvas, { once: true });
  }

  canvas.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    if (canvas.width <= 1 || canvas.height <= 1) {
      initializeCanvas();
    }
    const point = pointFromEvent(event);
    const rotationHit = hitTestRotationHandle(point);
    if (rotationHit) {
      pushUndoSnapshot();
      selectedAnnotationId = rotationHit.id;
      rotatingAnnotationId = rotationHit.id;
      rotationCenter = annotationCenterFor(rotationHit);
      rotationStartAngle = angleFromCenter(rotationCenter, point);
      rotationStartAnnotation = cloneAnnotation(rotationHit);
      renderCanvas();
      capturePointer(event);
      return;
    }

    const hitAnnotation = hitTestAnnotation(point);
    if (hitAnnotation) {
      pushUndoSnapshot();
      selectedAnnotationId = hitAnnotation.id;
      draggedAnnotationId = hitAnnotation.id;
      lastDragPoint = point;
      renderCanvas();
      capturePointer(event);
      return;
    }

    if (tool === "select") {
      closeTextPopover();
      selectedAnnotationId = null;
      renderCanvas();
      startPanning(event);
      return;
    }

    if (tool === "text") {
      showTextPopover(point, event);
      return;
    }

    pushUndoSnapshot();
    drawing = true;
    startPoint = point;
    capturePointer(event);
    if (tool === "draw") {
      selectedAnnotationId = null;
      rasterContext.strokeStyle = color;
      rasterContext.lineWidth = annotationLineWidth();
      rasterContext.beginPath();
      rasterContext.moveTo(point.x, point.y);
      renderCanvas();
    }
  });

  canvas.addEventListener("pointermove", (event) => {
    if (panning && lastPanClientPoint) {
      event.preventDefault();
      viewport.scrollLeft -= event.clientX - lastPanClientPoint.x;
      viewport.scrollTop -= event.clientY - lastPanClientPoint.y;
      lastPanClientPoint = { x: event.clientX, y: event.clientY };
      return;
    }

    const point = pointFromEvent(event);
    if (rotatingAnnotationId && rotationCenter && rotationStartAnnotation) {
      event.preventDefault();
      const annotation = vectorAnnotations.find((item) => item.id === rotatingAnnotationId);
      if (!annotation) {
        return;
      }
      rotateAnnotation(
        annotation,
        rotationCenter,
        angleFromCenter(rotationCenter, point) - rotationStartAngle,
        rotationStartAnnotation,
      );
      renderCanvas();
      return;
    }

    if (draggedAnnotationId && lastDragPoint) {
      event.preventDefault();
      const annotation = vectorAnnotations.find((item) => item.id === draggedAnnotationId);
      if (!annotation) {
        return;
      }
      moveAnnotation(annotation, point.x - lastDragPoint.x, point.y - lastDragPoint.y);
      lastDragPoint = point;
      renderCanvas();
      return;
    }

    if (!drawing) {
      return;
    }
    event.preventDefault();
    if (tool === "draw") {
      rasterContext.lineTo(point.x, point.y);
      rasterContext.stroke();
      renderCanvas();
      return;
    }
    if (tool === "arrow") {
      renderCanvas();
      drawArrowPath(context, startPoint, point, color, false);
    }
  });

  const stopDrawing = (event: PointerEvent) => {
    if (panning) {
      event.preventDefault();
      stopPanning();
      releasePointer(event);
      return;
    }

    if (rotatingAnnotationId) {
      event.preventDefault();
      rotatingAnnotationId = null;
      rotationCenter = null;
      rotationStartAnnotation = null;
      renderCanvas();
      releasePointer(event);
      return;
    }

    if (draggedAnnotationId) {
      event.preventDefault();
      draggedAnnotationId = null;
      lastDragPoint = null;
      renderCanvas();
      releasePointer(event);
      return;
    }

    if (!drawing) {
      return;
    }
    event.preventDefault();
    drawing = false;
    if (tool === "arrow") {
      const annotation = {
        id: `annotation-arrow-${Date.now()}-${vectorAnnotations.length}`,
        type: "arrow" as const,
        from: { ...startPoint },
        to: pointFromEvent(event),
        color,
      };
      vectorAnnotations.push(annotation);
      selectedAnnotationId = annotation.id;
    }
    renderCanvas();
    releasePointer(event);
  };

  canvas.addEventListener("pointerup", stopDrawing);
  canvas.addEventListener("pointercancel", stopDrawing);

  root.querySelectorAll<HTMLButtonElement>("[data-annotation-tool]").forEach((button) => {
    button.addEventListener("click", () => {
      tool = (button.dataset.annotationTool as AnnotationTool) ?? "select";
      canvas.dataset.annotationTool = tool;
      stopPanning();
      root.querySelectorAll("[data-annotation-tool]").forEach((item) => item.classList.remove("selected"));
      button.classList.add("selected");
    });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-annotation-color]").forEach((button) => {
    button.addEventListener("click", () => {
      color = button.dataset.annotationColor || color;
      root.querySelectorAll("[data-annotation-color]").forEach((item) => item.classList.remove("selected"));
      button.classList.add("selected");
    });
  });

  root.querySelector<HTMLButtonElement>("[data-image-annotation-undo]")?.addEventListener("click", () => {
    const snapshot = undoStack.pop();
    if (!snapshot) {
      return;
    }
    restoreSnapshot(snapshot);
  });

  root.querySelector<HTMLButtonElement>("[data-image-annotation-delete-selected]")?.addEventListener("click", () => {
    closeTextPopover();
    deleteSelectedAnnotation();
  });

  root.querySelector<HTMLButtonElement>("[data-image-annotation-clear]")?.addEventListener("click", () => {
    closeTextPopover();
    pushUndoSnapshot();
    selectedAnnotationId = null;
    vectorAnnotations.splice(0, vectorAnnotations.length);
    rasterContext.clearRect(0, 0, rasterCanvas.width, rasterCanvas.height);
    renderCanvas();
  });

  root.querySelector<HTMLButtonElement>("[data-image-annotation-zoom-in]")?.addEventListener("click", () => {
    setAnnotationZoom(annotationZoom + 0.25);
  });

  root.querySelector<HTMLButtonElement>("[data-image-annotation-zoom-out]")?.addEventListener("click", () => {
    setAnnotationZoom(annotationZoom - 0.25);
  });

  root.querySelector<HTMLButtonElement>("[data-image-annotation-zoom-reset]")?.addEventListener("click", () => {
    setAnnotationZoom(1);
  });

  textPopover?.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!pendingTextPoint) {
      closeTextPopover();
      return;
    }
    addText(pendingTextPoint, textInput?.value ?? "");
  });

  root.querySelector<HTMLButtonElement>("[data-annotation-text-cancel]")?.addEventListener("click", closeTextPopover);

  root.querySelector<HTMLButtonElement>("[data-image-annotation-cancel]")?.addEventListener("click", () => {
    state.imageAnnotationEditor = null;
    state.imageAnnotationReferenceAttachments = [];
    render();
  });

  root.querySelector<HTMLButtonElement>("[data-image-annotation-add-reference]")?.addEventListener("click", () => {
    root.querySelector<HTMLInputElement>("#image-annotation-reference-input")?.click();
  });

  root.querySelector<HTMLInputElement>("#image-annotation-reference-input")?.addEventListener("change", async (event) => {
    const input = event.currentTarget as HTMLInputElement;
    if (!input.files?.length) {
      return;
    }
    await ingestImageAnnotationReferenceFiles(input.files);
    input.value = "";
  });

  root.querySelectorAll<HTMLButtonElement>("[data-remove-image-annotation-reference-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.removeImageAnnotationReferenceId;
      if (!id) {
        return;
      }
      state.imageAnnotationReferenceAttachments = state.imageAnnotationReferenceAttachments.filter(
        (attachment) => attachment.id !== id,
      );
      render();
    });
  });

  const createAnnotatedDataUrl = () => {
    if (canvas.width <= 1 || canvas.height <= 1) {
      initializeCanvas();
    }
    const output = document.createElement("canvas");
    output.width = canvas.width;
    output.height = canvas.height;
    const outputContext = output.getContext("2d");
    if (!outputContext) {
      return "";
    }
    outputContext.drawImage(image, 0, 0, output.width, output.height);
    renderCanvas();
    outputContext.drawImage(canvas, 0, 0);
    return output.toDataURL("image/png");
  };

  const attachAnnotatedImage = () => {
    const dataUrl = createAnnotatedDataUrl();
    if (!dataUrl) {
      return null;
    }
    if (editorSource.mode === "attachment") {
      const annotated = createAnnotatedImageAttachment(editorSource.attachment, dataUrl);
      state.fileAttachments = state.fileAttachments.map((item) => (item.id === editorSource.attachment.id ? annotated : item));
      return annotated;
    }

    const annotated = createImageAttachmentFromDataUrl({
      id: `generated-followup-${Date.now()}`,
      name: appendFollowupImageName(editorSource.name),
      dataUrl,
    });
    return annotated;
  };

  root.querySelector<HTMLButtonElement>("[data-image-annotation-done]")?.addEventListener("click", () => {
    const annotated = attachAnnotatedImage();
    if (!annotated) {
      return;
    }
    state.imageAnnotationEditor = null;
    state.imageAnnotationReferenceAttachments = [];
    if (editorSource.mode === "followup") {
      state.fileAttachments = [
        annotated,
        ...state.fileAttachments.filter((attachment) => !attachment.id.startsWith("generated-followup-")),
      ];
    }
    state.actionStatus =
      editorSource.mode === "followup"
        ? state.uiLocale === "ko"
          ? "선택한 생성 이미지를 다음 후속 명령의 편집 대상으로 첨부했습니다."
          : "Selected generated image was attached as the next edit target."
        : state.uiLocale === "ko"
          ? "표시한 편집 영역을 첨부 이미지에 반영했습니다."
          : "Marked edit area was applied to the attached image.";
    render();
  });

  root.querySelector<HTMLFormElement>("[data-image-annotation-followup]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const prompt = root.querySelector<HTMLTextAreaElement>("#image-annotation-followup-input")?.value.trim() ?? "";
    const annotated = attachAnnotatedImage();
    if (!annotated) {
      return;
    }
    state.imageAnnotationEditor = null;
    const previousFileAttachments = state.fileAttachments;
    const referenceAttachments = state.imageAnnotationReferenceAttachments;
    state.imageAnnotationReferenceAttachments = [];
    if (!prompt) {
      if (editorSource.mode === "followup") {
        state.fileAttachments = [
          annotated,
          ...state.fileAttachments.filter((attachment) => !attachment.id.startsWith("generated-followup-")),
        ];
      }
      state.actionStatus =
        state.uiLocale === "ko"
          ? "선택한 생성 이미지를 다음 후속 명령의 편집 대상으로 첨부했습니다."
          : "Selected generated image was attached as the next edit target.";
      render();
      focusComposerAtEnd();
      return;
    }
    state.fileAttachments =
      editorSource.mode === "followup"
        ? [annotated, ...referenceAttachments]
        : state.fileAttachments;
    renderSync();
    try {
      await sendPrompt(prompt);
    } finally {
      state.fileAttachments = previousFileAttachments;
    }
  });
}

function appendFollowupImageName(name: string): string {
  const sanitized = name.trim() || "generated-image.png";
  const withoutAnnotated = sanitized.replace(/\.annotated(?=\.[^.]+$)/iu, "");
  const extensionMatch = /\.[^.]+$/u.exec(withoutAnnotated);
  if (!extensionMatch) {
    return `${withoutAnnotated}.annotated.png`;
  }
  return `${withoutAnnotated.slice(0, extensionMatch.index)}.annotated.png`;
}

function removeFileAttachment(id: string): void {
  state.fileAttachments = state.fileAttachments.filter((attachment) => attachment.id !== id);
  if (state.imageAnnotationEditor?.source === "file" && state.imageAnnotationEditor.attachmentId === id) {
    state.imageAnnotationEditor = null;
    state.imageAnnotationReferenceAttachments = [];
  }
}

function clearFileAttachments(): void {
  state.fileAttachments = [];
  state.imageAnnotationEditor = null;
  state.imageAnnotationReferenceAttachments = [];
}

function clearVisualPromptAttachments(): void {
  state.attachments.delete("image");
  state.attachments.delete("selection");
  state.currentReadStrategy = "auto";
  clearFileAttachments();
}

function dismissCurrentTabContext(): void {
  state.currentTabContextDismissedKey = getCurrentTabContextKey();
  state.attachments.delete("current-page");
  state.attachments.delete("selection");
  state.attachments.delete("image");
  state.currentReadStrategy = "auto";
}

function clearTransientComposerContext(): void {
  state.attachments = new Set();
  state.selectedTabIds = [];
  state.historyQuery = "";
  state.currentReadStrategy = "auto";
  state.structuredInputs = [];
  clearFileAttachments();
}

function clearTransientComposerCommandPill(): void {
  state.composerCommandPills = clearTransientComposerCommandPills(state.composerCommandPills);
}

function installSmokeHarness(): void {
  if (!smokeTestMode) {
    return;
  }

  window.__CODEX_SIDEPANEL_SMOKE__ = {
    async waitForComposer(timeoutMs = 5_000): Promise<void> {
      const deadline = Date.now() + timeoutMs;
      while (Date.now() < deadline) {
        if (root.querySelector("#composer")) {
          return;
        }
        await new Promise((resolve) => window.setTimeout(resolve, 50));
      }
      throw new Error("Smoke harness timed out waiting for the composer.");
    },
    async injectFiles(files: SmokeAttachmentSeed[]): Promise<string[]> {
      const now = Date.now();
      const browserFiles = files.map(
        (file, index) =>
          new File([base64ToBuffer(file.base64)], file.name, {
            type: file.mimeType,
            lastModified: file.lastModified ?? now + index,
          }),
      );
      await ingestSelectedFiles(browserFiles);
      return state.fileAttachments.map((attachment) => createFileChipLabel(attachment));
    },
    enableDryRunSubmit(): void {
      smokeDryRunSubmissions = [];
    },
    getDryRunSubmissions(): string[] {
      return Array.from(smokeDryRunSubmissions);
    },
    async submitWithEnter(text: string) {
      const composer = root.querySelector<HTMLTextAreaElement>("#composer");
      if (!composer) {
        return {
          submissionCount: smokeDryRunSubmissions.length,
          lastSubmission: smokeDryRunSubmissions.at(-1) ?? null,
          composerValue: null,
          commandPills: 0,
          slashOptions: 0,
        };
      }

      composer.value = text;
      composer.dispatchEvent(new Event("input", { bubbles: true }));
      composer.focus();
      composer.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
      await new Promise((resolve) => window.setTimeout(resolve, 40));

      return {
        submissionCount: smokeDryRunSubmissions.length,
        lastSubmission: smokeDryRunSubmissions.at(-1) ?? null,
        composerValue: root.querySelector<HTMLTextAreaElement>("#composer")?.value ?? null,
        commandPills: root.querySelectorAll("[data-composer-command-pill]").length,
        slashOptions: root.querySelectorAll("[data-slash-option-id]").length,
      };
    },
    typeIntoComposer(text: string) {
      const composer = root.querySelector<HTMLTextAreaElement>("#composer");
      if (!composer) {
        return {
          sameNode: false,
          activeId: document.activeElement?.id ?? null,
          value: null,
        };
      }

      composer.focus();
      for (const character of text) {
        composer.value += character;
        composer.dispatchEvent(new Event("input", { bubbles: true }));
      }

      const currentComposer = root.querySelector<HTMLTextAreaElement>("#composer");
      return {
        sameNode: composer === currentComposer,
        activeId: document.activeElement?.id ?? null,
        value: currentComposer?.value ?? null,
      };
    },
    inspectCommandPopoverForTest(text: string) {
      state.openTabOptions = [
        {
          tabId: 101,
          title: "ChatGPT",
          url: "https://chatgpt.com/",
          pinned: false,
          audible: false,
        },
        {
          tabId: 102,
          title: "YouTube",
          url: "https://www.youtube.com/watch?v=demo",
          pinned: false,
          audible: false,
        },
      ];
      state.openTabOptionsState = "ready";
      state.profiles = state.profiles.length
        ? state.profiles
        : [
            {
              id: "default",
              name: "Default",
              systemPrompt: "",
              defaultContextPolicy: {
                attachCurrentPageByDefault: false,
                allowedReadStrategies: ["dom"],
              },
              allowedSources: [],
              preferredActions: [],
              adapterHints: [],
            },
          ];
      state.composerDraft = text;
      state.mentionQuery = extractMentionQuery(text);
      state.slashQuery = extractSlashQuery(text);
      renderSync();
      const composer = root.querySelector<HTMLTextAreaElement>("#composer");
      composer?.focus({ preventScroll: true });
      if (composer) {
        composer.selectionStart = composer.value.length;
        composer.selectionEnd = composer.value.length;
        rememberComposerInteraction(composer);
      }
      return {
        mentionQuery: state.mentionQuery,
        slashQuery: state.slashQuery,
        suggestionCount: root.querySelectorAll(".suggestions").length,
        tabSuggestionCount: root.querySelectorAll("[data-tab-mention-id]").length,
        slashSuggestionCount: root.querySelectorAll("[data-slash-option-id]").length,
        popoverText: root.querySelector(".suggestions")?.textContent?.replace(/\s+/g, " ").trim() ?? "",
        activeId: document.activeElement?.id ?? null,
        composerValue: root.querySelector<HTMLTextAreaElement>("#composer")?.value ?? null,
        shellOverflow: getComputedStyle(root.querySelector<HTMLElement>(".composer-shell") as HTMLElement).overflow,
      };
    },
    simulateActiveTabUpdateForTest(input) {
      state.profiles = state.profiles.length
        ? state.profiles
        : [
            {
              id: "default",
              name: "Default",
              systemPrompt: "",
              defaultContextPolicy: {
                attachCurrentPageByDefault: false,
                allowedReadStrategies: ["dom"],
              },
              allowedSources: [],
              preferredActions: [],
              adapterHints: [],
            },
            {
              id: "marketing-strategist",
              name: "Marketing Strategist",
              systemPrompt: "",
              defaultContextPolicy: {
                attachCurrentPageByDefault: true,
                allowedReadStrategies: ["dom"],
              },
              allowedSources: ["current-page", "file"],
              preferredActions: ["draft-blog-post"],
              adapterHints: [],
            },
          ];
      applyActiveTabUpdate({
        currentPageSupport: {
          available: true,
          blockedReason: "",
        },
        currentTab: {
          tabId: 404,
          title: input.title,
          url: input.url,
          pinned: false,
          audible: false,
        },
        actionCards: input.actionCards.map((card) => ({ ...card })) as ActionCard[],
      });
      renderSync();
      return {
        currentTabTitle: state.currentTabReference?.title ?? "",
        actionCardCount: state.actionCards.length,
        suggestionCount: root.querySelectorAll(".site-suggestion").length,
        firstSuggestionTitle: root.querySelector(".site-suggestion strong")?.textContent ?? "",
        suggestionTitles: Array.from(root.querySelectorAll(".site-suggestion strong")).map((node) => node.textContent ?? ""),
        currentTabContextChip: root.querySelectorAll("[data-remove-current-tab-context]").length,
        pageContextSuppressed: isCurrentTabContextDismissed(),
      };
    },
    selectProfileForTest(profileId: string) {
      selectProfileForComposer(profileId, { visible: profileId !== DEFAULT_PROFILE_ID });
      renderSync();
      return {
        selectedProfileId: state.selectedProfileId,
        suggestionCount: root.querySelectorAll(".site-suggestion").length,
        firstSuggestionTitle: root.querySelector(".site-suggestion strong")?.textContent ?? "",
        suggestionTitles: Array.from(root.querySelectorAll(".site-suggestion strong")).map((node) => node.textContent ?? ""),
      };
    },
    preserveComposerFocusOnRender() {
      const composer = root.querySelector<HTMLTextAreaElement>("#composer");
      if (!composer) {
        return {
          activeId: document.activeElement?.id ?? null,
          value: null,
        };
      }

      composer.focus();
      composer.selectionStart = composer.value.length;
      composer.selectionEnd = composer.value.length;
      rememberComposerInteraction(composer);
      renderSync();
      const currentComposer = root.querySelector<HTMLTextAreaElement>("#composer");
      return {
        activeId: document.activeElement?.id ?? null,
        value: currentComposer?.value ?? null,
      };
    },
    setPromptActivityForTest(active: boolean) {
      state.promptActivity = active
        ? {
            clientRequestId: "smoke-pending",
            phase: "responding",
          }
        : null;
      renderSync();
      const sendButton = root.querySelector<HTMLButtonElement>("#send-prompt");
      return {
        sendButtonDisabled: !sendButton || sendButton.disabled,
        stopButtonVisible: Boolean(root.querySelector<HTMLButtonElement>("#stop-turn")),
        promptActivityVisible: Boolean(root.querySelector(".prompt-activity-card")),
        promptActivityRailVisible: Boolean(root.querySelector(".prompt-activity-rail")),
      };
    },
    setActiveTurnForTest(active: boolean) {
      state.threadId = active ? "smoke-thread" : "";
      state.activeTurn = active ? { threadId: "smoke-thread", turnId: "smoke-turn" } : null;
      renderSync();
      const stopButton = root.querySelector<HTMLButtonElement>("#stop-turn");
      return {
        sendButtonVisible: Boolean(root.querySelector("#send-prompt")),
        stopButtonVisible: Boolean(stopButton),
        stopButtonInSubmitSlot: Boolean(stopButton?.closest(".composer-submit")),
        stopButtonHasSquareIcon: Boolean(stopButton?.classList.contains("stop")),
        chatSignalsVisible: Boolean(root.querySelector(".chat-signals")),
      };
    },
    setPendingPermissionForTest() {
      state.pendingPermission = {
        plan: {
          origins: ["https://example.org/*"],
          rationale: UI_STRINGS.en.permissions.siteRead,
        },
        errorMessage: "This function must be called during a user gesture",
      };
      renderSync();
      return {
        hasPrompt: Boolean(root.querySelector(".permission-prompt")),
        hasButton: Boolean(root.querySelector("#grant-pending-permission")),
      };
    },
    setModelCatalogForTest(input) {
      state.models = input.models;
      state.modelCatalogState = input.models.length ? "ready" : "empty";
      state.modelCatalogErrorMessage = "";
      state.selectedModel = input.selectedModel;
      state.selectedReasoningEffort = input.selectedReasoningEffort ?? "";
      state.selectedServiceTier = input.selectedServiceTier ?? "";
      syncSelectedReasoningEffort();
      renderSync();
      return {
        selectedModel: state.selectedModel,
        selectedReasoningEffort: state.selectedReasoningEffort,
        selectedServiceTier: state.selectedServiceTier,
      };
    },
    setView(view: MainView): string {
      state.activeView = view;
      renderSync();
      return state.activeView;
    },
    snapshot() {
      return {
        activeView: state.activeView,
        actionStatus: state.actionStatus,
        modelLabel: renderModelChipLabel(stringsForState(), state.models.find((model) => model.id === state.selectedModel) ?? null),
        fileChipLabels: state.fileAttachments.map((attachment) => createFileChipLabel(attachment)),
        messageCount: state.messages.length,
      };
    },
    seedChatFixture(input) {
      state.activeView = "chat";
      state.messages = input.messages;
      state.actionCards = input.actionCards?.map((card) => ({ ...card })) ?? [];
      renderSync();
      return {
        activeView: state.activeView,
        messageCount: state.messages.length,
      };
    },
    scrollChatBy(offset: number) {
      const container = root.querySelector<HTMLElement>("#chat-scroll");
      if (!container) {
        return {
          hasScrollableArea: false,
          before: 0,
          after: 0,
        };
      }
      const before = container.scrollTop;
      container.scrollTop = before + offset;
      return {
        hasScrollableArea: container.scrollHeight > container.clientHeight,
        before,
        after: container.scrollTop,
      };
    },
  };
}

function summarizeRejectedFiles(rejected: string[], strings: ReturnType<typeof getUiStrings>): string {
  if (rejected.length === 0) {
    return "";
  }

  const first = rejected[0] ?? "";
  const [reason, name] = first.split(":");
  switch (reason) {
    case "duplicate":
      return strings.status.duplicateFile(name || "");
    case "file-too-large":
      return strings.status.fileTooLarge(name || "");
    case "too-many":
      return strings.status.tooManyFiles;
    case "total-too-large":
      return strings.status.totalFilesTooLarge;
    default:
      return strings.status.fileAttachFailed;
  }
}

function stringsForState(): ReturnType<typeof getUiStrings> {
  return getUiStrings(state.uiLocale);
}

async function readFileAsBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  return arrayBufferToBase64(arrayBuffer);
}

async function installSkillArchive(file: File): Promise<void> {
  const strings = stringsForState();
  if (!file.name.toLowerCase().endsWith(".zip") && file.type !== "application/zip") {
    state.actionStatus = strings.status.skillArchiveInstallFailed;
    render();
    return;
  }

  state.actionStatus = strings.status.loading;
  render();
  try {
    const result = await sendRuntimeMessage<SkillArchiveInstallResult & { error?: string }>({
      type: "skills.archive.install",
      filename: file.name,
      base64: await readFileAsBase64(file),
    });
    if (result.error) {
      throw new Error(result.error);
    }

    state.appServerSkills = mergeCodexSkillOptions(state.appServerSkills, result.skills);
    state.actionStatus = strings.status.skillArchiveInstalled(result.skills.length);
    render();
  } catch (error) {
    state.actionStatus = `${strings.status.skillArchiveInstallFailed} ${error instanceof Error ? error.message : ""}`.trim();
    render();
  }
}

function mergeCodexSkillOptions(left: CodexSkillOption[], right: CodexSkillOption[]): CodexSkillOption[] {
  const byId = new Map<string, CodexSkillOption>();
  for (const skill of [...left, ...right]) {
    byId.set(skill.id, skill);
  }
  return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function base64ToBuffer(value: string): ArrayBuffer {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes.buffer;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

function renderModelChipLabel(
  strings: ReturnType<typeof getUiStrings>,
  selectedModel: CodexModelOption | null,
): string {
  switch (state.modelCatalogState) {
    case "loading":
      return strings.status.modelCatalogLoading;
    case "error":
      return strings.status.modelCatalogError;
    case "empty":
      return strings.status.modelCatalogEmpty;
    case "ready":
    default:
      return selectedModel?.label ?? strings.status.modelCatalogEmpty;
  }
}

function renderAccountBadge(): string {
  if (!state.accountStatus) {
    return getUiStrings(state.uiLocale).status.loading;
  }

  if (state.accountStatus.authMode === "chatgpt") {
    return getUiStrings(state.uiLocale).status.chatgpt;
  }
  if (state.accountStatus.authMode === "apikey") {
    return getUiStrings(state.uiLocale).status.apiKeyFallback;
  }
  return getUiStrings(state.uiLocale).status.signedOut;
}

function renderRateLimitBadge(rateLimits: CodexRateLimits): string {
  const strings = getUiStrings(state.uiLocale);
  const bucket = rateLimits.defaultBucket ?? rateLimits.buckets[0];
  if (!bucket?.primary) {
    return strings.status.rateLimitsUnavailable;
  }

  const reset = bucket.primary.resetsAt ? formatTimestamp(bucket.primary.resetsAt * 1000) : "later";
  return strings.status.rateLimitUsed(bucket.limitName ?? "Codex", bucket.primary.usedPercent, reset);
}

function isCurrentTurnActive(): boolean {
  if (!state.activeTurn) {
    return false;
  }

  if (!state.threadId) {
    return true;
  }

  return state.activeTurn.threadId === state.threadId;
}

function canSendCurrentComposerMessage(): boolean {
  return canSendComposerMessage({
    turnActive: isCurrentTurnActive(),
    promptActivityActive: Boolean(state.promptActivity),
    streamingAssistantActive: state.streamingAssistantMessageIds.size > 0,
  });
}

function isQuickInteractionLockedForState(): boolean {
  return isQuickInteractionLocked({
    turnActive: isCurrentTurnActive(),
    promptActivityActive: Boolean(state.promptActivity),
  });
}

function toggleStructuredInput(input: CodexStructuredInput): void {
  if (state.structuredInputs.some((current) => current.id === input.id)) {
    state.structuredInputs = state.structuredInputs.filter((current) => current.id !== input.id);
    return;
  }

  state.structuredInputs = [...state.structuredInputs, input];
}

async function toggleCodexSkillEnabled(skillId: string): Promise<void> {
  const nextIds = toggleEnabledCodexSkillId(state.settings.enabledCodexSkillIds, skillId);
  const result = await sendRuntimeMessage<ExtensionSettings>({
    type: "settings.update",
    settings: { enabledCodexSkillIds: nextIds },
  });
  state.settings = {
    ...result,
    preferredVoice: normalizeCodexRealtimeVoice(result.preferredVoice),
  };
  state.structuredInputs = state.structuredInputs.filter((input) => input.type !== "skill" || nextIds.includes(input.id));
  scheduleConversationPersist();
}

function getPromptStructuredInputs(): CodexStructuredInput[] {
  return mergeStructuredInputsWithEnabledCodexSkills(
    state.structuredInputs,
    state.appServerSkills,
    state.settings.enabledCodexSkillIds,
  );
}

async function removeComposerCommandPillSelection(pillId: string, kind: ComposerCommandPill["kind"]): Promise<void> {
  state.composerCommandPills = removeComposerCommandPill(state.composerCommandPills, pillId);
  void kind;
  selectProfileForComposer(DEFAULT_PROFILE_ID, { visible: false });
  await sendRuntimeMessage({ type: "profile.select", profileId: DEFAULT_PROFILE_ID });
  scheduleConversationPersist();
}

function findMentionOption(id: string) {
  return listMentionOptions(state.mentionQuery ?? "", state.uiLocale, {
    apps: state.connectedApps,
    plugins: state.appServerPlugins,
    skills: state.appServerSkills,
  }).find((option) => option.id === id);
}

function findSlashOption(id: string) {
  return getSlashOptionsForState().find((option) => option.id === id);
}

function getSlashOptionsForState(): SlashCommandOption[] {
  if (state.slashQuery === null) {
    return [];
  }

  return listSlashCommandOptions(
    state.slashQuery,
    [],
    state.profiles,
    state.uiLocale,
    state.selectedProfileId,
  ).slice(0, 12);
}

function isComposerDropdownOpen(): boolean {
  return (
    state.slashQuery !== null ||
    state.mentionQuery !== null ||
    state.attachmentMenuOpen ||
    state.browserActionPermissionMenuOpen ||
    state.composerModelMenuOpen ||
    state.appMenuOpen
  );
}

async function applySlashOption(option: SlashCommandOption): Promise<void> {
  const selectedProfileId = selectProfileForComposer(option.profileId, { visible: option.profileId !== DEFAULT_PROFILE_ID });
  state.composerDraft = removeActiveSlashToken(state.composerDraft);
  state.slashQuery = null;
  state.slashActiveIndex = 0;
  void sendRuntimeMessage({ type: "profile.select", profileId: selectedProfileId }).catch((error) => {
    state.initError = toUserFacingRuntimeError(error, stringsForState().errors.init);
    render();
  });
  scheduleConversationPersist();
}

function moveSlashCommandSelection(key: string): boolean {
  if (state.slashQuery === null || !isSlashCommandArrowKey(key)) {
    return false;
  }

  const options = getSlashOptionsForState();
  if (!options.length) {
    return false;
  }

  state.slashActiveIndex = getNextSlashCommandIndex(
    state.slashActiveIndex,
    options.length,
    key === "ArrowDown" ? "down" : "up",
  );
  render();
  return true;
}

function restoreComposerFocus(preventScroll = false): void {
  const composer = root.querySelector<HTMLTextAreaElement>("#composer");
  if (!composer) {
    return;
  }
  composer.value = state.composerDraft;
  composer.focus({ preventScroll });
  composer.selectionStart = composer.value.length;
  composer.selectionEnd = composer.value.length;
  rememberComposerInteraction(composer);
}

async function acceptActiveSlashOptionFromComposer(): Promise<boolean> {
  const options = getSlashOptionsForState();
  const option = options[clampSlashCommandIndex(state.slashActiveIndex, options.length)];
  if (!option) {
    return false;
  }
  await applySlashOption(option);
  renderSync();
  restoreComposerFocus(true);
  return true;
}

function removeActiveMentionToken(value: string): string {
  return value.replace(/(?:^|\s)@[\p{L}\p{N}-]*$/iu, (match) => (match.startsWith(" ") ? " " : "")).trimEnd();
}

function structuredInputRoleLabel(input: CodexStructuredInput, strings: ReturnType<typeof getUiStrings>): string {
  if (input.type === "skill") {
    return strings.roles.skill;
  }
  return input.path.startsWith("plugin://") ? strings.roles.plugin : strings.roles.app;
}

function renderReadModeButton(mode: ReadStrategy | "auto", label: string): string {
  return `<button class="mode ${state.currentReadStrategy === mode ? "selected" : ""}" data-mode="${mode}">${escapeHtml(label)}</button>`;
}

function renderWorkspaceHarness(strings: ReturnType<typeof getUiStrings>): string {
  if (!state.workspaceHarness) {
    return `<p class="empty-state">${escapeHtml(strings.help.harnessLoading)}</p>`;
  }

  return `
    <div class="meta-list">
      <p><strong>${escapeHtml(strings.labels.root)}</strong><span>${escapeHtml(state.workspaceHarness.workspaceRoot)}</span></p>
      <p><strong>${escapeHtml(strings.labels.mode)}</strong><span>${escapeHtml(state.workspaceHarness.permissions.defaultMode)}</span></p>
      <p><strong>${escapeHtml(strings.labels.rules)}</strong><span>${state.workspaceHarness.instructionSources.length}</span></p>
      <p><strong>${escapeHtml(strings.labels.hooks)}</strong><span>${
        state.workspaceHarness.hooks.enabled ? `${state.workspaceHarness.hooks.eventCount} events` : "Disabled"
      }</span></p>
      <p><strong>${escapeHtml(strings.labels.workspaceShortcuts)}</strong><span>${state.workspaceHarness.shortcuts.length}</span></p>
    </div>
    <p class="stack-copy">${escapeHtml(strings.help.workspaceHarness)}</p>
  `;
}

function syncDocumentLanguage(): void {
  const strings = getUiStrings(state.uiLocale);
  document.documentElement.lang = state.uiLocale;
  document.documentElement.dir = isRtlUiLocale(state.uiLocale) ? "rtl" : "ltr";
  document.title = state.activeView === "workspace"
    ? `${strings.panelDocumentTitle} · ${strings.tabs.workspace}`
    : state.activeView === "context"
      ? `${strings.panelDocumentTitle} · ${strings.tabs.context}`
      : `${strings.panelDocumentTitle} · ${strings.tabs.chat}`;
}

function captureScrollPositions(): Record<string, { scrollTop: number; stickToBottom: boolean }> {
  const positions: Record<string, { scrollTop: number; stickToBottom: boolean }> = {};
  root.querySelectorAll<HTMLElement>("[data-scroll-key]").forEach((node) => {
    const key = node.dataset.scrollKey ?? "";
    positions[key] = {
      scrollTop: node.scrollTop,
      stickToBottom: shouldStickToBottomAfterRender(
        {
          scrollTop: node.scrollTop,
          scrollHeight: node.scrollHeight,
          clientHeight: node.clientHeight,
        },
        { userScrollOverrideActive: key === "chat-scroll" && isChatScrollUserOverrideActive() },
      ),
    };
  });
  return positions;
}

function restoreScrollPositions(positions: Record<string, { scrollTop: number; stickToBottom: boolean }>): void {
  root.querySelectorAll<HTMLElement>("[data-scroll-key]").forEach((node) => {
    const key = node.dataset.scrollKey ?? "";
    const snapshot = positions[key];
    if (!snapshot) {
      return;
    }
    if (snapshot.stickToBottom) {
      node.scrollTop = Math.max(0, node.scrollHeight - node.clientHeight);
      return;
    }
    node.scrollTop = snapshot.scrollTop;
  });
}

function updateScrollToBottomButtonVisibility(): void {
  const container = root.querySelector<HTMLElement>("#chat-scroll");
  const button = root.querySelector<HTMLButtonElement>("#scroll-to-bottom");
  if (!container || !button) {
    return;
  }

  const visible = shouldShowScrollToBottomButton({
    scrollTop: container.scrollTop,
    scrollHeight: container.scrollHeight,
    clientHeight: container.clientHeight,
  });
  button.classList.toggle("visible", visible);
  button.tabIndex = visible ? 0 : -1;
}

function isChatScrollUserOverrideActive(): boolean {
  return Date.now() < chatScrollUserOverrideUntil;
}

function handleChatScroll(): void {
  const container = root.querySelector<HTMLElement>("#chat-scroll");
  if (container) {
    const scrolledAwayFromLatest = shouldShowScrollToBottomButton({
      scrollTop: container.scrollTop,
      scrollHeight: container.scrollHeight,
      clientHeight: container.clientHeight,
    });
    if (scrolledAwayFromLatest) {
      chatScrollUserOverrideUntil = Date.now() + CHAT_SCROLL_USER_OVERRIDE_MS;
    }
  }
  updateScrollToBottomButtonVisibility();
}

function scrollChatToBottom(): void {
  const container = root.querySelector<HTMLElement>("#chat-scroll");
  if (!container) {
    return;
  }
  chatScrollUserOverrideUntil = 0;
  container.scrollTo({
    top: Math.max(0, container.scrollHeight - container.clientHeight),
    behavior: "smooth",
  });
}

function captureComposerRenderState(): {
  shouldRestore: boolean;
  selectionStart: number;
  selectionEnd: number;
} {
  const composer = root.querySelector<HTMLTextAreaElement>("#composer");
  const activeComposer = document.activeElement instanceof HTMLTextAreaElement && document.activeElement.id === "composer";
  if (composer) {
    state.composerSelectionStart = composer.selectionStart ?? composer.value.length;
    state.composerSelectionEnd = composer.selectionEnd ?? composer.value.length;
  }

  return {
    shouldRestore: activeComposer,
    selectionStart: state.composerSelectionStart,
    selectionEnd: state.composerSelectionEnd,
  };
}

function restoreComposerRenderState(snapshot: {
  shouldRestore: boolean;
  selectionStart: number;
  selectionEnd: number;
}): void {
  if (!snapshot.shouldRestore) {
    return;
  }

  const composer = root.querySelector<HTMLTextAreaElement>("#composer");
  if (!composer) {
    return;
  }

  composer.focus({ preventScroll: true });
  const valueLength = composer.value.length;
  composer.selectionStart = Math.min(snapshot.selectionStart, valueLength);
  composer.selectionEnd = Math.min(snapshot.selectionEnd, valueLength);
  rememberComposerInteraction(composer);
}

function parseCssPixelValue(value: string, fallback = 0): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function resizeComposerTextarea(composer?: HTMLTextAreaElement | null): void {
  const target = composer ?? root.querySelector<HTMLTextAreaElement>("#composer");
  if (!target) {
    return;
  }

  target.style.height = "auto";

  const computedStyle = getComputedStyle(target);
  const lineHeight = parseCssPixelValue(computedStyle.lineHeight, 21);
  const paddingTop = parseCssPixelValue(computedStyle.paddingTop);
  const paddingBottom = parseCssPixelValue(computedStyle.paddingBottom);
  const minHeight = parseCssPixelValue(computedStyle.minHeight, lineHeight * 2 + paddingTop + paddingBottom);
  const nextSize = calculateComposerTextareaAutosize({
    scrollHeight: target.scrollHeight,
    lineHeight,
    paddingTop,
    paddingBottom,
    minHeight,
  });

  target.style.height = `${nextSize.height}px`;
  target.style.overflowY = nextSize.overflowY;
}

function rememberComposerInteraction(composer?: HTMLTextAreaElement | null): void {
  const target = composer ?? root.querySelector<HTMLTextAreaElement>("#composer");
  if (!target) {
    return;
  }
  state.composerSelectionStart = target.selectionStart ?? target.value.length;
  state.composerSelectionEnd = target.selectionEnd ?? target.value.length;
  resizeComposerTextarea(target);
}

function bindEvents(): void {
  const strings = getUiStrings(state.uiLocale);
  resizeComposerTextarea();

  root.querySelector<HTMLElement>("#chat-scroll")?.addEventListener("scroll", handleChatScroll, {
    passive: true,
  });
  root.querySelector<HTMLButtonElement>("#scroll-to-bottom")?.addEventListener("click", () => {
    scrollChatToBottom();
    window.setTimeout(updateScrollToBottomButtonVisibility, 220);
  });

  root.querySelector<HTMLButtonElement>("[data-usage-notice-accept]")?.addEventListener("click", async () => {
    state.settings = await sendRuntimeMessage<ExtensionSettings>({
      type: "settings.update",
      settings: { usageNoticeAccepted: true },
    });
    state.activeView = "chat";
    render();
  });

  root.querySelector<HTMLSelectElement>("#profile-select")?.addEventListener("change", async (event) => {
    const target = event.currentTarget as HTMLSelectElement;
    const selectedProfileId = selectProfileForComposer(target.value, { visible: target.value !== DEFAULT_PROFILE_ID });
    await sendRuntimeMessage({ type: "profile.select", profileId: selectedProfileId });
    scheduleConversationPersist();
    render();
  });

  root.querySelector<HTMLButtonElement>("#create-profile")?.addEventListener("click", () => {
    openProfileEditor("create");
  });

  root.querySelector<HTMLButtonElement>("#edit-profile")?.addEventListener("click", () => {
    openProfileEditor("edit", getSelectedProfile());
  });

  root.querySelector<HTMLButtonElement>("#delete-profile")?.addEventListener("click", () => {
    void deleteProfile(state.selectedProfileId);
  });

  root.querySelector<HTMLButtonElement>("#reset-settings")?.addEventListener("click", () => {
    void resetSettingsFromUi();
  });

  root.querySelector<HTMLButtonElement>("#close-profile-editor")?.addEventListener("click", closeProfileEditor);
  root.querySelector<HTMLButtonElement>("#cancel-profile-editor")?.addEventListener("click", closeProfileEditor);
  root.querySelector<HTMLElement>("[data-profile-editor-backdrop]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      closeProfileEditor();
    }
  });
  root.querySelector<HTMLButtonElement>("#save-profile-editor")?.addEventListener("click", () => {
    void submitProfileEditor();
  });
  root.querySelector<HTMLButtonElement>("#delete-profile-in-editor")?.addEventListener("click", () => {
    const profileId = state.profileEditor?.profileId;
    if (profileId) {
      void deleteProfile(profileId);
    }
  });
  root.querySelector<HTMLButtonElement>("#profile-visual-trigger")?.addEventListener("click", () => {
    if (!state.profileEditor) {
      return;
    }
    const editor = readProfileEditorForm();
    state.profileEditor = {
      ...clearProfileEditorError(editor),
      visualPickerOpen: !state.profileEditor.visualPickerOpen,
    };
    render();
  });
  root.querySelector<HTMLButtonElement>("#close-profile-visual-picker")?.addEventListener("click", () => {
    if (!state.profileEditor) {
      return;
    }
    state.profileEditor = {
      ...clearProfileEditorError(readProfileEditorForm()),
      visualPickerOpen: false,
    };
    render();
  });
  root.querySelector<HTMLButtonElement>("#choose-profile-image")?.addEventListener("click", () => {
    root.querySelector<HTMLInputElement>("#profile-image-input")?.click();
  });
  root.querySelector<HTMLButtonElement>("#remove-profile-image")?.addEventListener("click", () => {
    if (!state.profileEditor) {
      return;
    }
    state.profileEditor = {
      ...clearProfileEditorError(readProfileEditorForm()),
      imageDataUrl: "",
    };
    render();
  });
  root.querySelectorAll<HTMLInputElement>('input[name="profile-editor-color"], input[name="profile-editor-icon"]').forEach((input) => {
    input.addEventListener("change", () => {
      state.profileEditor = clearProfileEditorError(readProfileEditorForm());
      render();
    });
  });
  root.querySelector<HTMLInputElement>("#profile-image-input")?.addEventListener("change", (event) => {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (file) {
      void setProfileEditorImageFromFile(file);
    }
  });

  root.querySelector<HTMLFormElement>("[data-native-text-dialog]")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void submitNativeTextDialog();
  });
  root.querySelectorAll<HTMLButtonElement>("[data-native-text-cancel]").forEach((button) => {
    button.addEventListener("click", closeNativeTextDialog);
  });
  root.querySelector<HTMLElement>("[data-native-text-backdrop]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      closeNativeTextDialog();
    }
  });
  root.querySelector<HTMLButtonElement>("#native-confirmation-approve")?.addEventListener("click", () => {
    resolveNativeConfirmation(true);
  });
  root.querySelector<HTMLButtonElement>("#native-confirmation-cancel")?.addEventListener("click", () => {
    resolveNativeConfirmation(false);
  });
  root.querySelector<HTMLElement>("[data-native-confirmation-backdrop]")?.addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      resolveNativeConfirmation(false);
    }
  });

  root.querySelector<HTMLTextAreaElement>("#profile-question-answer")?.addEventListener("input", (event) => {
    if (!state.pendingProfileQuestion) {
      return;
    }
    state.pendingProfileQuestion = {
      ...state.pendingProfileQuestion,
      answer: (event.currentTarget as HTMLTextAreaElement).value,
    };
  });

  root.querySelectorAll<HTMLButtonElement>("[data-profile-question-option]").forEach((button) => {
    button.addEventListener("click", async () => {
      await submitPendingProfileQuestion(button.dataset.profileQuestionOption ?? "");
    });
  });

  root.querySelector<HTMLButtonElement>("[data-profile-question-submit]")?.addEventListener("click", async () => {
    await submitPendingProfileQuestion();
  });

  root.querySelector<HTMLButtonElement>("[data-profile-question-dismiss]")?.addEventListener("click", () => {
    state.pendingProfileQuestion = null;
    render();
  });

  root.querySelector<HTMLSelectElement>("#model-select")?.addEventListener("change", async (event) => {
    const target = event.currentTarget as HTMLSelectElement;
    state.selectedModel = target.value;
    syncSelectedReasoningEffort();
    await persistSelectedModelControls();
    scheduleConversationPersist();
    render();
  });

  root.querySelector<HTMLButtonElement>("#composer-model-menu-trigger")?.addEventListener("click", () => {
    state.attachmentMenuOpen = false;
    state.appMenuOpen = false;
    state.browserActionPermissionMenuOpen = false;
    state.mentionQuery = null;
    state.slashQuery = null;
    state.composerModelMenuOpen = !state.composerModelMenuOpen;
    renderSync();
  });

  root.querySelectorAll<HTMLButtonElement>("[data-composer-model-option]").forEach((button) => {
    button.addEventListener("click", async () => {
      const model = button.dataset.composerModelOption;
      if (!model) {
        return;
      }
      state.selectedModel = model;
      syncSelectedReasoningEffort();
      state.composerModelMenuOpen = false;
      await persistSelectedModelControls();
      scheduleConversationPersist();
      renderSync();
    });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-composer-reasoning-option]").forEach((button) => {
    button.addEventListener("click", async () => {
      const effort = button.dataset.composerReasoningOption;
      if (!effort) {
        return;
      }
      state.selectedReasoningEffort = normalizeReasoningEffort(effort, getSelectedModelReasoningEfforts());
      state.composerModelMenuOpen = false;
      await persistSelectedModelControls();
      scheduleConversationPersist();
      renderSync();
    });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-composer-service-tier]").forEach((button) => {
    button.addEventListener("click", async () => {
      const tier = button.dataset.composerServiceTier ?? "";
      state.selectedServiceTier = normalizeServiceTier(tier, getSelectedModelOption()?.additionalSpeedTiers ?? []);
      state.composerModelMenuOpen = false;
      await persistSelectedModelControls();
      scheduleConversationPersist();
      renderSync();
    });
  });

  root.querySelector<HTMLButtonElement>("#grant-pending-permission")?.addEventListener("click", async () => {
    const pending = state.pendingPermission;
    if (!pending) {
      return;
    }
    const granted = await requestPermissionPlan(pending.plan, { showPendingPromptOnFailure: true });
    if (granted) {
      const retryMessage = resolvePermissionRetryPrompt({
        pendingRetryMessage: pending.retryMessage,
        composerDraft: state.composerDraft,
        composerValue: root.querySelector<HTMLTextAreaElement>("#composer")?.value ?? null,
      });
      state.pendingPermission = null;
      state.initError = "";
      if (retryMessage && canSendCurrentComposerMessage()) {
        state.actionStatus =
          state.uiLocale === "ko"
            ? "사이트 접근 권한이 허용되었습니다. 요청을 다시 전송합니다."
            : "Site access is allowed. Retrying the request.";
        render();
        await sendPrompt(retryMessage);
        return;
      }
      state.actionStatus = state.uiLocale === "ko" ? "사이트 접근 권한이 허용되었습니다." : "Site access is allowed.";
      render();
    }
  });

  root.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.currentReadStrategy = button.dataset.mode as ReadStrategy | "auto";
      scheduleConversationPersist();
      render();
    });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-remove-file-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const id = button.dataset.removeFileId;
      if (!id) {
        return;
      }
      removeFileAttachment(id);
      state.actionStatus = "";
      render();
    });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-image-followup]").forEach((button) => {
    button.addEventListener("click", async () => {
      await openConversationImageFollowupEditor(button.dataset.imageMessageId, button.dataset.imageIndex);
    });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-image-open]").forEach((button) => {
    button.addEventListener("click", async () => {
      await openConversationImagePreview(button.dataset.imageMessageId, button.dataset.imageIndex);
    });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-message-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      await copyConversationMessage(button.dataset.messageCopy);
    });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-code-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      await copyMessageCodeBlock(button);
    });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-message-regenerate]").forEach((button) => {
    button.addEventListener("click", async () => {
      await replayConversationFromMessage(button.dataset.messageRegenerate);
    });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-message-edit]").forEach((button) => {
    button.addEventListener("click", () => {
      state.editingMessageId = button.dataset.messageEdit ?? null;
      state.actionStatus = "";
      render();
      root.querySelector<HTMLTextAreaElement>(`[data-message-edit-input="${CSS.escape(state.editingMessageId ?? "")}"]`)?.focus({
        preventScroll: true,
      });
    });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-message-edit-cancel]").forEach((button) => {
    button.addEventListener("click", () => {
      if (state.editingMessageId === button.dataset.messageEditCancel) {
        state.editingMessageId = null;
      }
      render();
    });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-message-edit-save]").forEach((button) => {
    button.addEventListener("click", async () => {
      const messageId = button.dataset.messageEditSave;
      const input = messageId
        ? root.querySelector<HTMLTextAreaElement>(`[data-message-edit-input="${CSS.escape(messageId)}"]`)
        : null;
      await replayConversationFromMessage(messageId, input?.value);
    });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-remove-attachment]").forEach((button) => {
    button.addEventListener("click", async () => {
      const attachment = button.dataset.removeAttachment as PromptRequestPayload["attachments"][number] | undefined;
      if (!attachment) {
        return;
      }
      state.attachments.delete(attachment);
      if (attachment === "open-tabs") {
        state.selectedTabIds = [];
      }
      if (attachment === "history") {
        state.historyItems = [];
        state.historyQuery = "";
      }
      scheduleConversationPersist();
      render();
    });
  });

  root.querySelector<HTMLButtonElement>("[data-remove-current-tab-context]")?.addEventListener("click", () => {
    dismissCurrentTabContext();
    scheduleConversationPersist();
    renderSync();
  });

  root.querySelectorAll<HTMLButtonElement>("[data-remove-tab-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const tabId = Number(button.dataset.removeTabId);
      if (!Number.isFinite(tabId)) {
        return;
      }
      state.selectedTabIds = state.selectedTabIds.filter((value) => value !== tabId);
      if (state.selectedTabIds.length === 0) {
        state.attachments.delete("open-tabs");
      }
      scheduleConversationPersist();
      render();
    });
  });

  root.querySelector<HTMLButtonElement>("#attach-files")?.addEventListener("click", () => {
    state.appMenuOpen = false;
    state.composerModelMenuOpen = false;
    state.browserActionPermissionMenuOpen = false;
    state.attachmentMenuOpen = !state.attachmentMenuOpen;
    state.mentionQuery = null;
    state.slashQuery = null;
    render();
  });

  root.querySelectorAll<HTMLButtonElement>("[data-attachment-menu-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      const action = button.dataset.attachmentMenuAction as AttachmentMenuAction | undefined;
      if (!action) {
        return;
      }
      await handleAttachmentMenuAction(action);
    });
  });

  root.querySelector<HTMLInputElement>("#file-attachment-input")?.addEventListener("change", async (event) => {
    const input = event.currentTarget as HTMLInputElement;
    if (!input.files?.length) {
      return;
    }
    await ingestSelectedFiles(input.files);
    input.value = "";
  });

  root.querySelectorAll<HTMLButtonElement>("[data-edit-file-image-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const attachmentId = button.dataset.editFileImageId;
      if (!attachmentId) {
        return;
      }
      state.imageAnnotationEditor = { source: "file", attachmentId };
      state.imageAnnotationReferenceAttachments = [];
      render();
    });
  });

  installImageAnnotationEditorHandlers();

  const composerFrame = root.querySelector<HTMLDivElement>(".composer-frame");
  composerFrame?.addEventListener("dragenter", (event) => {
    if (!hasComposerDropPayload(event.dataTransfer)) {
      return;
    }
    event.preventDefault();
    state.composerDragActive = true;
    render();
  });

  composerFrame?.addEventListener("dragover", (event) => {
    if (!hasComposerDropPayload(event.dataTransfer)) {
      return;
    }
    event.preventDefault();
    event.dataTransfer!.dropEffect = "copy";
    if (!state.composerDragActive) {
      state.composerDragActive = true;
      render();
    }
  });

  composerFrame?.addEventListener("dragleave", (event) => {
    const relatedTarget = event.relatedTarget;
    if (relatedTarget instanceof Node && composerFrame.contains(relatedTarget)) {
      return;
    }
    state.composerDragActive = false;
    render();
  });

  composerFrame?.addEventListener("drop", async (event) => {
    event.preventDefault();
    state.composerDragActive = false;
    const dataTransfer = event.dataTransfer;
    if (!dataTransfer) {
      render();
      return;
    }
    const webImageUrls = extractWebImageUrlsFromDropData(dataTransfer);
    if (dataTransfer.files.length > 0) {
      await ingestSelectedFiles(dataTransfer.files);
    } else {
      ingestRemoteImageUrls(webImageUrls);
    }
    render();
  });

  root.querySelectorAll<HTMLButtonElement>("[data-structured-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const id = button.dataset.structuredId;
      if (!id) {
        return;
      }
      state.structuredInputs = state.structuredInputs.filter((input) => input.id !== id);
      scheduleConversationPersist();
      render();
    });
  });

  root.querySelector<HTMLButtonElement>("#new-chat")?.addEventListener("click", () => {
    state.appMenuOpen = false;
    state.composerModelMenuOpen = false;
    state.browserActionPermissionMenuOpen = false;
    void startNewChat();
  });

  root.querySelector<HTMLButtonElement>("#app-menu-toggle")?.addEventListener("click", () => {
    root.querySelector<HTMLTextAreaElement>("#composer")?.blur();
    state.attachmentMenuOpen = false;
    state.composerModelMenuOpen = false;
    state.browserActionPermissionMenuOpen = false;
    state.mentionQuery = null;
    state.slashQuery = null;
    const nextOpen = !state.appMenuOpen;
    state.appMenuOpen = nextOpen;
    if (nextOpen) {
      state.appMenuRecentChatLimit = APP_MENU_RECENT_CHAT_LIMIT;
    }
    renderSync();
  });

  root.querySelectorAll<HTMLButtonElement>("[data-top-quick-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (isQuickInteractionLockedForState()) {
        return;
      }
      state.appMenuOpen = false;
      state.attachmentMenuOpen = false;
      state.composerModelMenuOpen = false;
      state.browserActionPermissionMenuOpen = false;
      state.mentionQuery = null;
      state.slashQuery = null;
      const action = button.dataset.topQuickAction;
      if (action === "summarize-page") {
        await handleActionCard("summarize-page");
        return;
      }
      if (action === "infographic") {
        await createInfographicFromCurrentPage();
      }
    });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-menu-view]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.appMenuOpen = false;
      state.activeView = button.dataset.menuView as MainView;
      renderSync();
      if (state.activeView === "context" && (state.attachments.has("open-tabs") || state.selectedTabIds.length)) {
        await loadTabs();
      }
    });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-menu-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (button.dataset.menuAction === "show-more-recent-chats") {
        state.appMenuRecentChatLimit += APP_MENU_RECENT_CHAT_LIMIT;
        state.appMenuOpen = true;
        renderSync();
        return;
      }
      if (isQuickInteractionLockedForState()) {
        return;
      }
      state.appMenuOpen = false;
      if (button.dataset.menuAction === "compact") {
        await compactCurrentConversation();
      }
    });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((button) => {
    button.addEventListener("click", async () => {
      state.appMenuOpen = false;
      state.activeView = button.dataset.view as MainView;
      renderSync();
      if (state.activeView === "context" && (state.attachments.has("open-tabs") || state.selectedTabIds.length)) {
        await loadTabs();
      }
    });
  });

  root.querySelector<HTMLButtonElement>("#popout-chat")?.addEventListener("click", async () => {
    state.appMenuOpen = false;
    await sendRuntimeMessage({ type: "ui.popout" });
  });

  root.querySelector<HTMLButtonElement>("#dock-chat")?.addEventListener("click", async () => {
    state.appMenuOpen = false;
    const popupWindow = await chrome.windows.getCurrent();
    await sendRuntimeMessage({
      type: "ui.dock",
      ...(targetWindowId ? { targetWindowId } : {}),
      popupWindowId: popupWindow.id,
    });
  });

  root.querySelectorAll<HTMLButtonElement>("#chatgpt-login, #onboarding-chatgpt-login").forEach((button) => {
    button.addEventListener("click", () => {
      void startCodexOauthLogin();
    });
  });

  root.querySelectorAll<HTMLButtonElement>("#apikey-login, #onboarding-apikey-login").forEach((button) => {
    button.addEventListener("click", () => {
      openNativeTextDialog("api-key");
    });
  });

  root.querySelector<HTMLButtonElement>("#logout")?.addEventListener("click", async () => {
    try {
      await sendRuntimeMessage({ type: "account.logout" });
      await scheduleInitialize();
      state.initError = "";
    } catch (error) {
      state.initError = toUserFacingRuntimeError(error);
      render();
    }
  });

  root.querySelector<HTMLButtonElement>("#reconnect-connection")?.addEventListener("click", async () => {
    try {
      await scheduleInitialize();
      state.actionStatus = strings.status.connectionRefreshed;
      state.initError = "";
      render();
    } catch (error) {
      state.initError = toUserFacingRuntimeError(error);
      render();
    }
  });

  root.querySelector<HTMLButtonElement>("#refresh-image-folder")?.addEventListener("click", async () => {
    try {
      state.imageAssetFolder = await sendRuntimeMessage<UiInitPayload["imageAssetFolder"]>({
        type: "image.asset.folder",
      });
      state.initError = "";
      render();
    } catch (error) {
      state.initError = toUserFacingRuntimeError(error);
      render();
    }
  });

  root.querySelector<HTMLButtonElement>("#open-image-folder")?.addEventListener("click", async () => {
    try {
      const result = await sendRuntimeMessage<{ opened: true; folder: string }>({
        type: "image.asset.folder.open",
        folder: state.imageAssetFolder.latestFolder || state.imageAssetFolder.rootDir,
      });
      state.actionStatus =
        state.uiLocale === "ko" ? `이미지 폴더를 열었습니다: ${result.folder}` : `Opened image folder: ${result.folder}`;
      state.initError = "";
      render();
    } catch (error) {
      state.initError = toUserFacingRuntimeError(error);
      render();
    }
  });

  root.querySelector<HTMLButtonElement>("#refresh-log-folder")?.addEventListener("click", async () => {
    try {
      state.diagnosticLogFolder = await sendRuntimeMessage<UiInitPayload["diagnosticLogFolder"]>({
        type: "diagnostics.log.folder",
      });
      state.initError = "";
      render();
    } catch (error) {
      state.initError = toUserFacingRuntimeError(error);
      render();
    }
  });

  root.querySelector<HTMLButtonElement>("#open-log-folder")?.addEventListener("click", async () => {
    try {
      const result = await sendRuntimeMessage<{ opened: true; folder: string }>({
        type: "diagnostics.log.folder.open",
        folder: state.diagnosticLogFolder.rootDir,
      });
      state.actionStatus =
        state.uiLocale === "ko" ? `로그 폴더를 열었습니다: ${result.folder}` : `Opened log folder: ${result.folder}`;
      state.initError = "";
      render();
    } catch (error) {
      state.initError = toUserFacingRuntimeError(error);
      render();
    }
  });

  root.querySelector<HTMLTextAreaElement>("#composer")?.addEventListener("input", (event) => {
    const target = event.currentTarget as HTMLTextAreaElement;
    const previousMentionQuery = state.mentionQuery;
    const previousSlashQuery = state.slashQuery;
    const wasAppMenuOpen = state.appMenuOpen;
    const wasBrowserActionPermissionMenuOpen = state.browserActionPermissionMenuOpen;
    state.composerDraft = target.value;
    state.attachmentMenuOpen = false;
    state.browserActionPermissionMenuOpen = false;
    state.composerModelMenuOpen = false;
    state.appMenuOpen = false;
    rememberComposerInteraction(target);
    state.mentionQuery = extractMentionQuery(target.value);
    state.slashQuery = extractSlashQuery(target.value);
    if (previousSlashQuery !== state.slashQuery) {
      state.slashActiveIndex = 0;
    }
    if (state.mentionQuery !== null && previousMentionQuery === null) {
      void refreshOpenTabSuggestions({ requestPermission: false });
    }
    const shouldRerenderComposer =
      wasAppMenuOpen ||
      wasBrowserActionPermissionMenuOpen ||
      previousMentionQuery !== state.mentionQuery ||
      previousSlashQuery !== state.slashQuery;
    if (!shouldRerenderComposer) {
      return;
    }
    render();
  });

  root.querySelector<HTMLTextAreaElement>("#composer")?.addEventListener("pointerdown", (event) => {
    rememberComposerInteraction(event.currentTarget as HTMLTextAreaElement);
  });

  root.querySelector<HTMLTextAreaElement>("#composer")?.addEventListener("focus", (event) => {
    const wasAppMenuOpen = state.appMenuOpen;
    const wasBrowserActionPermissionMenuOpen = state.browserActionPermissionMenuOpen;
    state.attachmentMenuOpen = false;
    state.browserActionPermissionMenuOpen = false;
    state.appMenuOpen = false;
    rememberComposerInteraction(event.currentTarget as HTMLTextAreaElement);
    if (wasAppMenuOpen || wasBrowserActionPermissionMenuOpen) {
      render();
    }
  });

  root.querySelector<HTMLTextAreaElement>("#composer")?.addEventListener("compositionstart", () => {
    composerCompositionInProgress = true;
  });

  root.querySelector<HTMLTextAreaElement>("#composer")?.addEventListener("compositionend", () => {
    composerCompositionInProgress = false;
  });

  root.querySelector<HTMLTextAreaElement>("#composer")?.addEventListener("keydown", (event) => {
    const keyInput = {
      key: event.key,
      shiftKey: event.shiftKey,
      isComposing: event.isComposing,
      keyCode: "keyCode" in event ? Number((event as KeyboardEvent & { keyCode?: number }).keyCode) : undefined,
      compositionInProgress: composerCompositionInProgress,
      dropdownOpen: isComposerDropdownOpen(),
    };
    if (moveSlashCommandSelection(event.key)) {
      event.preventDefault();
      rememberComposerInteraction(event.currentTarget as HTMLTextAreaElement);
      return;
    }

    if (shouldInterceptComposerDropdownOnEnter(keyInput)) {
      event.preventDefault();
      rememberComposerInteraction(event.currentTarget as HTMLTextAreaElement);
      if (state.slashQuery !== null) {
        void acceptActiveSlashOptionFromComposer();
      }
      return;
    }

    const shouldSubmit = shouldSubmitComposerOnKeydown(keyInput);
    if (!shouldSubmit) {
      rememberComposerInteraction(event.currentTarget as HTMLTextAreaElement);
      return;
    }
    event.preventDefault();
    if (!canSendCurrentComposerMessage()) {
      rememberComposerInteraction(event.currentTarget as HTMLTextAreaElement);
      return;
    }
    void sendPrompt();
  });

  root.querySelectorAll<HTMLButtonElement>("[data-tab-picker-action]").forEach((button) => {
    button.addEventListener("click", async () => {
      await refreshOpenTabSuggestions({ requestPermission: true });
      const composer = root.querySelector<HTMLTextAreaElement>("#composer");
      if (composer) {
        composer.value = state.composerDraft;
        composer.focus({ preventScroll: true });
        composer.selectionStart = composer.value.length;
        composer.selectionEnd = composer.value.length;
        rememberComposerInteraction(composer);
      }
    });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-tab-mention-id]").forEach((button) => {
    button.addEventListener("click", () => {
      const tabId = Number(button.dataset.tabMentionId);
      if (!Number.isFinite(tabId)) {
        return;
      }
      state.attachments.add("open-tabs");
      state.selectedTabIds = toggleSelectedTabId(state.selectedTabIds, tabId);
      if (state.selectedTabIds.length === 0) {
        state.attachments.delete("open-tabs");
      }
      scheduleConversationPersist();
      renderSync();
      const composer = root.querySelector<HTMLTextAreaElement>("#composer");
      if (composer) {
        composer.value = state.composerDraft;
        composer.focus({ preventScroll: true });
        composer.selectionStart = composer.value.length;
        composer.selectionEnd = composer.value.length;
        rememberComposerInteraction(composer);
      }
    });
  });

  root.querySelector<HTMLButtonElement>("[data-tab-mention-done]")?.addEventListener("click", () => {
    state.mentionQuery = null;
    state.composerDraft = removeActiveMentionToken(state.composerDraft);
    scheduleConversationPersist();
    renderSync();
    const composer = root.querySelector<HTMLTextAreaElement>("#composer");
    if (composer) {
      composer.value = state.composerDraft;
      composer.focus({ preventScroll: true });
      composer.selectionStart = composer.value.length;
      composer.selectionEnd = composer.value.length;
      rememberComposerInteraction(composer);
    }
  });

  root.querySelectorAll<HTMLButtonElement>("[data-mention-option-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const option = findMentionOption(button.dataset.mentionOptionId ?? "");
      if (!option) {
        return;
      }
      await refreshOpenTabSuggestions({ requestPermission: true });
    });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-slash-option-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const option = findSlashOption(button.dataset.slashOptionId ?? "");
      if (!option) {
        return;
      }

      await applySlashOption(option);
      renderSync();
      restoreComposerFocus();
    });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-remove-composer-command-pill]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const pillId = button.dataset.removeComposerCommandPill ?? "";
      if (!pillId) {
        return;
      }

      await removeComposerCommandPillSelection(pillId, "profile");
      renderSync();
      restoreComposerFocus(true);
    });
  });

  root.querySelectorAll<HTMLInputElement>("[data-codex-skill-toggle]").forEach((input) => {
    input.addEventListener("change", async () => {
      const skillId = input.dataset.codexSkillToggle;
      if (!skillId) {
        return;
      }
      await toggleCodexSkillEnabled(skillId);
      render();
    });
  });

  root.querySelector<HTMLButtonElement>("#upload-skill-archive")?.addEventListener("click", () => {
    root.querySelector<HTMLInputElement>("#skill-archive-input")?.click();
  });

  root.querySelector<HTMLInputElement>("#skill-archive-input")?.addEventListener("change", async (event) => {
    const input = event.currentTarget as HTMLInputElement | null;
    if (!input) {
      return;
    }
    const file = input.files?.[0];
    input.value = "";
    if (!file) {
      return;
    }
    await installSkillArchive(file);
  });

  root.querySelectorAll<HTMLButtonElement>("[data-app-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const app = state.connectedApps.find((item) => item.id === button.dataset.appId);
      if (!app || !app.isAccessible || !app.isEnabled) {
        return;
      }
      toggleStructuredInput({
        id: app.id,
        type: "mention",
        name: app.name,
        path: app.path,
        description: app.description,
        token: app.token,
      });
      scheduleConversationPersist();
      render();
    });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-plugin-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const plugin = state.appServerPlugins.find((item) => item.id === button.dataset.pluginId);
      if (!plugin || !plugin.installed || !plugin.enabled) {
        return;
      }
      toggleStructuredInput({
        id: plugin.id,
        type: "mention",
        name: plugin.name,
        path: plugin.path,
        description: plugin.description,
        token: plugin.token,
      });
      scheduleConversationPersist();
      render();
    });
  });

  root.querySelector<HTMLButtonElement>("#send-prompt")?.addEventListener("click", () => {
    void sendPrompt();
  });

  root.querySelector<HTMLButtonElement>("#stop-turn")?.addEventListener("click", async () => {
    const activePromptRequestId = state.promptActivity?.clientRequestId;
    const activeTurn = state.activeTurn;
    if (!activeTurn && !activePromptRequestId) {
      return;
    }
    if (activePromptRequestId) {
      cancelledPromptRequestIds.add(activePromptRequestId);
    }
    await chrome.runtime.sendMessage({
      type: "prompt.cancel",
      clientRequestId: activePromptRequestId,
      threadId: activeTurn?.threadId,
      turnId: activeTurn?.turnId,
    });
    state.activeTurn = null;
    state.promptActivity = null;
    state.streamingAssistantMessageIds.clear();
    render();
  });

  root.querySelector<HTMLButtonElement>("#voice-input-toggle")?.addEventListener("click", async () => {
    if (state.voiceInputActive) {
      void commitComposerVoiceInput();
      return;
    }
    await startComposerVoiceInput();
  });

  root.querySelector<HTMLButtonElement>("#voice-dictation-cancel")?.addEventListener("click", () => {
    cancelComposerVoiceInput();
  });

  root.querySelector<HTMLButtonElement>("#voice-dictation-confirm")?.addEventListener("click", () => {
    void commitComposerVoiceInput();
  });

  root.querySelector<HTMLButtonElement>("#live-toggle, #stop-live")?.addEventListener("click", async () => {
    if (voiceStartPromise) {
      return;
    }
    state.initError = "";
    state.actionStatus = "";
    state.pendingAction = "voice";
    render();
    try {
      if (!state.voiceEnabled) {
        voiceStartPromise = startRealtimeVoiceSession();
        await voiceStartPromise;
      } else {
        await stopRealtimeVoiceSession({ notifyBridge: true });
      }
    } catch (error) {
      state.initError = error instanceof Error ? error.message : strings.errors.voiceUpdate;
      cleanupRealtimeVoiceResources();
      state.voiceEnabled = false;
    } finally {
      voiceStartPromise = null;
      state.pendingAction = "";
      render();
    }
  });

  root.querySelectorAll<HTMLButtonElement>(".action-card").forEach((button) => {
    button.addEventListener("click", () => {
      if (isQuickInteractionLockedForState()) {
        return;
      }
      void handleActionCard(button.dataset.action ?? "");
    });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-youtube-seek]").forEach((button) => {
    button.addEventListener("click", () => {
      const seconds = Number(button.dataset.youtubeSeek);
      if (!Number.isFinite(seconds)) {
        return;
      }
      void seekYouTubeTimestamp(seconds);
    });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-delete-chat-id]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      const conversationId = button.dataset.deleteChatId;
      if (!conversationId) {
        return;
      }
      await deleteConversationFromUi(conversationId);
    });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-clear-chat-history]").forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.stopPropagation();
      await clearConversationHistoryFromUi({
        returnToSettings: button.dataset.clearChatHistory === "settings",
      });
    });
  });

  root.querySelectorAll<HTMLButtonElement>(".recent-chat").forEach((button) => {
    button.addEventListener("click", async () => {
      const conversationId = button.dataset.chatId;
      if (!conversationId) {
        return;
      }
      const result = await chrome.runtime.sendMessage({ type: "conversation.resume", conversationId });
      hydrateConversation(result.conversation);
      state.appMenuOpen = false;
      state.activeView = "chat";
      render();
      if (state.attachments.has("open-tabs") || state.selectedTabIds.length) {
        await loadTabs();
      }
    });
  });

  root.querySelectorAll<HTMLButtonElement>("[data-server-thread-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (isQuickInteractionLockedForState()) {
        return;
      }
      const threadId = button.dataset.serverThreadId;
      if (!threadId) {
        return;
      }
      const result = await chrome.runtime.sendMessage({ type: "conversation.resume.server", threadId });
      hydrateConversation(result.conversation);
      state.threadId = threadId;
      state.appMenuOpen = false;
      state.activeView = "chat";
      render();
    });
  });

  root.querySelector<HTMLButtonElement>("#load-tabs")?.addEventListener("click", () => void loadTabs());

  root.querySelector<HTMLFormElement>("#custom-site-suggestion-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    void saveCustomSiteSuggestionFromSettings();
  });

  root.querySelectorAll<HTMLButtonElement>("[data-delete-custom-site-suggestion]").forEach((button) => {
    button.addEventListener("click", () => {
      void deleteCustomSiteSuggestionFromSettings(button.dataset.deleteCustomSiteSuggestion);
    });
  });

  root.querySelector<HTMLButtonElement>("#search-history")?.addEventListener("click", async () => {
    const input = root.querySelector<HTMLInputElement>("#history-query");
    state.historyQuery = input?.value ?? "";
    const result = await sendRuntimeMessageWithConfirmation<{ items: Array<{ title: string; url: string }> }>(
      createConfirmedHistorySearchRequest(state.historyQuery),
    );
    if (isCancelledResult(result)) {
      return;
    }
    state.historyItems = result.items;
    if (state.historyQuery) {
      state.attachments.add("history");
      scheduleConversationPersist();
    }
    render();
  });

  root.querySelector<HTMLInputElement>("#setting-remember-chats")?.addEventListener("change", async (event) => {
    state.settings = await chrome.runtime.sendMessage({
      type: "settings.update",
      settings: { rememberChats: (event.currentTarget as HTMLInputElement).checked },
    });
    render();
  });

  root.querySelector<HTMLInputElement>("#setting-auto-compact")?.addEventListener("change", async (event) => {
    state.settings = await chrome.runtime.sendMessage({
      type: "settings.update",
      settings: { autoCompactConversations: (event.currentTarget as HTMLInputElement).checked },
    });
    render();
  });

  root.querySelector<HTMLInputElement>("#setting-live-captions")?.addEventListener("change", async (event) => {
    const enabled = (event.currentTarget as HTMLInputElement).checked;
    state.settings = await chrome.runtime.sendMessage({
      type: "settings.update",
      settings: { liveCaptions: enabled },
    });
    if (!enabled) {
      state.liveCaption = "";
      resetVoiceTranscriptMirrorState(voiceTranscriptMirror);
    }
    render();
  });

  root.querySelector<HTMLInputElement>("#setting-voice-navigation")?.addEventListener("change", async (event) => {
    state.settings = await chrome.runtime.sendMessage({
      type: "settings.update",
      settings: { allowVoiceNavigation: (event.currentTarget as HTMLInputElement).checked },
    });
    render();
  });

  root.querySelector<HTMLButtonElement>("#composer-permission-menu-trigger")?.addEventListener("click", () => {
    state.attachmentMenuOpen = false;
    state.appMenuOpen = false;
    state.composerModelMenuOpen = false;
    state.mentionQuery = null;
    state.slashQuery = null;
    state.browserActionPermissionMenuOpen = !state.browserActionPermissionMenuOpen;
    renderSync();
  });

  root.querySelectorAll<HTMLButtonElement>("[data-browser-action-permission-mode]").forEach((button) => {
    button.addEventListener("click", async () => {
      const mode = normalizeBrowserActionPermissionMode(button.dataset.browserActionPermissionMode);
      state.browserActionPermissionMenuOpen = false;
      state.settings = await chrome.runtime.sendMessage({
        type: "settings.update",
        settings: {
          allowBrowserActions: true,
          browserActionPermissionMode: mode,
        },
      });
      render();
    });
  });

  root.querySelector<HTMLSelectElement>("#setting-ui-language")?.addEventListener("change", async (event) => {
    const uiLanguage = normalizeUiLanguageSetting((event.currentTarget as HTMLSelectElement).value);
    state.settings = await chrome.runtime.sendMessage({
      type: "settings.update",
      settings: { uiLanguage },
    });
    state.settings = {
      ...state.settings,
      uiLanguage: normalizeUiLanguageSetting(state.settings.uiLanguage),
      preferredVoice: normalizeCodexRealtimeVoice(state.settings.preferredVoice),
    };
    state.uiLocale = resolveUiLocale(state.settings.uiLanguage, getBrowserUiLanguage());
    syncDocumentLanguage();
    state.profiles = localizeBuiltinProfiles(state.profiles, state.uiLocale);
    render();
  });

  root.querySelector<HTMLSelectElement>("#voice-select")?.addEventListener("change", async (event) => {
    state.settings = await chrome.runtime.sendMessage({
      type: "settings.update",
      settings: { preferredVoice: normalizeCodexRealtimeVoice((event.currentTarget as HTMLSelectElement).value) },
    });
    state.settings = {
      ...state.settings,
      preferredVoice: normalizeCodexRealtimeVoice(state.settings.preferredVoice),
    };
    render();
  });
}

async function handleAttachmentMenuAction(action: AttachmentMenuAction): Promise<void> {
  switch (action) {
    case "add-files":
      state.attachmentMenuOpen = false;
      state.browserActionPermissionMenuOpen = false;
      renderSync();
      root.querySelector<HTMLInputElement>("#file-attachment-input")?.click();
      return;
    case "attach-tabs":
      state.attachmentMenuOpen = false;
      state.browserActionPermissionMenuOpen = false;
      state.slashQuery = null;
      state.slashActiveIndex = 0;
      state.mentionQuery = "";
      state.composerDraft = ensureTrailingComposerToken(state.composerDraft, "@");
      renderSync();
      await refreshOpenTabSuggestions({ requestPermission: false });
      focusComposerAtEnd();
      return;
    case "attach-screenshot":
      state.attachmentMenuOpen = false;
      state.browserActionPermissionMenuOpen = false;
      state.attachments.add("image");
      state.currentReadStrategy = "vision";
      state.actionStatus =
        state.uiLocale === "ko"
          ? "현재 화면을 다음 요청의 시각 컨텍스트로 첨부합니다."
          : "The visible screen will be attached as visual context for your next request.";
      scheduleConversationPersist();
      render();
      return;
    case "saved-prompts":
      state.attachmentMenuOpen = false;
      state.browserActionPermissionMenuOpen = false;
      state.mentionQuery = null;
      state.slashQuery = "";
      state.slashActiveIndex = 0;
      state.composerDraft = ensureTrailingComposerToken(state.composerDraft, "/");
      render();
      focusComposerAtEnd();
      return;
    default:
      state.attachmentMenuOpen = false;
      state.browserActionPermissionMenuOpen = false;
      render();
  }
}

function ensureTrailingComposerToken(value: string, token: "@" | "/"): string {
  const trimmedEnd = value.trimEnd();
  if (trimmedEnd.endsWith(token)) {
    return trimmedEnd;
  }
  return `${trimmedEnd}${trimmedEnd ? " " : ""}${token}`;
}

function focusComposerAtEnd(): void {
  const composer = root.querySelector<HTMLTextAreaElement>("#composer");
  if (!composer) {
    return;
  }
  composer.value = state.composerDraft;
  composer.focus({ preventScroll: true });
  composer.selectionStart = composer.value.length;
  composer.selectionEnd = composer.value.length;
  rememberComposerInteraction(composer);
}

async function loadTabs(): Promise<void> {
  const result = (await sendRuntimeMessageWithConfirmation<{ tabs: OpenTabContext[] }>({
    type: "context.tabs.list",
  })) as { tabs?: OpenTabContext[]; cancelled?: boolean };
  if (isCancelledResult(result) || !result.tabs) {
    return;
  }
  state.openTabOptions = result.tabs as OpenTabContext[];
  state.openTabOptionsState = "ready";
  const container = root.querySelector<HTMLDivElement>("#tabs-container");
  if (!container) {
    return;
  }
  container.innerHTML = result.tabs
    .slice(0, 10)
    .map(
      (tab) => `
        <label class="tab-row tab-row-with-icon">
          <input type="checkbox" data-tab-id="${tab.tabId}" ${state.selectedTabIds.includes(tab.tabId) ? "checked" : ""} />
          ${renderTabReferenceIcon(tab)}
          <span>${escapeHtml(tab.title)}</span>
          <small>${escapeHtml(tab.url)}</small>
        </label>
      `,
    )
    .join("");
  container.querySelectorAll<HTMLInputElement>("input[type=checkbox]").forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const tabId = Number(checkbox.dataset.tabId);
      if (checkbox.checked) {
        if (!state.selectedTabIds.includes(tabId)) {
          state.selectedTabIds = [...state.selectedTabIds, tabId].slice(0, 10);
        }
        state.attachments.add("open-tabs");
      } else {
        state.selectedTabIds = state.selectedTabIds.filter((value) => value !== tabId);
      }
      scheduleConversationPersist();
      render();
    });
  });
}

async function refreshOpenTabSuggestions(options: { requestPermission: boolean }): Promise<void> {
  if (state.openTabOptionsState === "loading") {
    return;
  }

  state.openTabOptionsState = "loading";
  state.openTabOptionsError = "";
  render();

  try {
    if (!options.requestPermission) {
      const alreadyGranted = await chrome.permissions.contains({ permissions: ["tabs"] }).catch(() => false);
      if (!alreadyGranted) {
        state.openTabOptions = [];
        state.openTabOptionsState = "permission";
        render();
        return;
      }
    }

    const result = options.requestPermission
      ? await sendRuntimeMessageWithConfirmation<{ tabs: OpenTabContext[] }>({ type: "context.tabs.list" })
      : await sendRuntimeMessage<{ tabs?: OpenTabContext[]; requiresPermission?: boolean }>({ type: "context.tabs.list" });

    const tabResult = result as { tabs?: OpenTabContext[]; requiresPermission?: boolean };
    if (isCancelledResult(result) || tabResult.requiresPermission) {
      state.openTabOptions = [];
      state.openTabOptionsState = "permission";
      render();
      return;
    }

    state.openTabOptions = tabResult.tabs ?? [];
    state.openTabOptionsState = "ready";
  } catch (error) {
    state.openTabOptions = [];
    state.openTabOptionsState = "error";
    state.openTabOptionsError = toUserFacingRuntimeError(error);
  }
  render();
}

async function sendPrompt(messageOverride?: string, options: { resetThread?: boolean } = {}): Promise<void> {
  if (!canSendCurrentComposerMessage()) {
    return;
  }

  const composer = root.querySelector<HTMLTextAreaElement>("#composer");
  const strings = stringsForState();
  const message = (messageOverride ?? composer?.value ?? "").trim() || defaultPromptForContext(strings);
  if (!message) {
    return;
  }

  if (smokeTestMode) {
    smokeDryRunSubmissions.push(message);
    state.composerDraft = "";
    clearTransientComposerCommandPill();
    if (composer) {
      composer.value = "";
    }
    state.mentionQuery = null;
    state.slashQuery = null;
    render();
    return;
  }

  if (state.settings.allowBrowserActions) {
    const command = parseVoiceNavigationCommand(message);
    if (command) {
      const response = await sendRuntimeMessageWithConfirmation<{ matched?: boolean; cancelled?: boolean }>({
        type: "page.navigate",
        command,
      });
      if (isCancelledResult(response)) {
        return;
      }
      state.composerDraft = "";
      clearTransientComposerCommandPill();
      state.liveCaption = message;
      if (composer) {
        composer.value = "";
      }
      scheduleConversationPersist();
      render();
      return;
    }
  }

  Object.assign(state, createPendingComposerDraftState());
  state.activeView = "chat";
  const activeProfileId = ensureComposerProfileSelection();
  if (options.resetThread) {
    state.threadId = "";
    state.activeTurn = null;
  }
  sanitizeUnavailableCurrentPageState();
  const nextAttachments = Array.from(state.attachments);
  const nextFileAttachments = [...state.fileAttachments];
  const contextHint = buildConversationContextHint();
  const messageProfile = createMessageProfileSnapshot();
  const userMessageId = `user-${Date.now()}`;
  const clientRequestId = `prompt-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  state.promptActivity = {
    clientRequestId,
    phase: "preparing",
  };
  state.messages.push({
    id: userMessageId,
    role: "user",
    text: message,
    ...(nextFileAttachments.length ? { attachments: createConversationMessageAttachments(nextFileAttachments) } : {}),
    ...(messageProfile ? { profile: messageProfile } : {}),
  });
  render();
  scheduleConversationPersist();

  try {
    const result = await sendRuntimeMessageWithConfirmation<{
      threadId: string;
      turnId: string;
      actionCards: ActionCard[];
      currentConversationId?: string;
      workflow?: "image-edit" | "browser-action" | "generated-image";
      assistantText?: string;
      previewRef?: string;
      previewRefs?: string[];
      appliedToPage?: boolean;
      cancelled?: boolean;
    }>({
      type: "prompt.send",
      payload: {
        message,
        contextHint,
        clientRequestId,
        profileId: activeProfileId,
        model: state.selectedModel,
        reasoningEffort: state.selectedReasoningEffort || undefined,
        serviceTier: state.selectedServiceTier || undefined,
        readStrategyOverride: state.currentReadStrategy,
        attachments: nextAttachments,
        fileAttachments: nextFileAttachments,
        structuredInputs: getPromptStructuredInputs(),
        selectedTabIds: state.selectedTabIds,
        historyQuery: state.historyQuery,
        resetThread: options.resetThread,
        suppressPageContext: isCurrentTabContextDismissed(),
        conversationMessageCount: state.messages.length,
      },
    });
    if (cancelledPromptRequestIds.delete(clientRequestId)) {
      removePendingImageWorkflowMessage(clientRequestId);
      scheduleConversationPersist();
      return;
    }
    if (isCancelledResult(result)) {
      if (state.pendingPermission) {
        state.pendingPermission = {
          ...state.pendingPermission,
          retryMessage: message,
        };
      }
      removePendingImageWorkflowMessage(clientRequestId);
      state.messages = state.messages.filter((entry) => entry.id !== userMessageId);
      state.promptActivity = null;
      state.streamingAssistantMessageIds.clear();
      Object.assign(state, createRestoredComposerDraftState(message));
      if (composer) {
        composer.value = message;
      }
      render();
      return;
    }
    if (result.workflow === "image-edit") {
      state.currentConversationId = result.currentConversationId ?? state.currentConversationId;
      state.actionCards = result.actionCards;
      state.promptActivity = null;
      state.streamingAssistantMessageIds.clear();
      const imageAlt = state.uiLocale === "ko" ? "편집된 이미지" : "Edited image";
      const messageId = replacePendingImageWorkflowMessage(
        clientRequestId,
        result.assistantText,
        result.previewRef ? createPendingConversationImage(result.previewRef, imageAlt) : undefined,
      );
      if (composer) {
        composer.value = "";
      }
      Object.assign(state, createPendingComposerDraftState());
      clearTransientComposerCommandPill();
      clearTransientComposerContext();
      state.activeTurn = null;
      scheduleConversationPersist();
      render();
      if (result.previewRef) {
        void hydrateConversationImage(messageId, result.previewRef, imageAlt);
      }
      return;
    }
    if (result.workflow === "generated-image") {
      state.currentConversationId = result.currentConversationId ?? state.currentConversationId;
      state.actionCards = result.actionCards;
      state.promptActivity = null;
      state.streamingAssistantMessageIds.clear();
      const previewRefs = normalizeImagePreviewRefs(result.previewRefs, result.previewRef);
      const imageAlt = state.uiLocale === "ko" ? "생성된 이미지" : "Generated image";
      const streamedPreviewRefs = consumeStreamedImagePreviewRefs(clientRequestId);
      if (streamedPreviewRefs.length) {
        const missingPreviewRefs = previewRefs.filter((previewRef) => !streamedPreviewRefs.includes(previewRef));
        const messageId = ensurePendingImageWorkflowMessage(clientRequestId, "generated-image") ?? pushImageWorkflowAssistantMessage("", []);
        for (const [index, previewRef] of missingPreviewRefs.entries()) {
          appendStreamedImageToWorkflowMessage(
            clientRequestId,
            createPendingConversationImage(previewRef, createGeneratedImageAlt(imageAlt, streamedPreviewRefs.length + index, previewRefs.length)),
            previewRef,
          );
        }
        pendingImageWorkflowMessageIdsByRequest.delete(clientRequestId);
        rememberCompletedImageWorkflowMessage(clientRequestId, messageId);
        if (missingPreviewRefs.length) {
          void hydrateConversationImages(messageId, missingPreviewRefs, imageAlt);
        }
      } else {
        const messageId = replacePendingImageWorkflowMessage(
          clientRequestId,
          result.assistantText ?? null,
          previewRefs.map((previewRef, index) =>
            createPendingConversationImage(previewRef, createGeneratedImageAlt(imageAlt, index, previewRefs.length)),
          ),
        );
        rememberCompletedImageWorkflowMessage(clientRequestId, messageId);
        void hydrateConversationImages(messageId, previewRefs, imageAlt);
      }
      if (composer) {
        composer.value = "";
      }
      Object.assign(state, createPendingComposerDraftState());
      clearTransientComposerCommandPill();
      clearTransientComposerContext();
      state.activeTurn = null;
      scheduleConversationPersist();
      render();
      return;
    }
    removePendingImageWorkflowMessage(clientRequestId);
    if (result.workflow === "browser-action") {
      state.currentConversationId = result.currentConversationId ?? state.currentConversationId;
      state.actionCards = result.actionCards;
      state.promptActivity = null;
      state.streamingAssistantMessageIds.clear();
      state.messages.push({
        id: `assistant-browser-action-${Date.now()}`,
        role: "assistant",
        text: result.assistantText?.trim() || (state.uiLocale === "ko" ? "현재 페이지에서 요청한 작업을 처리했습니다." : "I handled the requested page action."),
      });
      if (composer) {
        composer.value = "";
      }
      Object.assign(state, createPendingComposerDraftState());
      clearTransientComposerCommandPill();
      clearTransientComposerContext();
      state.activeTurn = null;
      scheduleConversationPersist();
      render();
      return;
    }
    state.threadId = result.threadId;
    completedTurnIds.delete(result.turnId);
    state.promptActivity = null;
    state.activeTurn = null;
    state.currentConversationId = result.currentConversationId ?? state.currentConversationId;
    state.actionCards = result.actionCards;
    if (composer) {
      composer.value = "";
    }
    Object.assign(state, createPendingComposerDraftState());
    clearTransientComposerCommandPill();
    clearTransientComposerContext();
    scheduleConversationPersist();
    render();
  } catch (error) {
    if (cancelledPromptRequestIds.delete(clientRequestId)) {
      removePendingImageWorkflowMessage(clientRequestId);
      scheduleConversationPersist();
      return;
    }
    removePendingImageWorkflowMessage(clientRequestId);
    state.promptActivity = null;
    state.streamingAssistantMessageIds.clear();
    const errorMessage = toUserFacingRuntimeError(error);
    state.messages.push(createAssistantFailureMessage(errorMessage, state.uiLocale));
    Object.assign(state, createPendingComposerDraftState());
    if (composer) {
      composer.value = "";
    }
    state.initError = errorMessage;
    state.activeTurn = null;
    scheduleConversationPersist();
    render();
  }
}

async function handleActionCard(actionId: string): Promise<void> {
  const selectedCard = getPinnedSuggestionCards().find((card) => card.id === actionId);
  if (isYouTubeCurrentMomentAction(actionId)) {
    try {
      const result = await sendRuntimeMessageWithConfirmation<YouTubeCurrentMomentPromptResult>({
        type: "youtube.current-moment.prompt",
      });
      if (isCancelledResult(result)) {
        return;
      }
      clearVisualPromptAttachments();
      state.activeView = "chat";
      await sendPrompt(result.prompt);
    } catch (error) {
      state.initError = toUserFacingRuntimeError(error);
      render();
    }
    return;
  }

  if (actionId === "news-infographic") {
    await createInfographicFromCurrentPage();
    return;
  }

  if (selectedCard && isSlideImageGenerationActionCard(selectedCard)) {
    await createSlideImagesFromCurrentPage(selectedCard.prompt ?? "");
    return;
  }

  if (selectedCard?.prompt) {
    if (isTextFirstActionCard(selectedCard)) {
      clearVisualPromptAttachments();
    }
    state.activeView = "chat";
    await sendPrompt(selectedCard.prompt);
    return;
  }

  if (actionId === "edit-image") {
    const clientRequestId = `action-image-edit-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    state.activeView = "chat";
    state.promptActivity = {
      clientRequestId,
      phase: "preparing-image",
    };
    pushPendingImageWorkflowMessage(clientRequestId, "image-edit");
    render();
    try {
      const result = await sendRuntimeMessageWithConfirmation<{ previewRef?: string; cancelled?: boolean }>({
        type: "image.edit.start",
        prompt:
          state.uiLocale === "ko"
            ? "주 피사체는 유지하면서 현재 이미지를 더 완성도 높게 다듬어줘."
            : "Improve this image while preserving the main subject.",
      });
      if (isCancelledResult(result) || !result.previewRef) {
        removePendingImageWorkflowMessage(clientRequestId);
        state.promptActivity = null;
        render();
        return;
      }
      const imageAlt = state.uiLocale === "ko" ? "편집된 이미지" : "Edited image";
      const messageId = replacePendingImageWorkflowMessage(
        clientRequestId,
        null,
        createPendingConversationImage(result.previewRef, imageAlt),
      );
      state.promptActivity = null;
      scheduleConversationPersist();
      render();
      void hydrateConversationImage(messageId, result.previewRef, imageAlt);
      await sendRuntimeMessageWithConfirmation({
        type: "page.apply-image-overlay",
        previewRef: result.previewRef,
      });
    } catch (error) {
      removePendingImageWorkflowMessage(clientRequestId);
      state.promptActivity = null;
      state.initError = toUserFacingRuntimeError(error);
      state.messages.push(createAssistantFailureMessage(state.initError, state.uiLocale));
      scheduleConversationPersist();
      render();
    }
    return;
  }

  if (actionId.startsWith("seek-")) {
    await seekYouTubeTimestamp(Number(actionId.replace("seek-", "")));
    return;
  }

  const prompts: Record<string, string> = {
    "summarize-page": state.uiLocale === "ko" ? "현재 페이지를 요약해줘." : "Summarize the current page.",
    "summarize-video": state.uiLocale === "ko" ? "현재 유튜브 영상을 섹션별로 요약해줘." : "Summarize the current YouTube video with sections.",
    "summarize-current-timestamp":
      state.uiLocale === "ko" ? "현재 타임스탬프에서 무슨 일이 일어나고 있는지 설명해줘." : "Explain what is happening at the current timestamp.",
    "draft-blog-post": state.uiLocale === "ko" ? "이 페이지를 바탕으로 제목과 섹션이 있는 블로그 초안을 써줘." : "Turn this page into a blog draft with headings.",
  };
  const prompt = prompts[actionId];
  if (prompt) {
    state.activeView = "chat";
    await sendPrompt(prompt);
  }
}

async function seekYouTubeTimestamp(seconds: number): Promise<void> {
  if (!Number.isFinite(seconds)) {
    return;
  }
  try {
    await sendRuntimeMessageWithConfirmation({
      type: "youtube.seek",
      seconds,
    });
  } catch (error) {
    state.initError = toUserFacingRuntimeError(error);
    render();
  }
}

async function createInfographicFromCurrentPage(): Promise<void> {
  if (!canSendCurrentComposerMessage()) {
    return;
  }

  const userMessageText = state.uiLocale === "ko" ? "현재 페이지로 인포그래픽 만들기" : "Create an infographic from this page";
  const userMessageId = `user-infographic-${Date.now()}`;
  const clientRequestId = `infographic-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const messageProfile = createMessageProfileSnapshot();
  state.activeView = "chat";
  state.promptActivity = {
    clientRequestId,
    phase: "preparing-image",
  };
  state.messages.push({
    id: userMessageId,
    role: "user",
    text: userMessageText,
    ...(messageProfile ? { profile: messageProfile } : {}),
  });
  pushPendingImageWorkflowMessage(clientRequestId, "infographic");
  scheduleConversationPersist();
  render();

  try {
    const result = await sendRuntimeMessageWithConfirmation<{
      workflow?: "infographic";
      previewRef?: string;
      previewRefs?: string[];
      actionCards?: ActionCard[];
      cancelled?: boolean;
    }>({
      type: "image.infographic.start",
      clientRequestId,
      conversationContext: buildInfographicConversationContext(state.messages),
    });
    if (isCancelledResult(result)) {
      removePendingImageWorkflowMessage(clientRequestId);
      state.messages = state.messages.filter((entry) => entry.id !== userMessageId);
      state.promptActivity = null;
      render();
      return;
    }
    const previewRefs = normalizeImagePreviewRefs(result.previewRefs, result.previewRef);
    if (!previewRefs.length) {
      removePendingImageWorkflowMessage(clientRequestId);
      state.messages = state.messages.filter((entry) => entry.id !== userMessageId);
      state.promptActivity = null;
      render();
      return;
    }

    state.actionCards = result.actionCards ?? state.actionCards;
    state.promptActivity = null;
    state.streamingAssistantMessageIds.clear();
    const imageAlt = state.uiLocale === "ko" ? "현재 페이지 인포그래픽" : "Current page infographic";
    const streamedPreviewRefs = consumeStreamedImagePreviewRefs(clientRequestId);
    if (streamedPreviewRefs.length) {
      const missingPreviewRefs = previewRefs.filter((previewRef) => !streamedPreviewRefs.includes(previewRef));
      const messageId = ensurePendingImageWorkflowMessage(clientRequestId, "infographic") ?? pushImageWorkflowAssistantMessage("", []);
      for (const [index, previewRef] of missingPreviewRefs.entries()) {
        appendStreamedImageToWorkflowMessage(
          clientRequestId,
          createPendingConversationImage(previewRef, createGeneratedImageAlt(imageAlt, streamedPreviewRefs.length + index, previewRefs.length)),
          previewRef,
        );
      }
      pendingImageWorkflowMessageIdsByRequest.delete(clientRequestId);
      rememberCompletedImageWorkflowMessage(clientRequestId, messageId);
      scheduleConversationPersist();
      render();
      if (missingPreviewRefs.length) {
        void hydrateConversationImages(messageId, missingPreviewRefs, imageAlt);
      }
      return;
    }
    const messageId = replacePendingImageWorkflowMessage(
      clientRequestId,
      null,
      previewRefs.map((previewRef, index) =>
        createPendingConversationImage(previewRef, createGeneratedImageAlt(imageAlt, index, previewRefs.length)),
      ),
    );
    rememberCompletedImageWorkflowMessage(clientRequestId, messageId);
    scheduleConversationPersist();
    render();
    void hydrateConversationImages(messageId, previewRefs, imageAlt);
  } catch (error) {
    removePendingImageWorkflowMessage(clientRequestId);
    state.promptActivity = null;
    state.streamingAssistantMessageIds.clear();
    const errorMessage = toUserFacingRuntimeError(error);
    state.messages.push(createAssistantFailureMessage(errorMessage, state.uiLocale));
    state.initError = errorMessage;
    scheduleConversationPersist();
    render();
  }
}

async function createSlideImagesFromCurrentPage(prompt: string): Promise<void> {
  if (!canSendCurrentComposerMessage()) {
    return;
  }

  const userMessageText =
    prompt.trim() || (state.uiLocale === "ko" ? "현재 페이지로 슬라이드 이미지 만들기" : "Create slide images from this page");
  const userMessageId = `user-slide-images-${Date.now()}`;
  const clientRequestId = `slide-images-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const messageProfile = createMessageProfileSnapshot();
  state.activeView = "chat";
  state.promptActivity = {
    clientRequestId,
    phase: "preparing-image",
  };
  state.messages.push({
    id: userMessageId,
    role: "user",
    text: userMessageText,
    ...(messageProfile ? { profile: messageProfile } : {}),
  });
  pushPendingImageWorkflowMessage(clientRequestId, "slide-images");
  scheduleConversationPersist();
  render();

  try {
    const result = await sendRuntimeMessageWithConfirmation<{
      workflow?: "slide-images";
      previewRef?: string;
      previewRefs?: string[];
      actionCards?: ActionCard[];
      cancelled?: boolean;
    }>({
      type: "image.slides.start",
      clientRequestId,
      prompt: userMessageText,
      conversationContext: buildInfographicConversationContext(state.messages),
    });
    if (isCancelledResult(result)) {
      removePendingImageWorkflowMessage(clientRequestId);
      state.messages = state.messages.filter((entry) => entry.id !== userMessageId);
      state.promptActivity = null;
      render();
      return;
    }
    const previewRefs = normalizeImagePreviewRefs(result.previewRefs, result.previewRef);
    if (!previewRefs.length) {
      removePendingImageWorkflowMessage(clientRequestId);
      state.messages = state.messages.filter((entry) => entry.id !== userMessageId);
      state.promptActivity = null;
      render();
      return;
    }

    state.actionCards = result.actionCards ?? state.actionCards;
    state.promptActivity = null;
    state.streamingAssistantMessageIds.clear();
    const imageAlt = state.uiLocale === "ko" ? "발표 슬라이드 이미지" : "Presentation slide image";
    const streamedPreviewRefs = consumeStreamedImagePreviewRefs(clientRequestId);
    if (streamedPreviewRefs.length) {
      const missingPreviewRefs = previewRefs.filter((previewRef) => !streamedPreviewRefs.includes(previewRef));
      const messageId = ensurePendingImageWorkflowMessage(clientRequestId, "slide-images") ?? pushImageWorkflowAssistantMessage("", []);
      for (const [index, previewRef] of missingPreviewRefs.entries()) {
        appendStreamedImageToWorkflowMessage(
          clientRequestId,
          createPendingConversationImage(previewRef, createGeneratedImageAlt(imageAlt, streamedPreviewRefs.length + index, previewRefs.length)),
          previewRef,
        );
      }
      pendingImageWorkflowMessageIdsByRequest.delete(clientRequestId);
      rememberCompletedImageWorkflowMessage(clientRequestId, messageId);
      scheduleConversationPersist();
      render();
      if (missingPreviewRefs.length) {
        void hydrateConversationImages(messageId, missingPreviewRefs, imageAlt);
      }
      return;
    }
    const messageId = replacePendingImageWorkflowMessage(
      clientRequestId,
      null,
      previewRefs.map((previewRef, index) =>
        createPendingConversationImage(previewRef, createGeneratedImageAlt(imageAlt, index, previewRefs.length)),
      ),
    );
    rememberCompletedImageWorkflowMessage(clientRequestId, messageId);
    scheduleConversationPersist();
    render();
    void hydrateConversationImages(messageId, previewRefs, imageAlt);
  } catch (error) {
    removePendingImageWorkflowMessage(clientRequestId);
    state.promptActivity = null;
    state.streamingAssistantMessageIds.clear();
    const errorMessage = toUserFacingRuntimeError(error);
    state.messages.push(createAssistantFailureMessage(errorMessage, state.uiLocale));
    state.initError = errorMessage;
    scheduleConversationPersist();
    render();
  }
}

function buildInfographicConversationContext(messages: ConversationMessage[]): string {
  return messages
    .filter((message) => message.text.trim().length > 0)
    .slice(-8)
    .map((message) => `${message.role === "user" ? "User" : "Assistant"}: ${message.text.trim()}`)
    .join("\n\n")
    .slice(0, 8_000);
}

async function copyConversationMessage(messageId: string | undefined): Promise<void> {
  const message = state.messages.find((entry) => entry.id === messageId);
  if (!message?.text.trim()) {
    return;
  }

  await navigator.clipboard.writeText(message.text);
  state.actionStatus = "";
  markMessageCopied(message.id);
  render();
}

async function deleteConversationFromUi(conversationId: string): Promise<void> {
  const strings = stringsForState();
  const message =
    state.uiLocale === "ko"
      ? "이 채팅을 최근 채팅 이력에서 삭제할까요?"
      : "Delete this chat from recent chat history?";
  const approved = await requestNativeConfirmation(message, {
    title: strings.actions.deleteChat,
    confirmLabel: strings.actions.deleteChat,
    tone: "danger",
  });
  if (!approved) {
    return;
  }

  const deletingCurrentConversation = state.currentConversationId === conversationId;
  const result = await sendRuntimeMessage<{
    recentChats: ConversationSummary[];
    currentConversation: SavedConversation | null;
  }>({
    type: "conversation.delete",
    conversationId,
  });
  state.recentChats = result.recentChats;
  if (deletingCurrentConversation) {
    hydrateConversation(result.currentConversation);
    state.activeView = "chat";
  }
  state.appMenuOpen = false;
  state.actionStatus = strings.status.chatDeleted;
  render();
}

async function clearConversationHistoryFromUi(options: { returnToSettings?: boolean } = {}): Promise<void> {
  if (!state.recentChats.length) {
    return;
  }

  const strings = stringsForState();
  const message =
    state.uiLocale === "ko"
      ? "이 기기에 저장된 최근 채팅 이력을 모두 삭제할까요?"
      : "Clear all recent chat history stored on this device?";
  const approved = await requestNativeConfirmation(message, {
    title: strings.actions.clearRecentChats,
    confirmLabel: strings.actions.clearRecentChats,
    tone: "danger",
  });
  if (!approved) {
    return;
  }

  const result = await sendRuntimeMessage<{
    recentChats: ConversationSummary[];
    currentConversation: SavedConversation | null;
  }>({
    type: "conversation.clear",
  });
  state.recentChats = result.recentChats;
  hydrateConversation(result.currentConversation);
  state.activeView = options.returnToSettings ? "workspace" : "chat";
  state.appMenuOpen = false;
  state.actionStatus = strings.status.chatHistoryCleared;
  render();
}

async function saveCustomSiteSuggestionFromSettings(): Promise<void> {
  const input = root.querySelector<HTMLInputElement>("#custom-site-suggestion-input");
  const prompt = input?.value.trim() ?? "";
  if (!prompt || !state.currentTabReference) {
    return;
  }

  const nextSuggestions = upsertCustomSiteSuggestion(
    state.settings.customSiteSuggestions,
    state.currentTabReference,
    prompt,
  );
  state.settings = await sendRuntimeMessage<ExtensionSettings>({
    type: "settings.update",
    settings: { customSiteSuggestions: nextSuggestions },
  });
  state.actionStatus = stringsForState().status.siteSuggestionSaved;
  render();
}

async function deleteCustomSiteSuggestionFromSettings(suggestionId: string | undefined): Promise<void> {
  if (!suggestionId) {
    return;
  }
  const nextSuggestions = deleteCustomSiteSuggestion(state.settings.customSiteSuggestions, suggestionId);
  state.settings = await sendRuntimeMessage<ExtensionSettings>({
    type: "settings.update",
    settings: { customSiteSuggestions: nextSuggestions },
  });
  state.actionStatus = stringsForState().status.siteSuggestionDeleted;
  render();
}

function markMessageCopied(messageId: string): void {
  state.copiedMessageId = messageId;
  if (copiedMessageResetTimer !== null) {
    window.clearTimeout(copiedMessageResetTimer);
  }

  copiedMessageResetTimer = window.setTimeout(() => {
    copiedMessageResetTimer = null;
    if (state.copiedMessageId !== messageId) {
      return;
    }
    state.copiedMessageId = "";
    render();
  }, 1400);
}

async function copyMessageCodeBlock(button: HTMLButtonElement): Promise<void> {
  const code = button.closest(".message-code-block")?.querySelector("code")?.textContent ?? "";
  if (!code.trim()) {
    return;
  }

  await navigator.clipboard.writeText(code);
  const strings = stringsForState();
  state.actionStatus = strings.status.messageCopied;
  render();
}

async function replayConversationFromMessage(
  messageId: string | undefined,
  editedPrompt?: string,
): Promise<void> {
  if (!messageId || !canSendCurrentComposerMessage()) {
    return;
  }

  const replay = prepareMessageReplay(state.messages, messageId, editedPrompt);
  if (!replay) {
    return;
  }

  state.messages = replay.messagesBeforePrompt;
  state.editingMessageId = null;
  state.threadId = "";
  state.activeTurn = null;
  scheduleConversationPersist();
  await sendPrompt(replay.prompt, { resetThread: true });
}

function isTextFirstActionCard(card: ActionCard): boolean {
  return (
    card.kind === "prompt" ||
    card.id === "summarize-video" ||
    card.id === "summarize-current-timestamp" ||
    card.id === "draft-blog-post" ||
    card.id === "summarize-page"
  );
}

function isSlideImageGenerationActionCard(card: ActionCard): boolean {
  return card.id === "profile-slide-maker-1";
}

function upsertTurnActivityTrace(activity: {
  threadId: string;
  turnId: string;
  itemId: string;
  kind: NonNullable<ConversationMessage["trace"]>[number]["kind"];
  title: string;
  detail: string;
  status: "running" | "completed";
  timestampMs: number;
}): void {
  if (isNoisyTraceText(activity.title) || isNoisyTraceText(activity.detail)) {
    return;
  }
  const messageId = createTurnTraceMessageId(activity.threadId, activity.turnId);
  let message = state.messages.find((entry) => entry.id === messageId);
  if (!message) {
    message = {
      id: messageId,
      role: "assistant",
      text: "",
      trace: [],
    };
    state.messages.push(message);
  }
  const trace = [...(message.trace ?? [])];
  const existingIndex = trace.findIndex((item) => item.id === activity.itemId);
  const nextItem = {
    id: activity.itemId,
    kind: activity.kind,
    title: activity.title.trim(),
    detail: activity.detail.trim(),
    status: activity.status,
    timestampMs: activity.timestampMs,
  };
  if (existingIndex >= 0) {
    trace[existingIndex] = {
      ...trace[existingIndex],
      ...nextItem,
      timestampMs: trace[existingIndex]?.timestampMs || nextItem.timestampMs,
    };
  } else {
    trace.push(nextItem);
  }
  message.trace = trace.slice(-MAX_TRACE_ITEMS);
  scheduleConversationPersist();
}

function upsertTurnPlanTrace(plan: CodexTurnPlan): void {
  const steps = plan.steps
    .map((step) => ({
      step: step.step.trim(),
      status: step.status,
    }))
    .filter((step) => step.step && !isNoisyTraceText(step.step));
  removeTurnTraceItems(plan.threadId, plan.turnId, (item) => item.id.startsWith("plan-"));

  for (const [index, step] of steps.entries()) {
    if (!step.step) {
      continue;
    }
    upsertTurnActivityTrace({
      threadId: plan.threadId,
      turnId: plan.turnId,
      itemId: `plan-${index}`,
      kind: "reasoning",
      title: state.uiLocale === "ko" ? "계획" : "Plan",
      detail: step.step,
      status: step.status === "completed" || step.status === "done" ? "completed" : "running",
      timestampMs: Date.now() + index,
    });
  }
}

function removeTurnTraceItems(
  threadId: string,
  turnId: string,
  predicate: (item: NonNullable<ConversationMessage["trace"]>[number]) => boolean,
): void {
  const message = state.messages.find((entry) => entry.id === createTurnTraceMessageId(threadId, turnId));
  if (!message?.trace?.length) {
    return;
  }
  const nextTrace = message.trace.filter((item) => !predicate(item));
  if (nextTrace.length === message.trace.length) {
    return;
  }
  message.trace = nextTrace;
  if (!nextTrace.length && message.role === "assistant" && !message.text.trim() && !(message.images ?? []).length) {
    state.messages = state.messages.filter((entry) => entry.id !== message.id);
  }
  scheduleConversationPersist();
}

function upsertTurnDiffTrace(diff: CodexTurnDiff): void {
  if (!diff.diff.trim()) {
    return;
  }
  upsertTurnActivityTrace({
    threadId: diff.threadId,
    turnId: diff.turnId,
    itemId: "turn-diff",
    kind: "file",
    title: state.uiLocale === "ko" ? "파일 변경" : "File changes",
    detail: diff.diff.split("\n").find((line) => line.trim())?.trim().slice(0, 180) ?? "",
    status: "completed",
    timestampMs: Date.now(),
  });
}

function markActiveTurnTraceItemsCompleted(): void {
  if (!state.activeTurn?.threadId || !state.activeTurn.turnId) {
    return;
  }
  completeTurnTrace(state.activeTurn.threadId, state.activeTurn.turnId);
}

function completeTurnTrace(threadId: string, turnId: string): void {
  if (!threadId || !turnId) {
    return;
  }
  const message = state.messages.find((entry) => entry.id === createTurnTraceMessageId(threadId, turnId));
  if (!message?.trace?.length) {
    return;
  }
  message.trace = message.trace.map((item) => ({
    ...item,
    status: "completed",
  }));
  scheduleConversationPersist();
}

function createTurnTraceMessageId(threadId: string, turnId: string): string {
  return `turn-trace-${threadId}-${turnId}`;
}

function normalizeTraceEventKind(value: unknown): NonNullable<ConversationMessage["trace"]>[number]["kind"] {
  switch (value) {
    case "reasoning":
    case "web":
    case "file":
    case "command":
    case "tool":
    case "browser":
    case "image":
    case "response":
      return value;
    default:
      return "tool";
  }
}

function isTraceOnlyAssistantMessage(message: ConversationMessage): boolean {
  return message.role === "assistant" && !message.text.trim() && Boolean(message.trace?.length) && !(message.images ?? []).length;
}

function upsertAssistantMessage(itemId: string, fragment: string, append: boolean): void {
  const existing = state.messages.find((message) => message.id === itemId);
  const nextText = consumeProfileQuestionFromAssistantText(itemId, existing?.text ?? "", fragment, append);
  if (!existing && !nextText.trim()) {
    return;
  }
  if (!existing) {
    state.messages.push({
      id: itemId,
      role: "assistant",
      text: nextText,
    });
  } else {
    existing.text = nextText;
  }
}

function consumeProfileQuestionFromAssistantText(itemId: string, currentText: string, fragment: string, append: boolean): string {
  if (!append) {
    profileQuestionStreamBuffers.delete(itemId);
  }
  const rawText = append ? `${currentText}${fragment}` : fragment;
  if (!isProfileQuestionModeEnabledForCurrentTurn()) {
    profileQuestionStreamBuffers.delete(itemId);
    return rawText;
  }

  const buffered = append ? profileQuestionStreamBuffers.get(itemId) : undefined;
  if (buffered !== undefined) {
    const combined = `${buffered}${fragment}`;
    const parsed = parseProfileAskUserQuestion(combined);
    if (parsed) {
      profileQuestionStreamBuffers.delete(itemId);
      setPendingProfileQuestion(itemId, parsed);
      return joinAssistantTextParts(currentText, parsed.cleanedText);
    }
    profileQuestionStreamBuffers.set(itemId, combined);
    return currentText;
  }

  const parsed = parseProfileAskUserQuestion(rawText);
  if (parsed) {
    setPendingProfileQuestion(itemId, parsed);
    return parsed.cleanedText;
  }

  if (hasProfileAskUserQuestionStart(rawText)) {
    if (append) {
      const markerIndex = rawText.indexOf(`<${ASK_USER_QUESTION_TAG}>`);
      if (markerIndex >= 0) {
        profileQuestionStreamBuffers.set(itemId, rawText.slice(markerIndex));
      }
    }
    return stripIncompleteProfileAskUserQuestion(rawText);
  }

  return rawText;
}

function joinAssistantTextParts(left: string, right: string): string {
  const leftTrimmed = left.trimEnd();
  const rightTrimmed = right.trim();
  if (!leftTrimmed) {
    return rightTrimmed;
  }
  if (!rightTrimmed) {
    return leftTrimmed;
  }
  return `${leftTrimmed}\n\n${rightTrimmed}`;
}

function isProfileQuestionModeEnabledForCurrentTurn(): boolean {
  return resolveProfileQuestionProfile()?.id !== DEFAULT_PROFILE_ID;
}

function resolveProfileQuestionProfile(): ProfileTemplate | null {
  let lastUserProfileId: string | undefined;
  for (let index = state.messages.length - 1; index >= 0; index -= 1) {
    const message = state.messages[index];
    if (message?.role === "user" && message.profile?.id) {
      lastUserProfileId = message.profile.id;
      break;
    }
  }
  const profileId = lastUserProfileId || state.selectedProfileId;
  return state.profiles.find((profile) => profile.id === profileId) ?? null;
}

function setPendingProfileQuestion(itemId: string, question: ProfileAskUserQuestion): void {
  const profile = resolveProfileQuestionProfile();
  if (!profile || profile.id === DEFAULT_PROFILE_ID) {
    return;
  }

  state.pendingProfileQuestion = {
    id: `profile-question-${Date.now()}`,
    messageId: itemId,
    profileId: profile.id,
    profileName: profile.name,
    question: question.question,
    options: question.options,
    allowFreeform: question.allowFreeform,
    answer: "",
    createdAt: Date.now(),
  };
}

function flushStreamingAssistantDeltas(): void {
  streamingDeltaBuffer.flush();
}

function patchStreamingAssistantMessageDoms(itemIds: string[]): boolean {
  const uniqueItemIds = Array.from(new Set(itemIds));
  if (!uniqueItemIds.length) {
    return true;
  }
  if (root.querySelector(".prompt-activity-row")) {
    return false;
  }

  const scrollState = captureScrollPositions();
  for (const itemId of uniqueItemIds) {
    const message = state.messages.find((candidate) => candidate.id === itemId);
    const row = findConversationMessageRow(itemId);
    const content = row?.querySelector<HTMLElement>(".message-content") ?? null;
    if (!message || message.role !== "assistant" || !content) {
      return false;
    }
    content.innerHTML = renderMessageContentHtml(message.text, {
      enableYouTubeTimestampLinks: shouldRenderYouTubeTimestampLinks(),
    });
  }
  restoreScrollPositions(scrollState);
  updateScrollToBottomButtonVisibility();
  return true;
}

function findConversationMessageRow(messageId: string): HTMLElement | null {
  for (const row of Array.from(root.querySelectorAll<HTMLElement>("[data-message-id]"))) {
    if (row.dataset.messageId === messageId) {
      return row;
    }
  }
  return null;
}

type BridgeImageWorkflowEvent = {
  itemId: string;
  previewRef: string;
  alt: string;
  clientRequestId?: string;
  workflow?: Exclude<ImageWorkflowPlaceholderKind, "image-edit">;
  imageIndex?: number;
};

async function handleBridgeImageEvent(event: BridgeImageWorkflowEvent): Promise<void> {
  recordUiDiagnostic("sidepanel.image.event.received", {
    itemId: event.itemId,
    previewRef: event.previewRef,
    clientRequestId: event.clientRequestId ?? null,
    workflow: event.workflow ?? null,
    imageIndex: event.imageIndex ?? null,
  });
  const pendingImage = createPendingConversationImage(event.previewRef, event.alt);
  const workflowMessageId = appendStreamedImageToWorkflowMessage(event.clientRequestId, pendingImage, event.previewRef);
  if (!workflowMessageId) {
    upsertAssistantImageMessage(event.itemId, pendingImage);
    state.promptActivity = {
      clientRequestId: state.promptActivity?.clientRequestId ?? "generated-image",
      phase: "rendering-image-preview",
    };
  }
  scheduleConversationPersist();
  render();

  try {
    const image = await createConversationImageFromPreviewRef(event.previewRef, event.alt);
    recordUiDiagnostic("sidepanel.image.render.ready", {
      itemId: event.itemId,
      previewRef: event.previewRef,
      hasSrc: Boolean(image.src),
    });
    const hydratedWorkflowMessageId = appendStreamedImageToWorkflowMessage(event.clientRequestId, image, event.previewRef);
    if (!hydratedWorkflowMessageId) {
      state.promptActivity = null;
      upsertAssistantImageMessage(event.itemId, image);
    }
    await refreshImageAssetFolderQuietly();
    scheduleConversationPersist();
    render();
    void rememberAutoSavedConversationImage(hydratedWorkflowMessageId ?? event.itemId, event.previewRef);
  } catch (error) {
    recordUiDiagnostic("sidepanel.image.render.failed", {
      itemId: event.itemId,
      previewRef: event.previewRef,
      error: toUserFacingRuntimeError(error),
    });
    const failedWorkflowMessageId = appendStreamedImageToWorkflowMessage(
      event.clientRequestId,
      createFailedConversationImage(event.previewRef, event.alt),
      event.previewRef,
    );
    if (!failedWorkflowMessageId) {
      state.promptActivity = null;
      upsertAssistantImageMessage(event.itemId, createFailedConversationImage(event.previewRef, event.alt));
    }
    state.initError = toUserFacingRuntimeError(error);
    state.messages.push(createAssistantFailureMessage(state.initError, state.uiLocale));
    scheduleConversationPersist();
    render();
  }
}

function upsertAssistantImageMessage(itemId: string, image: ConversationMessageImage): void {
  const existing = state.messages.find((message) => message.id === itemId);
  if (!existing) {
    state.messages.push({
      id: itemId,
      role: "assistant",
      text: state.uiLocale === "ko" ? "생성된 이미지입니다." : "Generated image.",
      images: [image],
    });
    return;
  }

  const images = [...(existing.images ?? [])];
  const existingIndex = images.findIndex((candidate) => isSameConversationImage(candidate, image));
  if (existingIndex >= 0) {
    images[existingIndex] = image;
  } else {
    images.push(image);
  }
  existing.images = images;
}

function appendStreamedImageToWorkflowMessage(
  clientRequestId: string | undefined,
  image: ConversationMessageImage,
  previewRef: string,
): string | null {
  if (!clientRequestId) {
    return null;
  }
  const existing = getImageWorkflowMessageForStreaming(clientRequestId);
  if (!existing) {
    return null;
  }

  rememberStreamedImagePreviewRef(clientRequestId, previewRef);
  existing.text = "";
  const images = (existing.images ?? []).filter((candidate) => candidate.status !== "loading");
  const existingIndex = images.findIndex((candidate) => isSameConversationImage(candidate, image));
  if (existingIndex >= 0) {
    images[existingIndex] = image;
  } else {
    images.push(image);
  }
  existing.images = images;
  return existing.id;
}

function rememberStreamedImagePreviewRef(clientRequestId: string, previewRef: string): void {
  const normalized = previewRef.trim();
  if (!normalized) {
    return;
  }
  const current = streamedImagePreviewRefsByRequest.get(clientRequestId) ?? [];
  if (!current.includes(normalized)) {
    streamedImagePreviewRefsByRequest.set(clientRequestId, [...current, normalized]);
  }
}

function getImageWorkflowMessageForStreaming(clientRequestId: string): ConversationMessage | null {
  const messageId =
    pendingImageWorkflowMessageIdsByRequest.get(clientRequestId) ??
    completedImageWorkflowMessageIdsByRequest.get(clientRequestId);
  if (!messageId) {
    return null;
  }
  return state.messages.find((message) => message.id === messageId) ?? null;
}

function rememberCompletedImageWorkflowMessage(clientRequestId: string, messageId: string): void {
  completedImageWorkflowMessageIdsByRequest.set(clientRequestId, messageId);
  window.setTimeout(() => {
    if (completedImageWorkflowMessageIdsByRequest.get(clientRequestId) === messageId) {
      completedImageWorkflowMessageIdsByRequest.delete(clientRequestId);
    }
  }, 60_000);
}

async function resolvePreviewRefForUi(previewRef: string): Promise<string> {
  return resolveImagePreviewRefForUi(previewRef, (message) =>
    sendRuntimeMessage(message as unknown as Record<string, unknown>) as Promise<{
      dataBase64: string;
      mimeType: string;
      sizeBytes: number;
      offset: number;
      nextOffset: number;
      done: boolean;
    }>,
  );
}

async function downloadConversationImage(messageId: string | undefined, imageIndex: string | undefined): Promise<void> {
  const image = await getConversationImageForAction(messageId, imageIndex);
  if (!image?.src) {
    return;
  }

  downloadReadyConversationImage(image);
  scheduleConversationPersist();
  state.actionStatus = state.uiLocale === "ko" ? "이미지 다운로드를 시작했습니다." : "Image download started.";
  render();
}

function downloadReadyConversationImage(image: ConversationMessageImage): void {
  const anchor = document.createElement("a");
  anchor.href = image.src;
  anchor.download = buildImageDownloadName(image.alt);
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

async function openConversationImagePreview(messageId: string | undefined, imageIndex: string | undefined): Promise<void> {
  const image = await getConversationImageForAction(messageId, imageIndex);
  if (!image?.src) {
    return;
  }
  window.open(image.src, "_blank", "noopener,noreferrer");
}

async function rememberAutoSavedConversationImage(messageId: string, assetRef: string): Promise<void> {
  if (!isBridgeImageAssetRef(assetRef) || autoSavedImageAssetRefs.has(assetRef)) {
    return;
  }

  const image = state.messages.find((message) => message.id === messageId)?.images?.find((candidate) => candidate.assetRef === assetRef);
  if (!image?.assetRef) {
    return;
  }

  autoSavedImageAssetRefs.add(assetRef);
  try {
    await refreshImageAssetFolderQuietly();
    scheduleConversationPersist();
    recordUiDiagnostic("sidepanel.image.asset.auto_saved", {
      previewRef: assetRef,
    });
  } catch (error) {
    autoSavedImageAssetRefs.delete(assetRef);
    recordUiDiagnostic("sidepanel.image.asset.auto_save.failed", {
      previewRef: assetRef,
      error: toUserFacingRuntimeError(error),
    });
  }
}

async function releaseConversationImageAsset(image: ConversationMessageImage): Promise<boolean> {
  if (!image.assetRef) {
    return false;
  }
  const previewRef = image.assetRef;
  try {
    await sendRuntimeMessage({
      type: "image.asset.delete",
      previewRef,
    });
  } catch (error) {
    recordUiDiagnostic("sidepanel.image.asset_release.failed", {
      previewRef,
      error: toUserFacingRuntimeError(error),
    });
    return false;
  }
  delete image.assetRef;
  if (image.src) {
    image.status = "ready";
  } else {
    delete image.status;
  }
  await refreshImageAssetFolderQuietly();
  return true;
}

async function openConversationImageFollowupEditor(
  messageId: string | undefined,
  imageIndex: string | undefined,
): Promise<void> {
  const image = await getConversationImageForAction(messageId, imageIndex);
  const index = Number.parseInt(imageIndex ?? "", 10);
  if (!messageId || !Number.isFinite(index) || !image?.src || !isSafeMessageImageUrl(image.src)) {
    return;
  }
  state.imageAnnotationEditor = {
    source: "conversation",
    messageId,
    imageIndex: index,
    name: buildImageDownloadName(image.alt || (state.uiLocale === "ko" ? "생성된 이미지" : "generated-image")),
    dataUrl: image.src,
  };
  state.imageAnnotationReferenceAttachments = [];
  render();
}

async function refreshImageAssetFolderQuietly(): Promise<void> {
  try {
    state.imageAssetFolder = await sendRuntimeMessage<UiInitPayload["imageAssetFolder"]>({
      type: "image.asset.folder",
    });
  } catch {
    // Folder metadata is informational; image rendering should not fail because this refresh did.
  }
}

async function getConversationImageForAction(
  messageId: string | undefined,
  imageIndex: string | undefined,
): Promise<ConversationMessageImage | null> {
  const index = Number.parseInt(imageIndex ?? "", 10);
  if (!messageId || !Number.isFinite(index) || index < 0) {
    return null;
  }
  const image = state.messages.find((message) => message.id === messageId)?.images?.[index];
  if (!image) {
    return null;
  }
  if (!image.src && image.assetRef) {
    try {
      image.src = await resolvePreviewRefForUi(image.assetRef);
      image.status = "ready";
      render();
    } catch {
      image.status = "deleted";
      render();
      return null;
    }
  }
  return image;
}

function buildImageDownloadName(alt: string): string {
  const baseName = alt
    .toLowerCase()
    .replace(/[^a-z0-9가-힣_-]+/giu, "-")
    .replace(/^-+|-+$/gu, "")
    .slice(0, 48);
  return `${baseName || "codex-image"}-${new Date().toISOString().replace(/[:.]/gu, "-")}.png`;
}

function isImageWorkflowPromptActivityPhase(phase: PromptActivityPhase): boolean {
  return (
    phase === "preparing-image" ||
    phase === "editing-image" ||
    phase === "rendering-image-preview" ||
    phase === "applying-image-preview"
  );
}

function createImageWorkflowPlaceholderText(kind: ImageWorkflowPlaceholderKind): string {
  if (state.uiLocale === "ko") {
    switch (kind) {
      case "infographic":
        return "인포그래픽 이미지를 생성하고 있습니다.";
      case "slide-images":
        return "슬라이드 이미지를 순차적으로 생성하고 있습니다.";
      case "generated-image":
        return "이미지를 생성하고 있습니다.";
      case "image-edit":
      default:
        return "이미지 작업을 준비하고 있습니다.";
    }
  }

  switch (kind) {
    case "infographic":
      return "Creating an infographic image.";
    case "slide-images":
      return "Generating slide images sequentially.";
    case "generated-image":
      return "Generating an image.";
    case "image-edit":
    default:
      return "Preparing the image task.";
  }
}

function createImageWorkflowPlaceholderAlt(kind: ImageWorkflowPlaceholderKind): string {
  if (state.uiLocale === "ko") {
    switch (kind) {
      case "infographic":
        return "생성 중인 인포그래픽";
      case "slide-images":
        return "생성 중인 슬라이드 이미지";
      case "generated-image":
        return "생성 중인 이미지";
      case "image-edit":
      default:
        return "처리 중인 이미지";
    }
  }

  switch (kind) {
    case "infographic":
      return "Pending infographic";
    case "slide-images":
      return "Pending slide image";
    case "generated-image":
      return "Pending generated image";
    case "image-edit":
    default:
      return "Pending image edit";
  }
}

function createLoadingConversationImage(alt: string): ConversationMessageImage {
  return {
    src: "",
    alt,
    status: "loading",
  };
}

function createPendingConversationImage(previewRef: string, alt: string): ConversationMessageImage {
  const trimmed = previewRef.trim();
  return {
    src: isBridgeImageAssetRef(trimmed) ? "" : trimmed,
    alt,
    status: isBridgeImageAssetRef(trimmed) ? "loading" : "ready",
    ...(isBridgeImageAssetRef(trimmed) ? { assetRef: trimmed } : {}),
  };
}

function createFailedConversationImage(previewRef: string, alt: string): ConversationMessageImage {
  const trimmed = previewRef.trim();
  return {
    src: isBridgeImageAssetRef(trimmed) ? "" : trimmed,
    alt,
    status: "error",
    ...(isBridgeImageAssetRef(trimmed) ? { assetRef: trimmed } : {}),
  };
}

function isSameConversationImage(left: ConversationMessageImage, right: ConversationMessageImage): boolean {
  if (left.assetRef && right.assetRef) {
    return left.assetRef === right.assetRef;
  }
  if (left.src && right.src) {
    return left.src === right.src;
  }
  return false;
}

async function createConversationImageFromPreviewRef(previewRef: string, alt: string): Promise<ConversationMessageImage> {
  const image: ConversationMessageImage = {
    src: "",
    alt,
    status: "loading",
    ...(isBridgeImageAssetRef(previewRef) ? { assetRef: previewRef } : {}),
  };
  image.src = await resolvePreviewRefForUi(previewRef);
  image.status = "ready";
  return image;
}

function normalizeImagePreviewRefs(previewRefs: string[] | undefined, previewRef: string | undefined): string[] {
  return Array.from(
    new Set(
      [...(previewRefs ?? []), ...(previewRef ? [previewRef] : [])]
        .map((ref) => ref.trim())
        .filter(Boolean),
    ),
  );
}

function normalizeImageGenerateWorkflow(value: unknown): Exclude<ImageWorkflowPlaceholderKind, "image-edit"> | undefined {
  return value === "infographic" || value === "slide-images" || value === "generated-image" ? value : undefined;
}

function normalizePromptStatusImageWorkflow(value: unknown): ImageWorkflowPlaceholderKind | undefined {
  if (value === "image-edit") {
    return "image-edit";
  }
  return normalizeImageGenerateWorkflow(value);
}

function createGeneratedImageAlt(baseAlt: string, index: number, total: number): string {
  return total > 1 ? `${baseAlt} ${index + 1}/${total}` : baseAlt;
}

function recordUiDiagnostic(event: string, details: Record<string, unknown> = {}): void {
  void sendRuntimeMessage({
    type: "diagnostics.log.write",
    event,
    details,
  }).catch(() => undefined);
}

async function restoreConversationImagePreviews(): Promise<void> {
  const pendingImages: ConversationMessageImage[] = [];
  for (const message of state.messages) {
    for (const image of message.images ?? []) {
      if (!image.assetRef) {
        continue;
      }
      if (isSafeMessageImageUrl(image.src)) {
        image.status = "ready";
        continue;
      }
      image.src = "";
      image.status = "loading";
      pendingImages.push(image);
    }
  }

  if (pendingImages.length === 0) {
    return;
  }

  render();
  await Promise.allSettled(
    pendingImages.map(async (image) => {
      if (!image.assetRef) {
        return;
      }
      try {
        image.src = await resolvePreviewRefForUi(image.assetRef);
        image.status = "ready";
      } catch {
        image.src = "";
        image.status = "deleted";
      }
    }),
  );
  render();
}

function pushImageWorkflowAssistantMessage(
  assistantText: string | null | undefined,
  image: ConversationMessageImage | ConversationMessageImage[] | undefined,
): string {
  const text = assistantText?.trim() || "";
  const images = Array.isArray(image) ? image : image ? [image] : [];
  const id = `assistant-image-${Date.now()}`;
  state.messages.push({
    id,
    role: "assistant",
    text,
    ...(images.length ? { images } : {}),
  });
  return id;
}

function getPendingImageWorkflowMessage(clientRequestId: string): ConversationMessage | null {
  const messageId = pendingImageWorkflowMessageIdsByRequest.get(clientRequestId);
  if (!messageId) {
    return null;
  }
  return state.messages.find((message) => message.id === messageId) ?? null;
}

function pushPendingImageWorkflowMessage(clientRequestId: string, kind: ImageWorkflowPlaceholderKind): string {
  const existing = getPendingImageWorkflowMessage(clientRequestId);
  if (existing) {
    return existing.id;
  }
  const messageId = pushImageWorkflowAssistantMessage(
    createImageWorkflowPlaceholderText(kind),
    createLoadingConversationImage(createImageWorkflowPlaceholderAlt(kind)),
  );
  pendingImageWorkflowMessageIdsByRequest.set(clientRequestId, messageId);
  scheduleConversationPersist();
  return messageId;
}

function ensurePendingImageWorkflowMessage(clientRequestId: string | undefined, kind: ImageWorkflowPlaceholderKind): string | null {
  if (!clientRequestId) {
    return null;
  }
  return pushPendingImageWorkflowMessage(clientRequestId, kind);
}

function replacePendingImageWorkflowMessage(
  clientRequestId: string,
  assistantText: string | null | undefined,
  image: ConversationMessageImage | ConversationMessageImage[] | undefined,
): string {
  const existing = getPendingImageWorkflowMessage(clientRequestId);
  pendingImageWorkflowMessageIdsByRequest.delete(clientRequestId);
  streamedImagePreviewRefsByRequest.delete(clientRequestId);
  completedImageWorkflowMessageIdsByRequest.delete(clientRequestId);
  if (!existing) {
    return pushImageWorkflowAssistantMessage(assistantText, image);
  }

  const text =
    assistantText?.trim() ||
    (state.uiLocale === "ko" ? "이미지 편집 결과입니다." : "Here is the image edit preview.");
  existing.text = text;
  const images = Array.isArray(image) ? image : image ? [image] : [];
  if (images.length) {
    existing.images = images;
  } else {
    delete existing.images;
  }
  return existing.id;
}

function removePendingImageWorkflowMessage(clientRequestId: string): void {
  const messageId = pendingImageWorkflowMessageIdsByRequest.get(clientRequestId);
  streamedImagePreviewRefsByRequest.delete(clientRequestId);
  completedImageWorkflowMessageIdsByRequest.delete(clientRequestId);
  if (!messageId) {
    return;
  }
  pendingImageWorkflowMessageIdsByRequest.delete(clientRequestId);
  state.messages = state.messages.filter((message) => message.id !== messageId);
}

function consumeStreamedImagePreviewRefs(clientRequestId: string): string[] {
  const refs = streamedImagePreviewRefsByRequest.get(clientRequestId) ?? [];
  streamedImagePreviewRefsByRequest.delete(clientRequestId);
  return refs;
}

async function hydrateConversationImages(messageId: string, previewRefs: string[], baseAlt: string): Promise<void> {
  await Promise.allSettled(
    previewRefs.map((previewRef, index) =>
      hydrateConversationImage(messageId, previewRef, createGeneratedImageAlt(baseAlt, index, previewRefs.length)),
    ),
  );
}

async function hydrateConversationImage(messageId: string, previewRef: string, alt: string): Promise<void> {
  try {
    const image = await createConversationImageFromPreviewRef(previewRef, alt);
    upsertAssistantImageMessage(messageId, image);
    await refreshImageAssetFolderQuietly();
    scheduleConversationPersist();
    render();
    void rememberAutoSavedConversationImage(messageId, previewRef);
  } catch {
    upsertAssistantImageMessage(messageId, createFailedConversationImage(previewRef, alt));
    scheduleConversationPersist();
    render();
  }
}

async function startRealtimeVoiceSession(options: { reconnect?: boolean } = {}): Promise<void> {
  const strings = stringsForState();
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error(strings.errors.voiceUnsupported);
  }
  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognitionCtor) {
    throw new Error(strings.errors.voiceUnsupported);
  }

  if (!options.reconnect) {
    voiceReconnectAttempts = 0;
  }
  voiceStopRequested = false;
  cancelVoiceReconnect();
  stopComposerVoiceInput({ render: false });
  cleanupRealtimeVoiceResources();
  state.actionStatus = strings.status.voicePermissionRequest;
  render();

  try {
    const stream = await getMicrophoneStreamForVoice(options);
    state.actionStatus = strings.status.voiceConnecting;
    render();
    realtimeVoiceStream = stream;
    realtimeVoiceTransport = "websocket";
    resetRealtimeVoiceContextSnapshot();
    resetVoiceTranscriptMirrorState(voiceTranscriptMirror);
    ensureRealtimeOutputAudioContext();

    const result = await sendRuntimeMessageWithConfirmation<{
      status?: string;
      threadId?: string;
      sessionId?: string;
      transport?: RealtimeVoiceTransport;
      error?: string;
      cancelled?: boolean;
    }>({
      type: "voice.session.start",
      confirmed: true,
      outputModality: "audio",
      voice: state.settings.preferredVoice,
    });
    if (isCancelledResult(result)) {
      state.actionStatus = strings.status.voiceCancelled;
      cleanupRealtimeVoiceResources();
      return;
    }
    if (result.status === "error" || result.error) {
      throw new Error(result.error || strings.errors.voiceUpdate);
    }
    if (result.threadId) {
      realtimeVoiceThreadId = result.threadId;
    }
    realtimeVoiceTransport = result.transport ?? "websocket";
    if (browserVoiceFallbackActive) {
      return;
    }
    if (result.status === "active") {
      activateRealtimeVoiceSession({
        ...(result.threadId ? { threadId: result.threadId } : {}),
        transport: result.transport ?? realtimeVoiceTransport,
      });
      return;
    }
    await waitForRealtimeVoiceStarted(result.threadId);
  } catch (error) {
    const realtimeReason = state.initError || toErrorMessage(error);
    if (browserVoiceFallbackActive) {
      return;
    }
    cleanupRealtimeVoiceResources();
    if (!options.reconnect && startBrowserVoiceFallbackIfPossible(realtimeReason)) {
      return;
    }
    throw new Error(toUserFacingVoiceStartError(error));
  }
}

async function getMicrophoneStreamForVoice(options: { reconnect?: boolean } = {}): Promise<MediaStream> {
  if (!options.reconnect) {
    const permissionState = await readMicrophonePermissionState();
    if (permissionState === "denied") {
      throw new DOMException("Permission denied", "NotAllowedError");
    }
    if (permissionState === "prompt") {
      const strings = stringsForState();
      state.actionStatus = strings.status.voicePermissionWindow;
      render();
      const result = await openDedicatedMicrophonePermissionWindow();
      if (result.result !== "granted") {
        throw microphonePermissionResultToError(result.result, result.message);
      }

      state.actionStatus = strings.status.voicePermissionGranted;
      render();
    }
  }

  try {
    return await requestMicrophoneStream();
  } catch (error) {
    if (!shouldOpenDedicatedMicrophonePermissionWindow(error, options)) {
      throw error;
    }

    const strings = stringsForState();
    state.actionStatus = strings.status.voicePermissionWindow;
    render();
    const result = await openDedicatedMicrophonePermissionWindow();
    if (result.result !== "granted") {
      throw microphonePermissionResultToError(result.result, result.message);
    }

    state.actionStatus = strings.status.voicePermissionGranted;
    render();
    return requestMicrophoneStream();
  }
}

async function readMicrophonePermissionState(): Promise<PermissionState | "unknown"> {
  if (!navigator.permissions?.query) {
    return "unknown";
  }

  try {
    const status = await navigator.permissions.query({ name: "microphone" as PermissionName });
    return status.state;
  } catch {
    return "unknown";
  }
}

async function requestMicrophoneStream(): Promise<MediaStream> {
  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  });
}

async function openDedicatedMicrophonePermissionWindow(): Promise<{
  result: MicrophonePermissionWindowResult;
  message?: string;
}> {
  if (microphonePermissionWindowPromise) {
    return microphonePermissionWindowPromise;
  }

  const url = chrome.runtime.getURL(`mic-permission.html?locale=${encodeURIComponent(state.uiLocale)}`);
  let permissionWindowId: number | undefined;
  const promise = new Promise<{
    result: MicrophonePermissionWindowResult;
    message?: string;
  }>((resolve) => {
    let settled = false;
    const settle = (result: { result: MicrophonePermissionWindowResult; message?: string }) => {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(timeoutId);
      chrome.runtime.onMessage.removeListener(onMessage);
      chrome.windows?.onRemoved?.removeListener(onWindowRemoved);
      resolve(result);
    };
    const timeoutId = window.setTimeout(() => {
      settle({ result: "dismissed", message: "Permission dismissed" });
    }, 90_000);
    const onMessage = (message: unknown) => {
      if (!isMicrophonePermissionWindowMessage(message)) {
        return;
      }
      settle({
        result: message.result,
        ...(message.message ? { message: message.message } : {}),
      });
    };
    const onWindowRemoved = (windowId: number) => {
      if (permissionWindowId === windowId) {
        settle({ result: "dismissed", message: "Permission dismissed" });
      }
    };

    chrome.runtime.onMessage.addListener(onMessage);
    chrome.windows?.onRemoved?.addListener(onWindowRemoved);
    chrome.windows.create(
      {
        url,
        type: "popup",
        width: 420,
        height: 520,
        focused: true,
      },
      (createdWindow) => {
        const runtimeError = chrome.runtime.lastError;
        if (runtimeError) {
          settle({
            result: "dismissed",
            ...(runtimeError.message ? { message: runtimeError.message } : {}),
          });
          return;
        }
        permissionWindowId = createdWindow?.id;
      },
    );
  }).finally(() => {
    microphonePermissionWindowPromise = null;
  });
  microphonePermissionWindowPromise = promise;
  return promise;
}

function isMicrophonePermissionWindowMessage(message: unknown): message is {
  type: "voice.microphone.permission.result";
  result: MicrophonePermissionWindowResult;
  message?: string;
} {
  if (!message || typeof message !== "object") {
    return false;
  }
  const candidate = message as { type?: unknown; result?: unknown; message?: unknown };
  return (
    candidate.type === "voice.microphone.permission.result" &&
    (candidate.result === "granted" ||
      candidate.result === "dismissed" ||
      candidate.result === "denied" ||
      candidate.result === "unavailable" ||
      candidate.result === "unknown") &&
    (candidate.message === undefined || typeof candidate.message === "string")
  );
}

async function stopRealtimeVoiceSession(options: { notifyBridge: boolean }): Promise<void> {
  const threadId = realtimeVoiceThreadId;
  const wasVoiceActive = Boolean(
    state.voiceEnabled || realtimeVoicePeer || realtimeVoiceStream || pendingVoiceAnswer || realtimeVoiceTransport,
  );
  voiceStopRequested = true;
  cancelVoiceReconnect();
  cleanupRealtimeVoiceResources();
  state.voiceEnabled = false;
  state.liveCaption = "";
  state.actionStatus = stringsForState().status.voiceStopped;
  if (!options.notifyBridge || !wasVoiceActive) {
    render();
    return;
  }
  await chrome.runtime.sendMessage({
    type: "voice.session.stop",
    ...(threadId ? { threadId } : {}),
  });
  realtimeVoiceThreadId = null;
  render();
}

function cleanupRealtimeVoiceResources(): void {
  const activeRecognition = recognition;
  recognition = null;
  voiceRecognitionMode = null;
  state.voiceInputActive = false;
  cleanupComposerVoiceWaveform();
  resetComposerVoiceInputTranscript();
  if (activeRecognition) {
    activeRecognition.onend = null;
    activeRecognition.onresult = null;
    activeRecognition.stop();
  }
  browserVoiceFallbackActive = false;
  stopVoiceDurationTicker();
  cancelPendingVoiceStart();
  cancelPendingVoiceAnswer();
  realtimeVoiceStream?.getTracks().forEach((track) => track.stop());
  realtimeVoiceStream = null;
  realtimeVoicePeer?.close();
  realtimeVoicePeer = null;
  if (realtimeVoiceAudio) {
    realtimeVoiceAudio.pause();
    realtimeVoiceAudio.srcObject = null;
    realtimeVoiceAudio = null;
  }
  for (const source of realtimeOutputAudioSources) {
    try {
      source.stop();
    } catch {
      // The source may already have ended; cleanup must stay best-effort.
    }
  }
  realtimeOutputAudioSources.clear();
  if (realtimeOutputAudioContext) {
    void realtimeOutputAudioContext.close().catch(() => undefined);
    realtimeOutputAudioContext = null;
  }
  realtimeInputAudioWorkletNode?.port.close();
  realtimeInputAudioWorkletNode?.disconnect();
  realtimeInputAudioWorkletNode = null;
  realtimeInputAudioSource?.disconnect();
  realtimeInputAudioSource = null;
  if (realtimeInputAudioContext) {
    void realtimeInputAudioContext.close().catch(() => undefined);
    realtimeInputAudioContext = null;
  }
  realtimeInputAudioSamples = [];
  realtimeAudioSendChain = Promise.resolve();
  realtimeOutputAudioNextTime = 0;
  realtimeOutputSuppressedUntil = 0;
  realtimeBargeInHighRmsFrames = 0;
  liveVoiceRecognitionUtteranceStartedAt = null;
  realtimeVoiceThreadId = null;
  realtimeVoiceTransport = null;
  resetRealtimeVoiceContextSnapshot();
  resetVoiceTranscriptMirrorState(voiceTranscriptMirror);
}

function handleRealtimeVoiceDisconnect(reason: string | null, hadError: boolean): void {
  const wasActive = Boolean(
    state.voiceEnabled || realtimeVoicePeer || realtimeVoiceStream || pendingVoiceAnswer || realtimeVoiceTransport,
  );
  cleanupRealtimeVoiceResources();
  state.voiceEnabled = false;
  state.liveCaption = "";

  if (hadError && reason && !voiceStopRequested && startBrowserVoiceFallbackIfPossible(reason)) {
    voiceReconnectAttempts = 0;
    voiceStopRequested = false;
    return;
  }

  if (
    shouldAutoReconnectVoice({
      wasActive,
      requestedStop: voiceStopRequested,
      attemptCount: voiceReconnectAttempts,
      maxAttempts: MAX_VOICE_RECONNECT_ATTEMPTS,
      reason,
    })
  ) {
    scheduleRealtimeVoiceReconnect();
    return;
  }

  if (hadError && reason) {
    state.initError = reason;
  }
  state.actionStatus = stringsForState().status.voiceStopped;
  voiceReconnectAttempts = 0;
  voiceStopRequested = false;
}

function activateRealtimeVoiceSession(options: {
  threadId?: string;
  transport?: RealtimeVoiceTransport | null;
}): void {
  if (options.threadId) {
    realtimeVoiceThreadId = options.threadId;
  }
  if (options.transport) {
    realtimeVoiceTransport = options.transport;
  }
  state.voiceEnabled = true;
  startVoiceDurationTicker();
  state.liveCaption = "";
  state.actionStatus = stringsForState().status.voiceListening;
  if (realtimeVoiceStream) {
    void startRealtimeAudioInput(realtimeVoiceStream);
  }
  startVoiceRecognition("live");
}

function startVoiceDurationTicker(): void {
  if (voiceDurationTicker !== null) {
    return;
  }
  voiceDurationNow = Date.now();
  voiceDurationTicker = window.setInterval(() => {
    voiceDurationNow = Date.now();
    if (
      state.activeView === "chat" &&
      state.messages.some((message) => isActiveVoiceTranscriptMessage(voiceTranscriptMirror, message))
    ) {
      render();
    }
  }, 500);
}

function stopVoiceDurationTicker(): void {
  if (voiceDurationTicker === null) {
    return;
  }
  window.clearInterval(voiceDurationTicker);
  voiceDurationTicker = null;
}

function scheduleRealtimeVoiceReconnect(): void {
  cancelVoiceReconnect();
  voiceReconnectAttempts += 1;
  state.initError = "";
  state.actionStatus = stringsForState().status.voiceReconnecting(
    voiceReconnectAttempts,
    MAX_VOICE_RECONNECT_ATTEMPTS,
  );
  const delayMs = Math.min(1000 * 2 ** (voiceReconnectAttempts - 1), 4000);
  voiceReconnectTimer = window.setTimeout(() => {
    voiceReconnectTimer = null;
    void retryRealtimeVoiceSession();
  }, delayMs);
}

async function retryRealtimeVoiceSession(): Promise<void> {
  try {
    await startRealtimeVoiceSession({ reconnect: true });
    voiceReconnectAttempts = 0;
    render();
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    cleanupRealtimeVoiceResources();
    state.voiceEnabled = false;
    state.liveCaption = "";
    if (!voiceStopRequested && startBrowserVoiceFallbackIfPossible(reason)) {
      voiceReconnectAttempts = 0;
      voiceStopRequested = false;
      render();
      return;
    }
    if (
      shouldAutoReconnectVoice({
        wasActive: true,
        requestedStop: voiceStopRequested,
        attemptCount: voiceReconnectAttempts,
        maxAttempts: MAX_VOICE_RECONNECT_ATTEMPTS,
        reason,
      })
    ) {
      scheduleRealtimeVoiceReconnect();
    } else {
      state.initError = reason;
      state.actionStatus = stringsForState().status.voiceStopped;
      voiceReconnectAttempts = 0;
      voiceStopRequested = false;
    }
    render();
  }
}

function cancelVoiceReconnect(): void {
  if (voiceReconnectTimer === null) {
    return;
  }
  window.clearTimeout(voiceReconnectTimer);
  voiceReconnectTimer = null;
}

function waitForRealtimeVoiceStarted(threadId: string | undefined, timeoutMs = 15_000): Promise<void> {
  if (state.voiceEnabled && (!threadId || realtimeVoiceThreadId === threadId)) {
    return Promise.resolve();
  }

  cancelPendingVoiceStart();
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      if (!pendingVoiceStart) {
        return;
      }
      pendingVoiceStart = null;
      reject(new Error(stringsForState().errors.voiceUpdate));
    }, timeoutMs);
    pendingVoiceStart = {
      resolve,
      reject,
      timeoutId,
      ...(threadId ? { threadId } : {}),
    };
  });
}

function completeRealtimeVoiceStarted(threadId: string | undefined): void {
  if (!pendingVoiceStart) {
    return;
  }
  if (pendingVoiceStart.threadId && threadId && pendingVoiceStart.threadId !== threadId) {
    return;
  }
  const pending = pendingVoiceStart;
  pendingVoiceStart = null;
  window.clearTimeout(pending.timeoutId);
  pending.resolve();
}

function cancelPendingVoiceStart(): void {
  if (!pendingVoiceStart) {
    return;
  }
  const pending = pendingVoiceStart;
  pendingVoiceStart = null;
  window.clearTimeout(pending.timeoutId);
  pending.reject(new Error(stringsForState().errors.voiceUpdate));
}

function waitForRealtimeVoiceAnswer(timeoutMs = 10_000): Promise<string> {
  cancelPendingVoiceAnswer();
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      if (!pendingVoiceAnswer) {
        return;
      }
      pendingVoiceAnswer = null;
      reject(new Error(stringsForState().errors.voiceUpdate));
    }, timeoutMs);
    pendingVoiceAnswer = {
      resolve,
      reject,
      timeoutId,
    };
  });
}

function completeRealtimeVoiceHandshake(threadId: string | undefined, sdp: string): void {
  if (!pendingVoiceAnswer) {
    return;
  }
  if (pendingVoiceAnswer.threadId && threadId && pendingVoiceAnswer.threadId !== threadId) {
    return;
  }
  const pending = pendingVoiceAnswer;
  pendingVoiceAnswer = null;
  window.clearTimeout(pending.timeoutId);
  pending.resolve(sdp);
}

function cancelPendingVoiceAnswer(): void {
  if (!pendingVoiceAnswer) {
    return;
  }
  const pending = pendingVoiceAnswer;
  pendingVoiceAnswer = null;
  window.clearTimeout(pending.timeoutId);
  pending.reject(new Error(stringsForState().errors.voiceUpdate));
}

function interruptRealtimeVoiceOutput(): void {
  window.speechSynthesis?.cancel();
  realtimeBargeInHighRmsFrames = 0;
  if (realtimeOutputAudioSources.size) {
    suppressRealtimeOutputForBargeIn();
  }
  for (const source of realtimeOutputAudioSources) {
    try {
      source.stop();
    } catch {
      // Already-ended sources are removed by onended below.
    }
  }
  realtimeOutputAudioSources.clear();
  realtimeOutputAudioNextTime = realtimeOutputAudioContext?.currentTime ?? 0;
}

function suppressRealtimeOutputForBargeIn(): void {
  realtimeOutputSuppressedUntil = Date.now() + REALTIME_BARGE_IN_SUPPRESSION_MS;
}

function shouldSuppressRealtimeOutputAudio(): boolean {
  return Date.now() < realtimeOutputSuppressedUntil;
}

function maybeInterruptRealtimeOutputForInput(input: Float32Array): void {
  if (!realtimeOutputAudioSources.size || !input.length) {
    realtimeBargeInHighRmsFrames = 0;
    return;
  }

  let sum = 0;
  for (let index = 0; index < input.length; index += 1) {
    const sample = input[index] ?? 0;
    sum += sample * sample;
  }
  const rms = Math.sqrt(sum / input.length);
  if (rms >= REALTIME_BARGE_IN_RMS_THRESHOLD) {
    realtimeBargeInHighRmsFrames += 1;
  } else {
    realtimeBargeInHighRmsFrames = 0;
  }

  if (realtimeBargeInHighRmsFrames >= REALTIME_BARGE_IN_REQUIRED_AUDIO_FRAMES) {
    interruptRealtimeVoiceOutput();
  }
}

function ensureRealtimeOutputAudioContext(): AudioContext | null {
  if (realtimeOutputAudioContext) {
    void realtimeOutputAudioContext.resume().catch(() => undefined);
    return realtimeOutputAudioContext;
  }

  try {
    realtimeOutputAudioContext = new AudioContext();
    realtimeOutputAudioNextTime = realtimeOutputAudioContext.currentTime;
    void realtimeOutputAudioContext.resume().catch(() => undefined);
    return realtimeOutputAudioContext;
  } catch {
    return null;
  }
}

async function playRealtimeOutputAudio(audio: RealtimeOutputAudioChunk): Promise<void> {
  if (shouldSuppressRealtimeOutputAudio()) {
    return;
  }

  const data = typeof audio.data === "string" ? audio.data : "";
  if (!data) {
    return;
  }

  const context = ensureRealtimeOutputAudioContext();
  if (!context) {
    return;
  }

  const sampleRate =
    typeof audio.sampleRate === "number"
      ? audio.sampleRate
      : typeof audio.sample_rate === "number"
        ? audio.sample_rate
        : 24_000;
  const numChannels =
    typeof audio.numChannels === "number"
      ? audio.numChannels
      : typeof audio.num_channels === "number"
        ? audio.num_channels
        : 1;
  if (sampleRate <= 0 || numChannels <= 0) {
    return;
  }

  const bytes = Uint8Array.from(atob(data), (char) => char.charCodeAt(0));
  const samples = new Int16Array(bytes.buffer, bytes.byteOffset, Math.floor(bytes.byteLength / 2));
  const frameCount = Math.floor(samples.length / numChannels);
  if (!frameCount) {
    return;
  }

  const buffer = context.createBuffer(numChannels, frameCount, sampleRate);
  for (let frame = 0; frame < frameCount; frame += 1) {
    for (let channel = 0; channel < numChannels; channel += 1) {
      const sample = samples[frame * numChannels + channel] ?? 0;
      buffer.getChannelData(channel)[frame] = Math.max(-1, Math.min(1, sample / 32768));
    }
  }

  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  realtimeOutputAudioSources.add(source);
  source.onended = () => realtimeOutputAudioSources.delete(source);
  const startAt = Math.max(context.currentTime, realtimeOutputAudioNextTime);
  source.start(startAt);
  realtimeOutputAudioNextTime = startAt + buffer.duration;
}

async function startRealtimeAudioInput(stream: MediaStream): Promise<void> {
  if (!realtimeVoiceThreadId || realtimeInputAudioWorkletNode) {
    return;
  }

  try {
    realtimeInputAudioContext = new AudioContext();
    await realtimeInputAudioContext.audioWorklet.addModule(
      chrome.runtime.getURL("realtime-audio-input-worklet.js"),
    );
    realtimeInputAudioSource = realtimeInputAudioContext.createMediaStreamSource(stream);
    realtimeInputAudioWorkletNode = new AudioWorkletNode(
      realtimeInputAudioContext,
      "realtime-audio-input",
      {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
      },
    );
    realtimeInputAudioWorkletNode.port.onmessage = (event: MessageEvent) => {
      if (!state.voiceEnabled || realtimeVoiceTransport !== "websocket" || !realtimeVoiceThreadId) {
        return;
      }

      const input = coerceRealtimeAudioSamples(event.data);
      const sourceSampleRate = getRealtimeAudioInputSampleRate(event.data, realtimeInputAudioContext?.sampleRate ?? 48_000);
      if (!input.length) {
        return;
      }

      maybeInterruptRealtimeOutputForInput(input);
      for (let index = 0; index < input.length; index += 1) {
        realtimeInputAudioSamples.push(input[index] ?? 0);
      }

      const chunkSize = Math.max(
        1,
        Math.floor((sourceSampleRate * REALTIME_AUDIO_CHUNK_MS) / 1000),
      );
      while (realtimeInputAudioSamples.length >= chunkSize) {
        const samples = realtimeInputAudioSamples.splice(0, chunkSize);
        queueRealtimeAudioFrame(samples, sourceSampleRate);
      }
    };
    realtimeInputAudioSource.connect(realtimeInputAudioWorkletNode);
    realtimeInputAudioWorkletNode.connect(realtimeInputAudioContext.destination);
    void realtimeInputAudioContext.resume().catch(() => undefined);
  } catch (error) {
    handleRealtimeVoiceDisconnect(toUserFacingVoiceStartError(error), true);
  }
}

function coerceRealtimeAudioSamples(data: unknown): Float32Array {
  const samples = data && typeof data === "object" ? (data as { samples?: unknown }).samples : null;
  if (samples instanceof Float32Array) {
    return samples;
  }
  if (Array.isArray(samples)) {
    return new Float32Array(samples);
  }
  return new Float32Array();
}

function getRealtimeAudioInputSampleRate(data: unknown, fallback: number): number {
  const sampleRate = data && typeof data === "object" ? (data as { sampleRate?: unknown }).sampleRate : null;
  return typeof sampleRate === "number" && Number.isFinite(sampleRate) && sampleRate > 0 ? sampleRate : fallback;
}

function queueRealtimeAudioFrame(samples: number[], sourceSampleRate: number): void {
  const threadId = realtimeVoiceThreadId;
  if (!threadId || !samples.length) {
    return;
  }

  const targetSampleRate = 24_000;
  const resampled = resampleMonoPcm16(samples, sourceSampleRate, targetSampleRate);
  if (!resampled.length) {
    return;
  }
  const data = encodePcm16Base64(resampled);
  realtimeAudioSendChain = realtimeAudioSendChain
    .then(async () => {
      await chrome.runtime.sendMessage({
        type: "voice.session.append_audio",
        threadId,
        audio: {
          data,
          sampleRate: targetSampleRate,
          numChannels: 1,
          samplesPerChannel: resampled.length,
        },
      });
    })
    .catch((error) => {
      if (!voiceStopRequested && state.voiceEnabled) {
        handleRealtimeVoiceDisconnect(toUserFacingVoiceStartError(error), true);
        render();
      }
    });
}

function resampleMonoPcm16(samples: number[], sourceSampleRate: number, targetSampleRate: number): Int16Array {
  if (sourceSampleRate <= 0 || targetSampleRate <= 0 || !samples.length) {
    return new Int16Array();
  }

  const outputLength = Math.max(1, Math.floor((samples.length * targetSampleRate) / sourceSampleRate));
  const output = new Int16Array(outputLength);
  const ratio = sourceSampleRate / targetSampleRate;
  for (let index = 0; index < outputLength; index += 1) {
    const sourceIndex = index * ratio;
    const leftIndex = Math.floor(sourceIndex);
    const rightIndex = Math.min(leftIndex + 1, samples.length - 1);
    const fraction = sourceIndex - leftIndex;
    const left = samples[leftIndex] ?? 0;
    const right = samples[rightIndex] ?? left;
    const value = left + (right - left) * fraction;
    output[index] = Math.max(-32768, Math.min(32767, Math.round(value * 32767)));
  }
  return output;
}

function encodePcm16Base64(samples: Int16Array): string {
  const bytes = new Uint8Array(samples.buffer, samples.byteOffset, samples.byteLength);
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index] ?? 0);
  }
  return btoa(binary);
}

function waitForIceGatheringComplete(peer: RTCPeerConnection, timeoutMs: number): Promise<void> {
  if (peer.iceGatheringState === "complete") {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const cleanup = () => {
      window.clearTimeout(timeoutId);
      peer.removeEventListener("icegatheringstatechange", handleChange);
      resolve();
    };
    const handleChange = () => {
      if (peer.iceGatheringState === "complete") {
        cleanup();
      }
    };
    const timeoutId = window.setTimeout(cleanup, timeoutMs);
    peer.addEventListener("icegatheringstatechange", handleChange);
  });
}

async function startComposerVoiceInput(): Promise<void> {
  const strings = stringsForState();
  if (state.voiceEnabled || state.pendingAction === "voice") {
    return;
  }
  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognitionCtor) {
    state.initError = strings.errors.voiceUnsupported;
    render();
    return;
  }

  state.initError = "";
  state.actionStatus = "";
  resetComposerVoiceInputTranscript();
  render();

  try {
    const stream = await getMicrophoneStreamForVoice();
    state.voiceInputActive = true;
    state.actionStatus = "";
    startComposerVoiceWaveform(stream);
    startVoiceRecognition("composer");
    render();
  } catch (error) {
    state.voiceInputActive = false;
    state.actionStatus = "";
    resetComposerVoiceInputTranscript();
    cleanupComposerVoiceWaveform();
    state.initError = toUserFacingVoiceStartError(error);
    render();
  }
}

function stopComposerVoiceInput(options: { render?: boolean } = {}): void {
  if (voiceRecognitionMode === "composer" && recognition) {
    const activeRecognition = recognition;
    recognition = null;
    voiceRecognitionMode = null;
    activeRecognition.onend = null;
    activeRecognition.onresult = null;
    activeRecognition.stop();
  }
  state.voiceInputActive = false;
  cleanupComposerVoiceWaveform();
  if (state.actionStatus.startsWith(stringsForState().status.voiceInputListening)) {
    state.actionStatus = "";
  }
  if (options.render !== false) {
    render();
  }
}

async function commitComposerVoiceInput(): Promise<void> {
  if (composerVoiceInputCommitPromise) {
    return composerVoiceInputCommitPromise;
  }

  composerVoiceInputCommitPromise = (async () => {
    const optimisticTranscript = getComposerVoiceInputTranscript();
    await finalizeComposerVoiceInputForCommit();
    const transcript = getComposerVoiceInputTranscript() || optimisticTranscript;
    resetComposerVoiceInputTranscript();
    if (transcript) {
      appendVoiceInputTranscriptToComposer(transcript);
      return;
    }
    render();
  })().finally(() => {
    composerVoiceInputCommitPromise = null;
  });

  return composerVoiceInputCommitPromise;
}

function cancelComposerVoiceInput(): void {
  stopComposerVoiceInput({ render: false });
  resetComposerVoiceInputTranscript();
  render();
}

function finalizeComposerVoiceInputForCommit(): Promise<void> {
  if (!(voiceRecognitionMode === "composer" && recognition)) {
    state.voiceInputActive = false;
    cleanupComposerVoiceWaveform();
    if (state.actionStatus.startsWith(stringsForState().status.voiceInputListening)) {
      state.actionStatus = "";
    }
    return Promise.resolve();
  }

  const activeRecognition = recognition;
  recognition = null;
  voiceRecognitionMode = null;
  state.voiceInputActive = false;

  return new Promise((resolve) => {
    let settled = false;
    const timeoutId = window.setTimeout(finish, COMPOSER_VOICE_STOP_FINALIZATION_TIMEOUT_MS);

    function finish(): void {
      if (settled) {
        return;
      }
      settled = true;
      window.clearTimeout(timeoutId);
      activeRecognition.onend = null;
      activeRecognition.onresult = null;
      cleanupComposerVoiceWaveform();
      if (state.actionStatus.startsWith(stringsForState().status.voiceInputListening)) {
        state.actionStatus = "";
      }
      resolve();
    }

    activeRecognition.onend = finish;
    try {
      activeRecognition.stop();
    } catch {
      finish();
    }
  });
}

function appendVoiceInputTranscriptToComposer(transcript: string): void {
  const text = transcript.trim();
  if (!text) {
    return;
  }
  const current = state.composerDraft.trimEnd();
  state.composerDraft = `${current}${current ? " " : ""}${text}`;
  state.mentionQuery = extractMentionQuery(state.composerDraft);
  state.slashQuery = extractSlashQuery(state.composerDraft);
  render();
  window.setTimeout(() => focusComposerAtEnd(), 0);
}

function resetComposerVoiceInputTranscript(): void {
  composerVoiceInputFinalTranscript = "";
  composerVoiceInputInterimTranscript = "";
}

function appendComposerVoiceInputFinalTranscript(transcript: string): void {
  const text = transcript.trim();
  if (!text) {
    return;
  }
  const current = composerVoiceInputFinalTranscript.trimEnd();
  composerVoiceInputFinalTranscript = `${current}${current ? " " : ""}${text}`;
  composerVoiceInputInterimTranscript = "";
}

function updateComposerVoiceInputInterimTranscript(transcript: string): void {
  composerVoiceInputInterimTranscript = transcript.trim();
}

function getComposerVoiceInputTranscript(): string {
  return [composerVoiceInputFinalTranscript, composerVoiceInputInterimTranscript]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ")
    .trim();
}

function createSilentComposerVoiceWaveform(): number[] {
  return Array.from({ length: COMPOSER_VOICE_WAVEFORM_BAR_COUNT }, (_, index) => {
    const centerDistance = Math.abs(index - (COMPOSER_VOICE_WAVEFORM_BAR_COUNT - 1) / 2);
    return 0.08 + Math.max(0, 0.08 - centerDistance * 0.002);
  });
}

function startComposerVoiceWaveform(stream: MediaStream): void {
  cleanupComposerVoiceWaveform();
  composerVoiceInputStream = stream;
  composerVoiceInputWaveformLevels = createSilentComposerVoiceWaveform();

  try {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    composerVoiceInputAudioContext = new AudioContextCtor();
    composerVoiceInputAudioSource = composerVoiceInputAudioContext.createMediaStreamSource(stream);
    composerVoiceInputAnalyser = composerVoiceInputAudioContext.createAnalyser();
    composerVoiceInputAnalyser.fftSize = 512;
    composerVoiceInputAnalyser.smoothingTimeConstant = 0.72;
    composerVoiceInputAudioSource.connect(composerVoiceInputAnalyser);
    composerVoiceInputAudioData = new Uint8Array(composerVoiceInputAnalyser.frequencyBinCount);
    composerVoiceInputWaveformTimer = window.setInterval(
      updateComposerVoiceWaveform,
      COMPOSER_VOICE_WAVEFORM_REFRESH_MS,
    );
    updateComposerVoiceWaveform();
  } catch {
    composerVoiceInputWaveformTimer = window.setInterval(() => {
      composerVoiceInputWaveformLevels = createAnimatedFallbackVoiceWaveform(Date.now());
      paintComposerVoiceWaveform();
    }, COMPOSER_VOICE_WAVEFORM_REFRESH_MS);
  }
}

function updateComposerVoiceWaveform(): void {
  const analyser = composerVoiceInputAnalyser;
  const audioData = composerVoiceInputAudioData;
  if (!analyser || !audioData) {
    return;
  }
  analyser.getByteTimeDomainData(audioData);
  const bucketSize = Math.max(1, Math.floor(audioData.length / COMPOSER_VOICE_WAVEFORM_BAR_COUNT));
  composerVoiceInputWaveformLevels = Array.from({ length: COMPOSER_VOICE_WAVEFORM_BAR_COUNT }, (_, index) => {
    const start = index * bucketSize;
    const end = Math.min(audioData.length, start + bucketSize);
    let peak = 0;
    for (let sampleIndex = start; sampleIndex < end; sampleIndex += 1) {
      const sample = audioData[sampleIndex] ?? 128;
      peak = Math.max(peak, Math.abs(sample - 128) / 128);
    }
    const eased = Math.min(1, 0.1 + peak * 4.2);
    const previous = composerVoiceInputWaveformLevels[index] ?? 0.08;
    return Math.max(0.06, previous * 0.46 + eased * 0.54);
  });
  paintComposerVoiceWaveform();
}

function paintComposerVoiceWaveform(): void {
  const bars = root.querySelectorAll<HTMLSpanElement>(".composer-waveform-bar");
  if (!bars.length) {
    return;
  }

  bars.forEach((bar, index) => {
    const normalized = Math.max(0.06, Math.min(1, composerVoiceInputWaveformLevels[index] ?? 0.08));
    bar.style.setProperty("--bar-level", normalized.toFixed(3));
  });
}

function createAnimatedFallbackVoiceWaveform(now: number): number[] {
  return Array.from({ length: COMPOSER_VOICE_WAVEFORM_BAR_COUNT }, (_, index) => {
    const wave = Math.sin(now / 170 + index * 0.58);
    const cluster = Math.max(0.18, Math.sin(now / 520 + index * 0.2) * 0.5 + 0.5);
    return Math.max(0.06, Math.min(0.78, 0.1 + Math.abs(wave) * 0.55 * cluster));
  });
}

function cleanupComposerVoiceWaveform(): void {
  if (composerVoiceInputWaveformTimer !== null) {
    window.clearInterval(composerVoiceInputWaveformTimer);
    composerVoiceInputWaveformTimer = null;
  }
  composerVoiceInputAudioSource?.disconnect();
  composerVoiceInputAudioSource = null;
  composerVoiceInputAnalyser?.disconnect();
  composerVoiceInputAnalyser = null;
  if (composerVoiceInputAudioContext) {
    void composerVoiceInputAudioContext.close().catch(() => undefined);
    composerVoiceInputAudioContext = null;
  }
  composerVoiceInputStream?.getTracks().forEach((track) => track.stop());
  composerVoiceInputStream = null;
  composerVoiceInputAudioData = null;
  composerVoiceInputWaveformLevels = createSilentComposerVoiceWaveform();
}

function startVoiceRecognition(mode: VoiceRecognitionMode): void {
  if (recognition) {
    if (voiceRecognitionMode === mode) {
      return;
    }
    const activeRecognition = recognition;
    recognition = null;
    voiceRecognitionMode = null;
    activeRecognition.onend = null;
    activeRecognition.onresult = null;
    activeRecognition.stop();
  }
  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognitionCtor) {
    if (mode === "composer") {
      state.voiceInputActive = false;
    }
    render();
    return;
  }

  recognition = new SpeechRecognitionCtor();
  voiceRecognitionMode = mode;
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.onresult = (event: { results: ArrayLike<SpeechRecognitionResult> }) => {
    let interim = "";

    for (const result of Array.from(event.results)) {
      const transcript = result[0]?.transcript?.trim();
      if (!transcript) {
        continue;
      }
      const resultAt = Date.now();
      if (mode === "live" && liveVoiceRecognitionUtteranceStartedAt === null) {
        liveVoiceRecognitionUtteranceStartedAt = resultAt;
      }

      if (result.isFinal) {
        if (mode === "composer") {
          appendComposerVoiceInputFinalTranscript(transcript);
        } else {
          const startedAt = liveVoiceRecognitionUtteranceStartedAt ?? resultAt;
          liveVoiceRecognitionUtteranceStartedAt = null;
          state.liveCaption = transcript;
          render();
          void handleVoiceTranscript(transcript, { startedAt, endedAt: resultAt });
        }
      } else {
        interim = transcript;
      }
    }

    if (interim) {
      if (mode === "composer") {
        updateComposerVoiceInputInterimTranscript(interim);
      } else {
        state.liveCaption = interim;
        render();
      }
    }
  };
  recognition.onend = () => {
    if (mode === "live" && state.voiceEnabled) {
      try {
        recognition?.start();
      } catch {
        recognition = null;
        voiceRecognitionMode = null;
        state.voiceEnabled = false;
        state.actionStatus = stringsForState().status.voiceStopped;
        render();
      }
      return;
    }
    if (mode === "composer" && state.voiceInputActive) {
      try {
        recognition?.start();
        return;
      } catch {
        // Fall through to cleanup when the browser refuses to resume recognition.
      }
    }
    if (mode === "composer") {
      recognition = null;
      voiceRecognitionMode = null;
      state.voiceInputActive = false;
      cleanupComposerVoiceWaveform();
      if (state.actionStatus.startsWith(stringsForState().status.voiceInputListening)) {
        state.actionStatus = "";
      }
      render();
    }
  };
  try {
    recognition.start();
  } catch {
    recognition = null;
    voiceRecognitionMode = null;
    state.initError = stringsForState().errors.voiceUpdate;
    if (mode === "live") {
      state.voiceEnabled = false;
      state.actionStatus = stringsForState().status.voiceStopped;
    } else {
      state.voiceInputActive = false;
      state.actionStatus = "";
      cleanupComposerVoiceWaveform();
    }
    render();
  }
}

function startBrowserVoiceFallbackIfPossible(reason: string): boolean {
  if (!isRealtimeVoiceBackendUnavailable(reason)) {
    return false;
  }

  const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognitionCtor) {
    return false;
  }

  void chrome.runtime
    .sendMessage({
      type: "diagnostics.log.write",
      event: "voice.browser_fallback.started",
      details: { reason },
    })
    .catch(() => undefined);
  state.initError = "";
  state.voiceEnabled = true;
  startVoiceDurationTicker();
  browserVoiceFallbackActive = true;
  state.liveCaption = "";
  state.actionStatus = stringsForState().status.voiceFallbackListening;
  startVoiceRecognition("live");
  return true;
}

function isRealtimeVoiceBackendUnavailable(reason: string): boolean {
  return /does not support realtime conversation|codex\/realtime\/calls|unexpected status (?:403|404|501|503)|http error: (?:403|404|501|503)|realtime.*not available|not found/iu.test(
    reason,
  );
}

async function appendRealtimeVoiceTextWithCurrentContext(
  transcript: string,
  options: { includeTranscript: boolean },
): Promise<void> {
  const threadId = realtimeVoiceThreadId;
  if (!threadId) {
    return;
  }

  const contextPrompt = await collectRealtimeVoiceContextSnapshot().catch(() => "");
  const text = createRealtimeVoiceContextAppendText({
    transcript,
    contextPrompt,
    includeTranscript: options.includeTranscript,
  });
  if (!text.trim()) {
    return;
  }

  await chrome.runtime.sendMessage({
    type: "voice.session.append_text",
    threadId,
    text,
  });
}

async function collectRealtimeVoiceContextSnapshot(): Promise<string> {
  const now = Date.now();
  if (
    realtimeVoiceContextSnapshotPrompt &&
    now - realtimeVoiceContextSnapshotCapturedAt < REALTIME_VOICE_CONTEXT_SNAPSHOT_TTL_MS
  ) {
    return realtimeVoiceContextSnapshotPrompt;
  }

  if (realtimeVoiceContextSnapshotPromise) {
    return realtimeVoiceContextSnapshotPromise;
  }

  realtimeVoiceContextSnapshotPromise = (async () => {
    const result = await sendRuntimeMessageWithConfirmation<{ prompt?: string }>({
      type: "voice.context.snapshot",
    });
    if (isCancelledResult(result)) {
      return "";
    }
    const prompt = typeof result.prompt === "string" ? result.prompt : "";
    realtimeVoiceContextSnapshotPrompt = prompt;
    realtimeVoiceContextSnapshotCapturedAt = Date.now();
    return prompt;
  })().finally(() => {
    realtimeVoiceContextSnapshotPromise = null;
  });

  return realtimeVoiceContextSnapshotPromise;
}

function resetRealtimeVoiceContextSnapshot(): void {
  realtimeVoiceContextSnapshotPromise = null;
  realtimeVoiceContextSnapshotPrompt = "";
  realtimeVoiceContextSnapshotCapturedAt = 0;
}

async function handleVoiceTranscript(
  transcript: string,
  timing: { startedAt?: number; endedAt?: number } = {},
): Promise<void> {
  const strings = getUiStrings(state.uiLocale);
  if (
    shouldInterruptVoiceOutputForTranscript({
      transcript,
      isFinal: true,
      hasQueuedOutput: realtimeOutputAudioSources.size > 0,
    })
  ) {
    interruptRealtimeVoiceOutput();
  }

  if (state.voiceEnabled && realtimeVoiceTransport === "websocket" && realtimeVoiceThreadId) {
    mirrorLocalLiveUserTranscript(transcript, timing);
    state.liveCaption = `${state.uiLocale === "ko" ? "나" : "You"}: ${transcript}`;
    render();
    await appendRealtimeVoiceTextWithCurrentContext(transcript, {
      includeTranscript: !realtimeInputAudioWorkletNode,
    });
    return;
  }

  if (state.settings.allowVoiceNavigation) {
    const command = parseVoiceNavigationCommand(transcript);
    if (command) {
      const result = await sendRuntimeMessageWithConfirmation<{ matched?: boolean; cancelled?: boolean }>({
        type: "page.navigate",
        command,
      });
      if (isCancelledResult(result)) {
        return;
      }
      state.liveCaption = result?.matched === false ? strings.status.noMatchFor(transcript) : transcript;
      render();
      return;
    }
  }

  await sendPrompt(transcript);
}

function mirrorLocalLiveUserTranscript(transcript: string, timing: { startedAt?: number; endedAt?: number } = {}): void {
  if (!state.settings.liveCaptions) {
    return;
  }
  const mirrored = applyVoiceTranscriptDone({
    messages: state.messages,
    mirror: voiceTranscriptMirror,
    role: "user",
    text: transcript,
    threadId: realtimeVoiceThreadId ?? undefined,
    now: timing.endedAt ?? Date.now(),
    ...(typeof timing.startedAt === "number" ? { startedAt: timing.startedAt } : {}),
    createId: () => createVoiceTranscriptMessageId("user"),
  });
  state.liveCaption = mirrored.liveCaption;
  scheduleConversationPersist();
}

function shouldMirrorRealtimeTranscriptEvent(role: string | undefined): boolean {
  return !(role === "user" && voiceRecognitionMode === "live");
}

function speak(text: string): void {
  if (!("speechSynthesis" in window) || !text.trim()) {
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 1.05;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}

async function compactCurrentConversation(): Promise<void> {
  const strings = stringsForState();
  if (!state.threadId || isCurrentTurnActive()) {
    state.actionStatus = strings.status.compactSkipped;
    render();
    return;
  }

  const clientRequestId = `compact-${Date.now()}`;
  state.promptActivity = {
    clientRequestId,
    phase: "compacting",
  };
  state.actionStatus = strings.status.compactStarted;
  render();

  try {
    const result = await sendRuntimeMessage<{
      threadId?: string;
      status?: "started" | "completed";
      skipped?: boolean;
      error?: string;
    }>({
      type: "conversation.compact",
      waitForCompletion: true,
    });
    if (result.error) {
      throw new Error(result.error);
    }
    if (result.skipped) {
      state.actionStatus = strings.status.compactSkipped;
    } else {
      state.threadId = result.threadId ?? state.threadId;
      state.actionStatus = strings.status.compactCompleted;
    }
  } catch (error) {
    state.initError = toUserFacingRuntimeError(error);
  } finally {
    if (state.promptActivity?.clientRequestId === clientRequestId) {
      state.promptActivity = null;
    }
    render();
  }
}

async function startNewChat(): Promise<void> {
  const activeProfileId = ensureComposerProfileSelection();
  const result = await sendRuntimeMessage<{ conversation: SavedConversation | null }>({
    type: "conversation.new",
    profileId: activeProfileId,
    model: state.selectedModel,
  });
  hydrateConversation(result.conversation);
  state.messages = [];
  state.attachments = new Set();
  state.fileAttachments = [];
  state.selectedTabIds = [];
  state.historyQuery = "";
  state.currentReadStrategy = "auto";
  state.structuredInputs = [];
  state.activeTurn = null;
  state.activeView = "chat";
  state.latestPlan = null;
  state.latestDiff = null;
  state.latestReroute = null;
  state.pendingProfileQuestion = null;
  profileQuestionStreamBuffers.clear();
  completedTurnIds.clear();
  render();
}

function scheduleConversationPersist(): void {
  void persistConversationBatch.schedule();
}

async function persistConversation(): Promise<void> {
  const activeProfileId = ensureComposerProfileSelection();
  if (!state.currentConversationId) {
    const created = await sendRuntimeMessage<{ conversation: SavedConversation }>({
      type: "conversation.new",
      profileId: activeProfileId,
      model: state.selectedModel,
    });
    state.currentConversationId = created.conversation.id;
  }

  const result = await sendRuntimeMessage<{ conversation: SavedConversation }>({
    type: "conversation.save",
    conversation: {
      id: state.currentConversationId,
      title: "",
      profileId: activeProfileId,
      model: state.selectedModel || undefined,
      threadId: state.threadId || undefined,
      messages: serializeConversationMessagesForStorage(state.messages),
      attachments: [],
      structuredInputs: [],
      selectedTabIds: [],
      historyQuery: "",
      readStrategyOverride: "auto",
      updatedAt: Date.now(),
    },
  });
  state.currentConversationId = result.conversation.id;
  state.recentChats = upsertRecentChat(state.recentChats, {
    id: result.conversation.id,
    title: result.conversation.title,
    profileId: result.conversation.profileId,
    updatedAt: result.conversation.updatedAt,
  });
}

function upsertRecentChat(conversations: ConversationSummary[], summary: ConversationSummary): ConversationSummary[] {
  return [summary, ...conversations.filter((item) => item.id !== summary.id)]
    .sort((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, 12);
}

function formatTimestamp(value: number): string {
  return new Intl.DateTimeFormat(state.uiLocale === "ko" ? "ko-KR" : "en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

async function sendRuntimeMessageWithConfirmation<TResult>(
  message: Record<string, unknown>,
): Promise<TResult | { cancelled: true }> {
  const permissionsGranted = await ensureMessagePermissions(message);
  if (!permissionsGranted) {
    return { cancelled: true };
  }

  let nextMessage: Record<string, unknown> = { ...message };
  let response = (await sendRuntimeMessage(nextMessage)) as Record<string, unknown>;

  for (let retryCount = 0; retryCount < 3; retryCount += 1) {
    if (response?.requiresConfirmation && typeof response.confirmationOperation === "string") {
      const approved = await requestNativeConfirmation(
        getHarnessConfirmationPrompt(response.confirmationOperation, response.error),
      );
      if (!approved) {
        return { cancelled: true };
      }

      if (nextMessage.payload && typeof nextMessage.payload === "object") {
        const payload = nextMessage.payload as PromptRequestPayload & {
          confirmedOperations?: string[];
        };
        const confirmedOperations = new Set(payload.confirmedOperations ?? []);
        confirmedOperations.add(String(response.confirmationOperation));
        nextMessage = {
          ...nextMessage,
          payload: {
            ...payload,
            confirmedOperations: Array.from(confirmedOperations),
          },
        };
      } else {
        nextMessage = {
          ...nextMessage,
          confirmed: true,
        };
      }

      response = (await sendRuntimeMessage(nextMessage)) as Record<string, unknown>;
      continue;
    }

    const permissionPlan = getPermissionRequestForRuntimeResponse(response);
    if (permissionPlan) {
      state.actionStatus = shouldShowPermissionStatusBanner(permissionPlan)
        ? toUserFacingPermissionRationale(permissionPlan.rationale)
        : "";
      render();
      const granted = await requestPermissionPlan(permissionPlan, { showPendingPromptOnFailure: true });
      if (!granted) {
        const rationale = toUserFacingPermissionRationale(permissionPlan.rationale);
        state.initError = rationale;
        return { cancelled: true };
      }
      response = (await sendRuntimeMessage(nextMessage, { retries: 0 })) as Record<string, unknown>;
      continue;
    }

    break;
  }

  if (response?.error && !("threadId" in response) && !("items" in response) && !("tabs" in response) && !("ok" in response)) {
    throw new Error(String(response.error));
  }

  return response as TResult;
}

function getHarnessConfirmationPrompt(operation: string, fallback: unknown): string {
  const strings = getUiStrings(state.uiLocale);
  switch (operation) {
    case "context.history.read":
      return strings.permissions.history;
    case "context.tabs.read":
      return strings.permissions.openTabs;
    case "page.navigate":
    case "page.dom.perform":
    case "page.image.overlay":
      return strings.permissions.currentPageAction;
    case "voice.session.start":
      return state.uiLocale === "ko"
        ? "Codex realtime 음성 세션을 시작하도록 허용할까요?"
        : "Allow Codex to start a realtime voice session?";
    case "image.edit":
      return state.uiLocale === "ko"
        ? "Codex가 이미지 편집 작업을 실행하도록 허용할까요?"
        : "Allow Codex to run this image editing task?";
    default:
      return String(fallback ?? strings.prompts.allowAction);
  }
}

async function sendRuntimeMessage<TResult = unknown>(
  message: Record<string, unknown>,
  options: {
    retries?: number;
  } = {},
): Promise<TResult> {
  const retries = options.retries ?? 1;
  let attempt = 0;

  while (true) {
    try {
      return (await chrome.runtime.sendMessage(message)) as TResult;
    } catch (error) {
      if (attempt < retries && isRetryableRuntimeMessageError(error)) {
        attempt += 1;
        await delay(120);
        continue;
      }
      throw new Error(toUserFacingRuntimeError(error));
    }
  }
}

function toUserFacingRuntimeError(error: unknown, fallback?: string): string {
  const strings = getUiStrings(state.uiLocale);
  switch (classifyRuntimeMessageError(error)) {
    case "transient-disconnect":
      return strings.errors.runtimeDisconnected;
    case "host-access":
      return strings.errors.pageAccess;
    default: {
      const message = toErrorMessage(error).trim();
      return message || fallback || strings.errors.init;
    }
  }
}

function toUserFacingVoiceStartError(error: unknown): string {
  const strings = getUiStrings(state.uiLocale);
  switch (classifyMicrophonePermissionError(error)) {
    case "dismissed":
      return strings.errors.voicePermissionDismissed;
    case "denied":
      return strings.errors.voicePermissionDenied;
    case "unavailable":
      return strings.errors.voiceMicrophoneUnavailable;
    default:
      return toUserFacingRuntimeError(error, strings.errors.voiceUpdate);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function isCancelledResult(value: unknown): value is { cancelled: true } {
  return Boolean(value && typeof value === "object" && "cancelled" in value && value.cancelled === true);
}

function isAttachmentUnavailableOnThisPage(
  attachment: PromptRequestPayload["attachments"][number],
): boolean {
  return !state.currentPageSupport.available && isCurrentPageAttachment(attachment);
}

function sanitizeUnavailableCurrentPageState(): void {
  const nextAttachments = sanitizeUnavailableCurrentPageAttachments(
    Array.from(state.attachments),
    state.currentPageSupport,
  );
  state.attachments = new Set(nextAttachments);
}

async function ensureMessagePermissions(message: Record<string, unknown>): Promise<boolean> {
  const activeTabUrl = await getActiveTabUrl();
  const plan = getPermissionRequestForMessage(message, activeTabUrl);
  if (!plan) {
    return true;
  }

  if (plan.blockedReason) {
    state.initError = plan.blockedReason;
    state.actionStatus = "";
    render();
    return false;
  }

  const request: chrome.permissions.Permissions = {
    ...(plan.permissions?.length ? { permissions: plan.permissions } : {}),
    ...(plan.origins?.length ? { origins: plan.origins } : {}),
  };
  state.actionStatus = shouldShowPermissionStatusBanner(plan)
    ? toUserFacingPermissionRationale(plan.rationale)
    : "";
  render();
  const granted = await requestPermissionPlan({ ...plan, ...request }, { showPendingPromptOnFailure: true });
  if (!granted) {
    const rationale = toUserFacingPermissionRationale(plan.rationale);
    state.initError = rationale;
  }
  return granted;
}

async function requestPermissionPlan(
  plan: {
    permissions?: chrome.runtime.ManifestPermission[];
    origins?: string[];
    rationale: string;
  },
  options: { showPendingPromptOnFailure?: boolean } = {},
): Promise<boolean> {
  const request: chrome.permissions.Permissions = {
    ...(plan.permissions?.length ? { permissions: plan.permissions } : {}),
    ...(plan.origins?.length ? { origins: plan.origins } : {}),
  };
  const alreadyGranted = await chrome.permissions.contains(request);
  if (alreadyGranted) {
    state.pendingPermission = null;
    return true;
  }
  const result = await requestOptionalPermissionsWithResult(request);
  if (result.granted) {
    state.pendingPermission = null;
    return true;
  }
  if (options.showPendingPromptOnFailure) {
    const retryMessage = state.pendingPermission?.retryMessage;
    state.pendingPermission = {
      plan,
      errorMessage: result.errorMessage,
      ...(retryMessage ? { retryMessage } : {}),
    };
    state.actionStatus = "";
    render();
  }
  return false;
}

async function getActiveTabUrl(): Promise<string | undefined> {
  const query = targetWindowId
    ? { active: true, windowId: targetWindowId }
    : { active: true, currentWindow: true };
  const [tab] = await chrome.tabs.query(query);
  return tab?.url;
}

function toUserFacingPermissionRationale(rationale: string): string {
  const strings = getUiStrings(state.uiLocale);
  if (state.uiLocale !== "ko") {
    return rationale || strings.permissions.generic;
  }

  if (rationale === UI_STRINGS.en.permissions.currentSite) {
    return strings.permissions.currentSite;
  }
  if (rationale === UI_STRINGS.en.permissions.currentSiteAndTabs) {
    return strings.permissions.currentSiteAndTabs;
  }
  if (rationale === UI_STRINGS.en.permissions.openTabs) {
    return strings.permissions.openTabs;
  }
  if (rationale === UI_STRINGS.en.permissions.history) {
    return strings.permissions.history;
  }
  if (rationale === UI_STRINGS.en.permissions.currentPageAction) {
    return strings.permissions.currentPageAction;
  }
  if (rationale === UI_STRINGS.en.permissions.siteCapture) {
    return strings.permissions.siteCapture;
  }
  if (rationale === UI_STRINGS.en.permissions.siteRead) {
    return strings.permissions.siteRead;
  }

  return rationale || strings.permissions.generic;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replaceAll('"', "&quot;");
}
