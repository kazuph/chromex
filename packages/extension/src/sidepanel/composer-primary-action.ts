export type ComposerPrimaryAction = "send" | "start-live" | "stop-live" | "stop-turn";

export interface ComposerPrimaryActionInput {
  composerDraft: string;
  currentWorkActive: boolean;
  liveActive: boolean;
}

export interface ComposerPrimaryActionDraftInput {
  previousComposerDraft: string;
  nextComposerDraft: string;
  currentWorkActive: boolean;
  liveActive: boolean;
  compositionInProgress?: boolean;
}

export function resolveComposerPrimaryAction(input: ComposerPrimaryActionInput): ComposerPrimaryAction {
  if (input.composerDraft.trim()) {
    return "send";
  }

  if (input.currentWorkActive) {
    return "stop-turn";
  }

  if (input.liveActive) {
    return "stop-live";
  }

  return "start-live";
}

export function didComposerPrimaryActionChangeForDraftInput(input: ComposerPrimaryActionDraftInput): boolean {
  if (input.compositionInProgress) {
    return false;
  }

  const previousAction = resolveComposerPrimaryAction({
    composerDraft: input.previousComposerDraft,
    currentWorkActive: input.currentWorkActive,
    liveActive: input.liveActive,
  });
  const nextAction = resolveComposerPrimaryAction({
    composerDraft: input.nextComposerDraft,
    currentWorkActive: input.currentWorkActive,
    liveActive: input.liveActive,
  });
  return previousAction !== nextAction;
}
