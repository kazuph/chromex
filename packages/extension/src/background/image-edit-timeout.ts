export const IMAGE_EDIT_TIMEOUT_MS = 20 * 60 * 1000;

export function buildImageEditTimeoutMessage(localizedMessage?: string): string {
  return (
    localizedMessage?.trim() ||
    "Image editing timed out after 20 minutes. Image generation may be unavailable on free accounts; check your Codex login, image generation access, and network connection, then try again."
  );
}
