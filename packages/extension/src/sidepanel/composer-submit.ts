export interface ComposerSubmitKeyInput {
  key: string;
  shiftKey: boolean;
  isComposing: boolean;
  keyCode?: number | undefined;
  compositionInProgress: boolean;
  dropdownOpen?: boolean | undefined;
}

export function shouldSubmitComposerOnKeydown(input: ComposerSubmitKeyInput): boolean {
  if (!isPlainComposerEnter(input)) {
    return false;
  }

  if (input.dropdownOpen) {
    return false;
  }

  return true;
}

export function shouldInterceptComposerDropdownOnEnter(input: ComposerSubmitKeyInput): boolean {
  return Boolean(input.dropdownOpen) && isPlainComposerEnter(input);
}

function isPlainComposerEnter(input: ComposerSubmitKeyInput): boolean {
  if (input.key !== "Enter") {
    return false;
  }

  if (input.shiftKey) {
    return false;
  }

  if (input.isComposing || input.compositionInProgress || input.keyCode === 229) {
    return false;
  }

  return true;
}
