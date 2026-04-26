export interface YouTubeCurrentMomentPromptInput {
  adapterPayload: Record<string, unknown> | null | undefined;
  locale?: string;
}

export interface YouTubeCurrentMomentPromptResult {
  prompt: string;
  title: string;
  channel: string;
  currentTimeSeconds: number;
  timestamp: string;
}

const CURRENT_MOMENT_ACTION_IDS = new Set([
  "youtube-current-moment-question",
  "summarize-current-timestamp",
]);

export function isYouTubeCurrentMomentAction(actionId: string): boolean {
  return CURRENT_MOMENT_ACTION_IDS.has(actionId);
}

export function createYouTubeCurrentMomentPromptResult(
  input: YouTubeCurrentMomentPromptInput,
): YouTubeCurrentMomentPromptResult {
  const adapterPayload = input.adapterPayload;
  if (!isYouTubeAdapterPayload(adapterPayload)) {
    throw new Error("현재 활성 탭의 YouTube 재생 정보를 읽지 못했습니다.");
  }

  const title = getString(adapterPayload.title) || (isKoreanLocale(input.locale) ? "이 영상" : "this video");
  const channel = getString(adapterPayload.channel);
  const currentTimeSeconds = getFiniteNumber(adapterPayload.currentTimeSeconds) ?? 0;
  const timestamp = formatYouTubeMomentTimestamp(currentTimeSeconds);

  return {
    prompt: createYouTubeCurrentMomentPrompt(input),
    title,
    channel,
    currentTimeSeconds,
    timestamp,
  };
}

export function createYouTubeCurrentMomentPrompt(
  input: YouTubeCurrentMomentPromptInput,
): string {
  const adapterPayload = input.adapterPayload ?? {};
  const ko = isKoreanLocale(input.locale);
  const title = getString(adapterPayload.title) || (ko ? "이 영상" : "this video");
  const channel = getString(adapterPayload.channel);
  const currentTimeSeconds = getFiniteNumber(adapterPayload.currentTimeSeconds) ?? 0;
  const timestamp = formatYouTubeMomentTimestamp(currentTimeSeconds);
  const channelLabel = channel ? (ko ? ` (${channel})` : ` by ${channel}`) : "";

  return ko
    ? `현재 재생 위치 ${timestamp}(${currentTimeSeconds}초)를 기준으로 이 유튜브 영상 "${title}"${channelLabel}에서 어떤 장면/내용인지 설명해줘. 사용자가 실제로 보고 있는 현재 시간대와 앞뒤 맥락을 우선해서 한국어로 알려줘.`
    : `Explain what is happening at the current playback position ${timestamp} (${currentTimeSeconds} seconds) in the YouTube video "${title}"${channelLabel}. Prioritize the exact moment the user is watching and include brief surrounding context.`;
}

export function formatYouTubeMomentTimestamp(value: number): string {
  const seconds = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
}

function isYouTubeAdapterPayload(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && getString((value as Record<string, unknown>).platform) === "youtube");
}

function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getFiniteNumber(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function isKoreanLocale(locale: string | undefined): boolean {
  return locale?.toLowerCase().startsWith("ko") ?? false;
}
