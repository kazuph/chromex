export const IMAGE_EDIT_TIMEOUT_MS = 20 * 60 * 1000;

export function buildImageEditTimeoutMessage(): string {
  return [
    "Image editing timed out after 20 minutes.",
    "Codex 이미지 편집 응답이 20분 동안 완료되지 않아 중단했습니다.",
    "Codex 로그인, 이미지 생성 가능 여부, 네트워크 상태를 확인한 뒤 다시 시도해 주세요.",
  ].join(" ");
}
