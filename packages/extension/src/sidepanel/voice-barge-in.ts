const FILLER_TRANSCRIPTS = new Set([
  "um",
  "uh",
  "mhm",
  "mm",
  "hmm",
  "음",
  "어",
  "아",
  "응",
  "음음",
]);

export function shouldInterruptVoiceOutputForTranscript(input: {
  transcript: string;
  isFinal: boolean;
  hasQueuedOutput: boolean;
}): boolean {
  if (!input.hasQueuedOutput || !input.isFinal) {
    return false;
  }

  const normalized = normalizeTranscript(input.transcript);
  if (!normalized || FILLER_TRANSCRIPTS.has(normalized.toLowerCase())) {
    return false;
  }

  const compact = normalized.replace(/\s+/g, "");
  if (compact.length < 2) {
    return false;
  }

  return true;
}

function normalizeTranscript(value: string): string {
  return value
    .replace(/[.,!?;:()[\]{}"“”‘’…]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
