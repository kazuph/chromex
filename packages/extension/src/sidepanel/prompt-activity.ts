import { getTranslatedUiLocale, type UiLocale } from "./i18n.js";

export type PromptActivityPhase =
  | "preparing"
  | "collecting-context"
  | "routing"
  | "compacting"
  | "reconnecting"
  | "waiting-for-codex"
  | "responding"
  | "preparing-image"
  | "editing-image"
  | "rendering-image-preview"
  | "applying-image-preview";

export interface PromptActivityState {
  clientRequestId: string;
  phase: PromptActivityPhase;
  retryAttempt?: number;
  retryMax?: number;
  retryReason?: string;
}

export interface PromptActivityStep {
  id: PromptActivityPhase;
  label: string;
  state: "done" | "active" | "pending";
}

type CopyPackLocale = "en" | "ko";

const LABELS: Record<CopyPackLocale, Record<PromptActivityPhase, string>> = {
  en: {
    preparing: "Preparing request",
    "collecting-context": "Reading page context",
    routing: "Choosing context and workflow",
    compacting: "Compacting conversation",
    reconnecting: "Reconnecting...",
    "waiting-for-codex": "Sending into Codex workspace",
    responding: "Streaming response",
    "preparing-image": "Preparing image target",
    "editing-image": "Editing image with Codex",
    "rendering-image-preview": "Rendering preview",
    "applying-image-preview": "Applying page preview",
  },
  ko: {
    preparing: "요청 준비 중",
    "collecting-context": "페이지 컨텍스트 읽는 중",
    routing: "질문에 맞게 라우팅 중",
    compacting: "대화 기록 압축 중",
    reconnecting: "다시 연결 중...",
    "waiting-for-codex": "Codex 작업공간에 전달 중",
    responding: "응답을 스트리밍 중",
    "preparing-image": "이미지 대상 준비 중",
    "editing-image": "이미지를 편집하는 중",
    "rendering-image-preview": "미리보기 렌더링 중",
    "applying-image-preview": "페이지 미리보기 적용 중",
  },
};

const DETAILS: Record<CopyPackLocale, Record<PromptActivityPhase, string>> = {
  en: {
    preparing: "Normalizing your message and pending attachments.",
    routing: "Planning which context, files, images, and tools are needed.",
    compacting: "Codex app-server is compacting the thread before continuing.",
    reconnecting: "The response stream failed or disconnected. Codex is retrying automatically.",
    "collecting-context": "Reading the visible page with the selected DOM/vision strategy.",
    "waiting-for-codex": "Packaging the request, context, and attachments for the local Codex bridge.",
    responding: "Rendering streamed text and tool output as it arrives.",
    "preparing-image": "Selecting the page image or uploaded image and writing a temporary local edit input.",
    "editing-image": "Codex is running the image edit. Image generation can take longer than text responses.",
    "rendering-image-preview": "Loading the generated file into a safe side-panel preview.",
    "applying-image-preview": "Applying a temporary non-destructive overlay to the current page when allowed.",
  },
  ko: {
    preparing: "메시지와 첨부 상태를 정리하고 있습니다.",
    routing: "필요한 페이지, 이미지, 파일, 도구 흐름을 계획하고 있습니다.",
    compacting: "계속 진행하기 전에 Codex app-server가 스레드를 압축하고 있습니다.",
    reconnecting: "응답 스트림이 실패했거나 연결이 끊겼습니다. Codex가 자동으로 다시 시도합니다.",
    "collecting-context": "선택된 DOM/비전 전략으로 현재 화면을 읽고 있습니다.",
    "waiting-for-codex": "요청, 컨텍스트, 첨부 파일을 로컬 Codex 브리지로 안전하게 넘기고 있습니다.",
    responding: "도착하는 텍스트와 도구 결과를 실시간으로 표시하고 있습니다.",
    "preparing-image": "페이지 이미지 또는 업로드 이미지를 선택하고 임시 편집 입력을 준비하고 있습니다.",
    "editing-image": "Codex가 이미지 편집을 실행 중입니다. 이미지 생성은 일반 텍스트보다 오래 걸릴 수 있습니다.",
    "rendering-image-preview": "생성된 이미지를 안전한 사이드 패널 미리보기로 불러오고 있습니다.",
    "applying-image-preview": "허용된 경우 현재 페이지 위에 임시 미리보기를 비파괴적으로 적용하고 있습니다.",
  },
};

const STEP_ORDER: PromptActivityPhase[] = [
  "preparing",
  "routing",
  "compacting",
  "collecting-context",
  "waiting-for-codex",
  "responding",
];

const IMAGE_STEP_ORDER: PromptActivityPhase[] = [
  "preparing-image",
  "editing-image",
  "rendering-image-preview",
  "applying-image-preview",
];

const STEP_LABELS: Record<CopyPackLocale, Record<PromptActivityPhase, string>> = {
  en: {
    preparing: "Prepare",
    routing: "Plan",
    compacting: "Compact",
    reconnecting: "Reconnect",
    "collecting-context": "Read",
    "waiting-for-codex": "Send",
    responding: "Stream",
    "preparing-image": "Target",
    "editing-image": "Edit",
    "rendering-image-preview": "Preview",
    "applying-image-preview": "Apply",
  },
  ko: {
    preparing: "준비",
    routing: "계획",
    compacting: "압축",
    reconnecting: "재연결",
    "collecting-context": "읽기",
    "waiting-for-codex": "전달",
    responding: "응답",
    "preparing-image": "대상",
    "editing-image": "편집",
    "rendering-image-preview": "미리보기",
    "applying-image-preview": "적용",
  },
};

export function getPromptActivityLabel(phase: PromptActivityPhase, locale: UiLocale): string {
  return LABELS[getCopyPackLocale(locale)][phase];
}

export function formatPromptActivityLabel(activity: PromptActivityState, locale: UiLocale): string {
  if (
    activity.phase === "reconnecting" &&
    typeof activity.retryAttempt === "number" &&
    typeof activity.retryMax === "number"
  ) {
    const attempt = Math.max(1, Math.floor(activity.retryAttempt));
    const max = Math.max(attempt, Math.floor(activity.retryMax));
    return `${LABELS[getCopyPackLocale(locale)].reconnecting} ${attempt}/${max}`;
  }
  return getPromptActivityLabel(activity.phase, locale);
}

export function getPromptActivityDetail(phase: PromptActivityPhase, locale: UiLocale): string {
  return DETAILS[getCopyPackLocale(locale)][phase];
}

export function getPromptActivitySteps(phase: PromptActivityPhase, locale: UiLocale): PromptActivityStep[] {
  const translatedLocale = getCopyPackLocale(locale);
  if (phase === "reconnecting") {
    return [
      {
        id: "reconnecting",
        label: STEP_LABELS[translatedLocale].reconnecting,
        state: "active",
      },
    ];
  }
  const order = IMAGE_STEP_ORDER.includes(phase) ? IMAGE_STEP_ORDER : STEP_ORDER;
  const activeIndex = Math.max(order.indexOf(phase), 0);
  return order.map((id, index) => ({
    id,
    label: STEP_LABELS[translatedLocale][id],
    state: index < activeIndex ? "done" : index === activeIndex ? "active" : "pending",
  }));
}

function getCopyPackLocale(locale: UiLocale): CopyPackLocale {
  return getTranslatedUiLocale(locale) === "ko" ? "ko" : "en";
}
