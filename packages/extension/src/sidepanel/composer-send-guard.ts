export interface ComposerSendState {
  turnActive: boolean;
  promptActivityActive: boolean;
  streamingAssistantActive: boolean;
}

export function canSendComposerMessage(state: ComposerSendState): boolean {
  return !state.turnActive && !state.promptActivityActive && !state.streamingAssistantActive;
}
