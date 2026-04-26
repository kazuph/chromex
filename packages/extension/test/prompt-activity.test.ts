import { describe, expect, test } from "vitest";

import {
  formatPromptActivityLabel,
  getPromptActivityDetail,
  getPromptActivityLabel,
  getPromptActivitySteps,
} from "../src/sidepanel/prompt-activity.js";

describe("prompt activity labels", () => {
  test("renders Korean progress labels for context and response phases", () => {
    expect(getPromptActivityLabel("collecting-context", "ko")).toBe("페이지 컨텍스트 읽는 중");
    expect(getPromptActivityLabel("responding", "ko")).toBe("응답을 스트리밍 중");
  });

  test("provides dynamic detail copy while Codex receives the request", () => {
    expect(getPromptActivityLabel("waiting-for-codex", "ko")).toBe("Codex 작업공간에 전달 중");
    expect(getPromptActivityDetail("waiting-for-codex", "ko")).toContain("요청, 컨텍스트, 첨부 파일");
    expect(getPromptActivityLabel("compacting", "ko")).toBe("대화 기록 압축 중");
  });

  test("marks progress steps up to the active phase", () => {
    expect(getPromptActivitySteps("waiting-for-codex", "en")).toEqual([
      { id: "preparing", label: "Prepare", state: "done" },
      { id: "routing", label: "Plan", state: "done" },
      { id: "compacting", label: "Compact", state: "done" },
      { id: "collecting-context", label: "Read", state: "done" },
      { id: "waiting-for-codex", label: "Send", state: "active" },
      { id: "responding", label: "Stream", state: "pending" },
    ]);
  });

  test("renders image-edit specific progress instead of a generic Codex handoff loop", () => {
    expect(getPromptActivityLabel("editing-image", "ko")).toBe("이미지를 편집하는 중");
    expect(getPromptActivityDetail("editing-image", "ko")).toContain("이미지 생성은 일반 텍스트보다 오래 걸릴 수 있습니다");
    expect(getPromptActivitySteps("rendering-image-preview", "ko")).toEqual([
      { id: "preparing-image", label: "대상", state: "done" },
      { id: "editing-image", label: "편집", state: "done" },
      { id: "rendering-image-preview", label: "미리보기", state: "active" },
      { id: "applying-image-preview", label: "적용", state: "pending" },
    ]);
  });

  test("renders reconnect retry count as the primary activity label", () => {
    expect(
      formatPromptActivityLabel(
        {
          clientRequestId: "prompt-retry-1",
          phase: "reconnecting",
          retryAttempt: 3,
          retryMax: 5,
        },
        "en",
      ),
    ).toBe("Reconnecting... 3/5");
    expect(getPromptActivityDetail("reconnecting", "ko")).toContain("자동으로 다시 시도");
  });
});
