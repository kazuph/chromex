import type { CodexActiveTurn } from "@codex-sidepanel/shared";

export interface TurnSteerRoutingInput {
  draft: string;
  resetThread?: boolean;
  threadId: string | undefined;
  activeTurn: CodexActiveTurn | null;
}

export function shouldSendComposerAsTurnSteer(input: TurnSteerRoutingInput): boolean {
  if (input.resetThread || !input.draft.trim() || !input.threadId || !input.activeTurn?.turnId) {
    return false;
  }

  return input.activeTurn.threadId === input.threadId;
}
