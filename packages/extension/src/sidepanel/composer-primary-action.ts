export type ComposerPrimaryAction = "send" | "start-live" | "stop-live" | "stop-turn";

export interface ComposerPrimaryActionInput {
  composerDraft: string;
  currentWorkActive: boolean;
  liveActive: boolean;
}

export function resolveComposerPrimaryAction(input: ComposerPrimaryActionInput): ComposerPrimaryAction {
  if (input.currentWorkActive) {
    return "stop-turn";
  }

  if (input.liveActive) {
    return "stop-live";
  }

  return input.composerDraft.trim() ? "send" : "start-live";
}
