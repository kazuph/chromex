export interface OnlineImagePromptExtractionInput {
  alt?: string;
  pageTitle?: string;
  pageUrl?: string;
  responseLanguage?: string;
}

export function createOnlineImagePromptExtractionPrompt(input: OnlineImagePromptExtractionInput = {}): string {
  const responseLanguage = normalizeResponseLanguage(input.responseLanguage);
  const contextLines = [
    input.alt?.trim() ? `- 이미지 설명/alt: ${input.alt.trim()}` : "",
    input.pageTitle?.trim() ? `- 페이지 제목: ${input.pageTitle.trim()}` : "",
    input.pageUrl?.trim() ? `- 페이지 URL: ${input.pageUrl.trim()}` : "",
  ].filter(Boolean);

  const context = contextLines.length ? `\n\n참고 맥락:\n${contextLines.join("\n")}` : "";
  return [
    "첨부한 온라인 이미지를 분석해서, 이 이미지를 다시 생성하거나 비슷한 결과를 만들 수 있는 이미지 생성 프롬프트를 역추출해줘.",
    "구도, 피사체, 스타일, 조명, 색감, 카메라/렌즈 느낌, 질감, 배경, 텍스트 유무, 후처리 분위기를 구체적으로 포함해줘.",
    `응답은 ${responseLanguage}로 작성해줘.`,
    "마지막에는 바로 복사해서 쓸 수 있는 최종 이미지 생성 프롬프트를 코드블럭 안에 따로 제공해줘.",
  ].join("\n") + context;
}

function normalizeResponseLanguage(value: string | undefined): string {
  const language = value?.trim().toLowerCase() ?? "";
  if (language.startsWith("ko")) {
    return "한국어";
  }
  if (language.startsWith("ja")) {
    return "일본어";
  }
  if (language.startsWith("zh")) {
    return "중국어";
  }
  return "English";
}
