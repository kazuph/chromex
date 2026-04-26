import {
  classifyMicrophonePermissionError,
  type MicrophonePermissionWindowResult,
} from "../sidepanel/voice-permissions.js";

const query = new URLSearchParams(window.location.search);
const locale = query.get("locale") === "ko" || navigator.language.toLowerCase().startsWith("ko") ? "ko" : "en";

const STRINGS = {
  en: {
    eyebrow: "Codex Live Voice",
    title: "Allow microphone access",
    copy: "Chrome needs microphone access before Codex can start a live voice conversation.",
    button: "Allow microphone",
    idle: "Click the button, then choose Allow in the Chrome permission prompt.",
    requesting: "Waiting for Chrome microphone permission…",
    granted: "Microphone access is ready. Returning to Codex…",
    denied: "Microphone access is blocked. Allow this extension in Chrome microphone settings, then try again.",
    dismissed: "The permission prompt was closed. Click the button again and choose Allow.",
    unavailable: "No usable microphone was found.",
    error: "Could not request microphone access.",
  },
  ko: {
    eyebrow: "Codex 라이브 음성",
    title: "마이크 접근 허용",
    copy: "Codex가 라이브 음성 대화를 시작하려면 Chrome 마이크 권한이 필요합니다.",
    button: "마이크 허용",
    idle: "버튼을 누른 뒤 Chrome 권한 팝업에서 허용을 선택해 주세요.",
    requesting: "Chrome 마이크 권한을 기다리는 중입니다…",
    granted: "마이크 권한이 준비되었습니다. Codex로 돌아갑니다…",
    denied: "마이크 접근이 차단되어 있습니다. Chrome 마이크 설정에서 이 확장 프로그램을 허용한 뒤 다시 시도해 주세요.",
    dismissed: "권한 팝업이 닫혔습니다. 버튼을 다시 누르고 허용을 선택해 주세요.",
    unavailable: "사용 가능한 마이크를 찾지 못했습니다.",
    error: "마이크 권한을 요청하지 못했습니다.",
  },
} as const;

const strings = STRINGS[locale];
document.documentElement.lang = locale;

document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((element) => {
  const key = element.dataset.i18n as keyof typeof strings | undefined;
  if (key && key in strings) {
    element.textContent = strings[key];
  }
});

const button = document.querySelector<HTMLButtonElement>("#allow-microphone");
const status = document.querySelector<HTMLElement>("#microphone-status");

button?.addEventListener("click", () => {
  void requestMicrophone();
});

async function requestMicrophone(): Promise<void> {
  if (!button || !status) {
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    await reportPermissionResult("unavailable", strings.unavailable);
    status.textContent = strings.unavailable;
    return;
  }

  button.disabled = true;
  status.textContent = strings.requesting;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    for (const track of stream.getTracks()) {
      track.stop();
    }
    await reportPermissionResult("granted");
    status.textContent = strings.granted;
    window.setTimeout(() => window.close(), 700);
  } catch (error) {
    const kind = classifyMicrophonePermissionError(error);
    const result: MicrophonePermissionWindowResult = kind === "unknown" ? "dismissed" : kind;
    await reportPermissionResult(result, getErrorMessage(error));
    status.textContent = strings[result] || strings.error;
    button.disabled = false;
  }
}

async function reportPermissionResult(result: MicrophonePermissionWindowResult, message?: string): Promise<void> {
  await chrome.runtime
    .sendMessage({
      type: "voice.microphone.permission.result",
      result,
      ...(message ? { message } : {}),
    })
    .catch(() => undefined);
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error || error instanceof DOMException) {
    return error.message;
  }
  return String(error ?? "");
}
