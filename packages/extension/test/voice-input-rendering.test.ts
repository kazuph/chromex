import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, test } from "vitest";

const sidepanelSource = readFileSync(resolve(process.cwd(), "src/sidepanel/index.ts"), "utf8");
const normalizedSidepanelSource = sidepanelSource.replace(/\r\n/g, "\n");

function extractFunctionBody(name: string): string {
  const start = sidepanelSource.indexOf(`function ${name}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const braceStart = sidepanelSource.indexOf("{", start);
  expect(braceStart).toBeGreaterThanOrEqual(0);
  let depth = 0;
  for (let index = braceStart; index < sidepanelSource.length; index += 1) {
    const char = sidepanelSource[index];
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return sidepanelSource.slice(braceStart + 1, index);
      }
    }
  }
  throw new Error(`Unable to extract ${name}`);
}

describe("voice input and live action rendering", () => {
  test("separates dictation from live mode controls", () => {
    expect(sidepanelSource).toContain('id="voice-input-toggle"');
    expect(sidepanelSource).toContain('"live-toggle"');
    expect(sidepanelSource).toContain("function bindComposerPrimaryActionButton");
    expect(sidepanelSource).toContain("function toggleRealtimeVoiceFromComposer");
    expect(sidepanelSource).toContain('resolveComposerPrimaryAction');
    expect(sidepanelSource).toContain("didComposerPrimaryActionChangeForDraftInput");
    expect(sidepanelSource).toContain('renderUiIcon("audio-lines")');
    expect(sidepanelSource).not.toContain('id="voice-toggle"');
  });

  test("updates live/send action swaps without re-rendering the composer", () => {
    expect(sidepanelSource).toContain("function syncComposerPrimaryActionButton");
    expect(normalizedSidepanelSource).not.toContain(`if (primaryActionChanged) {
      renderSync();
      return;
    }`);
    expect(normalizedSidepanelSource).toContain(`if (primaryActionChanged) {
      syncComposerPrimaryActionButton();
    }`);
  });

  test("reuses composer autosize style metrics while the textarea DOM is stable", () => {
    const resizeBody = extractFunctionBody("resizeComposerTextarea");
    const firstRenderSyncIndex = sidepanelSource.indexOf("renderSync();");
    const metricsCacheIndex = sidepanelSource.indexOf("const composerTextareaAutosizeMetricsByElement");

    expect(sidepanelSource).toContain("composerTextareaAutosizeMetricsByElement");
    expect(sidepanelSource).toContain("function getComposerTextareaAutosizeMetrics");
    expect(metricsCacheIndex).toBeGreaterThanOrEqual(0);
    expect(firstRenderSyncIndex).toBeGreaterThanOrEqual(0);
    expect(metricsCacheIndex).toBeLessThan(firstRenderSyncIndex);
    expect(resizeBody).toContain("getComposerTextareaAutosizeMetrics(target)");
    expect(resizeBody).not.toContain("getComputedStyle(target)");
  });

  test("composer dictation updates the draft instead of sending prompts", () => {
    const dictationBody = extractFunctionBody("appendVoiceInputTranscriptToComposer");
    expect(dictationBody).toContain("state.composerDraft");
    expect(dictationBody).toContain("render()");
    expect(dictationBody).not.toContain("sendPrompt");
    expect(dictationBody).not.toContain("handleVoiceTranscript");
  });

  test("dictation uses a waveform confirmation panel before inserting transcript", () => {
    expect(sidepanelSource).toContain("renderComposerDictationPanel");
    expect(sidepanelSource).toContain("composer-dictation-waveform");
    expect(sidepanelSource).toContain('id="voice-dictation-cancel"');
    expect(sidepanelSource).toContain('id="voice-dictation-confirm"');
    expect(sidepanelSource).toContain("commitComposerVoiceInput");
    expect(sidepanelSource).toContain("cancelComposerVoiceInput");
    expect(sidepanelSource).toContain("startComposerVoiceWaveform");
  });

  test("dictation waveform paints bars without re-rendering the side panel", () => {
    const waveformBody = extractFunctionBody("updateComposerVoiceWaveform");
    expect(waveformBody).toContain("paintComposerVoiceWaveform()");
    expect(waveformBody).not.toContain("render()");
  });

  test("dictation confirmation waits for the final recognition result before committing", () => {
    const commitBody = extractFunctionBody("commitComposerVoiceInput");
    expect(commitBody).toContain("optimisticTranscript");
    expect(commitBody).toContain("await finalizeComposerVoiceInputForCommit()");
    expect(commitBody).toContain("appendVoiceInputTranscriptToComposer(transcript)");
    expect(sidepanelSource).toContain("COMPOSER_VOICE_STOP_FINALIZATION_TIMEOUT_MS");
    expect(sidepanelSource).toContain("activeRecognition.onresult = null");
  });
});
