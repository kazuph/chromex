import type { ActionCard, ActionCardInput } from "./types.js";

const MAX_ACTION_CARDS = 6;

const ACTION_CARD_LIBRARY: Record<string, ActionCard> = {
  "summarize-video": {
    id: "summarize-video",
    title: "Summarize Video",
    description: "Create a concise summary for the whole video.",
    kind: "workflow",
  },
  "summarize-current-timestamp": {
    id: "summarize-current-timestamp",
    title: "Summarize This Moment",
    description: "Explain the currently visible or playing moment.",
    kind: "workflow",
  },
  "draft-blog-post": {
    id: "draft-blog-post",
    title: "Draft Blog Post",
    description: "Turn the current page or video into a publishable draft.",
    kind: "workflow",
  },
  "summarize-page": {
    id: "summarize-page",
    title: "Summarize Page",
    description: "Summarize the current page with attached context.",
    kind: "workflow",
  },
};

export function inferActionCards(input: ActionCardInput): ActionCard[] {
  const cards: ActionCard[] = [];
  const seen = new Set<string>();

  const pushCard = (card: ActionCard) => {
    if (seen.has(card.id)) {
      return;
    }

    seen.add(card.id);
    cards.push(card);
  };

  const push = (id: string) => {
    const card = ACTION_CARD_LIBRARY[id];
    if (!card) {
      return;
    }

    pushCard(card);
  };

  if (input.readStrategy === "adapter") {
    for (const card of createAdapterSuggestedQuestions(input)) {
      pushCard(card);
    }
    for (const action of input.adapterActions) {
      push(action);
    }
  } else {
    push("summarize-page");
  }

  return cards.slice(0, MAX_ACTION_CARDS);
}

function createAdapterSuggestedQuestions(input: ActionCardInput): ActionCard[] {
  const platform = getString(input.adapterPayload?.platform);
  switch (platform) {
    case "youtube":
      return createYouTubeSuggestedQuestions(input.adapterPayload ?? {}, input.locale);
    case "gmail":
      return createGmailSuggestedQuestions(input.adapterPayload ?? {}, input.locale);
    case "korean-mail":
      return createKoreanMailSuggestedQuestions(input.adapterPayload ?? {}, input.locale);
    case "google-docs":
      return createDocsSuggestedQuestions(input.adapterPayload ?? {}, input.locale);
    case "google-sheets":
      return createSheetsSuggestedQuestions(input.adapterPayload ?? {}, input.locale);
    case "google-slides":
      return createSlidesSuggestedQuestions(input.adapterPayload ?? {}, input.locale);
    case "google-drive":
      return createDriveSuggestedQuestions(input.adapterPayload ?? {}, input.locale);
    case "google-meet":
      return createMeetSuggestedQuestions(input.adapterPayload ?? {}, input.locale);
    case "google-chat":
    case "slack":
      return createTeamChatSuggestedQuestions(input.adapterPayload ?? {}, input.locale, platform);
    case "teams":
      return createTeamsSuggestedQuestions(input.adapterPayload ?? {}, input.locale);
    case "google-calendar":
      return createCalendarSuggestedQuestions(input.adapterPayload ?? {}, input.locale);
    case "github":
      return createGitHubSuggestedQuestions(input.adapterPayload ?? {}, input.locale);
    case "notion":
      return createNotionSuggestedQuestions(input.adapterPayload ?? {}, input.locale);
    case "kakaowork":
    case "naver-works":
      return createKoreanTeamChatSuggestedQuestions(input.adapterPayload ?? {}, input.locale, platform);
    case "flow":
    case "asana":
    case "clickup":
      return createProjectTaskSuggestedQuestions(input.adapterPayload ?? {}, input.locale, platform);
    case "jira":
      return createJiraSuggestedQuestions(input.adapterPayload ?? {}, input.locale);
    case "trello":
      return createKanbanSuggestedQuestions(input.adapterPayload ?? {}, input.locale);
    case "evernote":
    case "onenote":
      return createNotesSuggestedQuestions(input.adapterPayload ?? {}, input.locale, platform);
    case "google-keep":
    case "samsung-notes":
      return createQuickNotesSuggestedQuestions(input.adapterPayload ?? {}, input.locale, platform);
    case "korean-writing":
      return createKoreanWritingSuggestedQuestions(input.adapterPayload ?? {}, input.locale);
    case "korean-work":
      return createKoreanWorkSuggestedQuestions(input.adapterPayload ?? {}, input.locale);
    case "korean-community":
      return createKoreanCommunitySuggestedQuestions(input.adapterPayload ?? {}, input.locale);
    case "korean-hiring":
      return createKoreanHiringSuggestedQuestions(input.adapterPayload ?? {}, input.locale);
    case "figma":
      return createFigmaSuggestedQuestions(input.adapterPayload ?? {}, input.locale);
    case "shopping":
      return createShoppingSuggestedQuestions(input.adapterPayload ?? {}, input.locale);
    case "travel":
      return createTravelSuggestedQuestions(input.adapterPayload ?? {}, input.locale);
    case "news":
      return createNewsSuggestedQuestions(input.adapterPayload ?? {}, input.locale);
    case "arxiv":
      return createArxivSuggestedQuestions(input.adapterPayload ?? {}, input.locale);
    case "pdf-document":
      return createPdfSuggestedQuestions(input.adapterPayload ?? {}, input.locale);
    case "research":
      return createResearchSuggestedQuestions(input.adapterPayload ?? {}, input.locale);
    default:
      return [];
  }
}

function createYouTubeSuggestedQuestions(payload: Record<string, unknown>, locale: string | undefined): ActionCard[] {
  const ko = locale?.toLowerCase().startsWith("ko") ?? false;
  const title = getString(payload.title) || (ko ? "이 영상" : "this video");
  const channel = getString(payload.channel);
  const currentTime = getFiniteNumber(payload.currentTimeSeconds);
  const currentTimeLabel = formatTimestamp(currentTime ?? 0);
  const chapterTitles = getStringArray(payload.chapterTitles).slice(0, 5);
  const chapterHint = chapterTitles.length
    ? chapterTitles.map((chapter) => `- ${chapter}`).join("\n")
    : ko
      ? "챕터 정보가 없으면 영상 흐름을 기준으로 나눠줘."
      : "If chapter metadata is unavailable, segment the video by topic flow.";

  if (ko) {
    return [
      {
        id: "youtube-summary-question",
        title: "영상 핵심 요약",
        description: `${title}의 핵심 주장과 결론을 빠르게 정리`,
        kind: "prompt",
        prompt: `현재 유튜브 영상 "${title}"${channel ? ` (${channel})` : ""}을 핵심 주장, 근거, 결론 중심으로 한국어로 요약해줘. 중요한 시점은 타임스탬프로 표시해줘.`,
      },
      {
        id: "youtube-current-moment-question",
        title: "현재 장면 설명",
        description: `${currentTimeLabel} 지점에서 무슨 내용인지 설명`,
        kind: "prompt",
        prompt: `현재 재생 위치 ${currentTimeLabel}를 기준으로 이 유튜브 영상 "${title}"에서 어떤 내용이 다뤄지는지 설명해줘. 앞뒤 맥락과 사용자가 지금 봐야 할 포인트를 함께 알려줘.`,
      },
      {
        id: "youtube-chapter-notes-question",
        title: "챕터별 노트",
        description: "영상 흐름을 챕터별 학습 노트로 변환",
        kind: "prompt",
        prompt: `이 유튜브 영상 "${title}"을 챕터별 노트로 정리해줘. 각 챕터마다 핵심 내용, 인용 가능한 문장, 확인해야 할 액션을 구분해줘.\n\n참고 챕터:\n${chapterHint}`,
      },
      {
        id: "youtube-blog-draft-question",
        title: "글 초안 만들기",
        description: "영상 내용을 블로그/스레드 초안으로 변환",
        kind: "prompt",
        prompt: `현재 유튜브 영상 "${title}"을 바탕으로 블로그 글 초안을 작성해줘. 제목 후보 3개, 도입부, 섹션 구조, 핵심 요약, 마무리 CTA를 포함해줘.`,
      },
    ];
  }

  return [
    {
      id: "youtube-summary-question",
      title: "Summarize video",
      description: `Extract the main argument and takeaways from ${title}.`,
      kind: "prompt",
      prompt: `Summarize the current YouTube video "${title}"${channel ? ` by ${channel}` : ""}. Focus on the main claim, evidence, conclusions, and timestamped moments.`,
    },
    {
      id: "youtube-current-moment-question",
      title: "Explain this moment",
      description: `Explain what is happening around ${currentTimeLabel}.`,
      kind: "prompt",
      prompt: `Explain what is happening around ${currentTimeLabel} in the YouTube video "${title}". Include the surrounding context and what I should pay attention to now.`,
    },
    {
      id: "youtube-chapter-notes-question",
      title: "Chapter notes",
      description: "Turn the video flow into structured notes.",
      kind: "prompt",
      prompt: `Create chapter-by-chapter notes for the YouTube video "${title}". For each chapter, separate key ideas, quotable lines, and follow-up actions.\n\nReference chapters:\n${chapterHint}`,
    },
    {
      id: "youtube-blog-draft-question",
      title: "Draft post",
      description: "Convert the video into a blog or thread draft.",
      kind: "prompt",
      prompt: `Write a blog draft based on the YouTube video "${title}". Include 3 title options, an intro, section outline, key takeaways, and a closing CTA.`,
    },
  ];
}

function createGmailSuggestedQuestions(payload: Record<string, unknown>, locale: string | undefined): ActionCard[] {
  const ko = isKoreanLocale(locale);
  const title = getString(payload.title) || (ko ? "현재 메일" : "this email");
  return ko
    ? [
        promptCard("gmail-reply-draft", "답장 초안 작성", "현재 메일 맥락에 맞는 실무 답장 작성", `현재 Gmail 메일 "${title}"에 대한 답장 초안을 작성해줘. 먼저 상대의 요청을 짧게 확인하고, 내가 해야 할 답변/결정/추가 질문을 자연스럽게 정리해줘. 너무 장황하지 않게 바로 보낼 수 있는 톤으로 작성해줘.`),
        promptCard("gmail-thread-summary", "스레드 요약", "메일 대화의 핵심과 결정 사항 정리", `현재 Gmail 스레드를 핵심 요약, 결정된 사항, 아직 열려 있는 질문, 내가 해야 할 다음 액션으로 나눠서 정리해줘.`),
        promptCard("gmail-action-items", "할 일 추출", "마감일, 담당자, 후속 액션 추출", `현재 메일에서 해야 할 일, 마감일, 담당자, 답장에 포함해야 할 질문을 표로 추출해줘. 불확실한 항목은 '확인 필요'로 표시해줘.`),
        promptCard("gmail-polish-reply", "답장 다듬기", "작성할 답장을 더 명확하고 전문적으로 개선", `현재 메일 맥락을 기준으로 내가 보낼 답장을 더 명확하고 전문적인 톤으로 다듬어줘. 필요하면 짧은 버전과 정중한 버전 2가지를 제안해줘.`),
      ]
    : [
        promptCard("gmail-reply-draft", "Draft reply", "Write a practical reply for the current email.", `Draft a reply to the current Gmail thread "${title}". Acknowledge the request, answer what can be answered, ask any necessary follow-up questions, and keep it ready to send.`),
        promptCard("gmail-thread-summary", "Summarize thread", "Extract decisions and open questions.", "Summarize the current Gmail thread into key points, decisions, open questions, and my next actions."),
        promptCard("gmail-action-items", "Extract tasks", "Find owners, deadlines, and follow-ups.", "Extract action items, owners, deadlines, and questions from the current email. Mark uncertain items as needs confirmation."),
        promptCard("gmail-polish-reply", "Polish reply", "Improve a response using this email context.", "Using the current email context, improve my reply so it is clear, professional, and concise. Offer a short version and a warmer version."),
      ];
}

function createKoreanMailSuggestedQuestions(payload: Record<string, unknown>, locale: string | undefined): ActionCard[] {
  const ko = isKoreanLocale(locale);
  const title = getString(payload.title) || (ko ? "현재 메일" : "this email");
  return ko
    ? [
        promptCard("korean-mail-reply-draft", "답장 초안 작성", "네이버/다음/업무 메일에 바로 보낼 답장 작성", `현재 메일 "${title}"에 대한 답장 초안을 작성해줘. 상대 요청을 짧게 확인하고, 답변/결정/추가 확인 질문을 자연스럽게 정리해줘. 한국 업무 메일 톤으로 너무 딱딱하지 않게 작성해줘.`),
        promptCard("korean-mail-polite-rewrite", "공손하게 다듬기", "메일 문장을 한국식 비즈니스 톤으로 개선", "현재 메일 맥락을 기준으로 내가 보낼 답장을 더 자연스럽고 공손한 한국식 비즈니스 메일 톤으로 다듬어줘. 짧은 버전과 정중한 버전 2개를 제안해줘."),
        promptCard("korean-mail-action-items", "할 일 추출", "요청사항, 마감, 담당자 정리", "현재 메일에서 요청사항, 마감일, 담당자, 답장에 포함해야 할 확인 질문을 표로 추출해줘. 불명확한 부분은 '확인 필요'로 표시해줘."),
        promptCard("korean-mail-followup", "후속 메일 작성", "독촉/확인/감사 메일 초안", "현재 메일 흐름을 바탕으로 후속 메일을 작성해줘. 목적이 확인/독촉/감사 중 무엇인지 먼저 판단하고, 부담스럽지 않게 보낼 수 있는 문장으로 작성해줘."),
      ]
    : [
        promptCard("korean-mail-reply-draft", "Draft reply", "Write a reply for Naver/Daum/work email.", `Draft a reply to the current Korean email "${title}". Keep it practical, polite, and ready to send.`),
        promptCard("korean-mail-polite-rewrite", "Polish politely", "Improve the reply in Korean business tone.", "Rewrite my reply in a natural Korean business email tone. Provide a concise version and a more formal version."),
        promptCard("korean-mail-action-items", "Extract tasks", "Find requests, deadlines, and owners.", "Extract requests, deadlines, owners, and follow-up questions from this email. Mark uncertain items as needs confirmation."),
        promptCard("korean-mail-followup", "Follow-up email", "Draft a reminder, confirmation, or thank-you email.", "Draft a follow-up email based on the current thread. Choose the right intent: reminder, confirmation, or thanks."),
      ];
}

function createDocsSuggestedQuestions(payload: Record<string, unknown>, locale: string | undefined): ActionCard[] {
  const ko = isKoreanLocale(locale);
  const title = getString(payload.title) || (ko ? "현재 문서" : "this document");
  return ko
    ? [
        promptCard("docs-summary", "문서 요약", "핵심 주장, 결정 사항, 리스크 정리", `현재 Google Docs 문서 "${title}"를 핵심 주장, 근거, 결정 사항, 리스크, 다음 액션으로 요약해줘.`),
        promptCard("docs-rewrite", "문장 개선", "선택/현재 문서를 더 명확하게 다듬기", "현재 문서의 문장을 더 명확하고 설득력 있게 다듬어줘. 바뀐 의도와 톤도 짧게 설명해줘."),
        promptCard("docs-exec-brief", "임원 보고용 요약", "긴 문서를 보고용 브리프로 변환", "현재 문서를 임원 보고용 1페이지 브리프로 바꿔줘. 배경, 핵심 결정, 리스크, 요청 사항을 포함해줘."),
      ]
    : [
        promptCard("docs-summary", "Summarize doc", "Extract argument, risks, and actions.", `Summarize the current Google Docs document "${title}" with main claims, evidence, decisions, risks, and next actions.`),
        promptCard("docs-rewrite", "Improve writing", "Make the document clearer and stronger.", "Rewrite the current document or selection for clarity, structure, and persuasive tone. Briefly explain the changes."),
        promptCard("docs-exec-brief", "Executive brief", "Turn the doc into a one-page brief.", "Convert the current document into a one-page executive brief with background, decisions, risks, and asks."),
      ];
}

function createSheetsSuggestedQuestions(payload: Record<string, unknown>, locale: string | undefined): ActionCard[] {
  const ko = isKoreanLocale(locale);
  const title = getString(payload.title) || (ko ? "현재 스프레드시트" : "this spreadsheet");
  return ko
    ? [
        promptCard("sheets-insights", "데이터 인사이트", "추세, 이상치, 확인 포인트 찾기", `현재 Google Sheets "${title}"에서 보이는 데이터를 기준으로 핵심 추세, 이상치, 확인해야 할 질문을 정리해줘.`),
        promptCard("sheets-formulas", "수식/정리 제안", "분석에 필요한 수식과 정리 방법 제안", "현재 스프레드시트 작업에 필요한 수식, 피벗/필터, 정리 방식을 제안해줘. 바로 적용 가능한 예시를 포함해줘."),
        promptCard("sheets-summary", "보고서 요약", "시트 내용을 업무 보고 형태로 변환", "현재 시트 내용을 팀 보고용 요약으로 바꿔줘. 핵심 수치, 변화 원인, 의사결정 포인트를 포함해줘."),
      ]
    : [
        promptCard("sheets-insights", "Find insights", "Identify trends, outliers, and questions.", `Analyze the visible Google Sheets data in "${title}" and identify trends, outliers, and questions to verify.`),
        promptCard("sheets-formulas", "Suggest formulas", "Recommend formulas and cleanup steps.", "Suggest formulas, pivots, filters, or cleanup steps for the current spreadsheet task with concrete examples."),
        promptCard("sheets-summary", "Report summary", "Turn sheet data into a business update.", "Turn the current sheet into a business update with key metrics, changes, causes, and decision points."),
      ];
}

function createSlidesSuggestedQuestions(payload: Record<string, unknown>, locale: string | undefined): ActionCard[] {
  const ko = isKoreanLocale(locale);
  const title = getString(payload.title) || (ko ? "현재 슬라이드" : "this deck");
  return ko
    ? [
        promptCard("slides-critique", "슬라이드 리뷰", "구조, 메시지, 시각적 개선점 제안", `현재 Google Slides "${title}"의 메시지 흐름, 장표 구조, 시각적 개선점을 리뷰해줘.`),
        promptCard("slides-speaker-notes", "발표 스크립트", "현재 장표 기반 발표 노트 작성", "현재 슬라이드 흐름에 맞춰 발표자 노트를 작성해줘. 각 장표별 말할 포인트와 전환 문장을 포함해줘."),
        promptCard("slides-exec-summary", "핵심 요약", "덱을 의사결정용 요약으로 변환", "현재 덱을 의사결정자용 요약으로 바꿔줘. 결론, 근거, 요청 사항, 리스크를 분리해줘."),
      ]
    : [
        promptCard("slides-critique", "Review deck", "Improve structure, message, and visuals.", `Review the current Google Slides deck "${title}" for narrative flow, slide structure, and visual improvements.`),
        promptCard("slides-speaker-notes", "Speaker notes", "Draft notes for the current deck.", "Write speaker notes for the current deck with talking points and transitions for each slide."),
        promptCard("slides-exec-summary", "Decision summary", "Turn the deck into an executive summary.", "Convert the current deck into an executive summary with conclusion, evidence, asks, and risks."),
      ];
}

function createCalendarSuggestedQuestions(payload: Record<string, unknown>, locale: string | undefined): ActionCard[] {
  const ko = isKoreanLocale(locale);
  return ko
    ? [
        promptCard("calendar-brief", "회의 준비", "현재 일정 기준 준비할 내용 정리", "현재 Google Calendar 일정 기준으로 회의 목적, 준비해야 할 질문, 확인할 자료, 예상 의사결정을 정리해줘."),
        promptCard("calendar-agenda", "아젠다 작성", "회의 아젠다와 시간 배분 제안", "현재 일정에 맞는 회의 아젠다와 시간 배분을 작성해줘. 참석자가 미리 준비할 항목도 포함해줘."),
        promptCard("calendar-followup", "후속 메일", "회의 후 보낼 팔로업 초안 작성", "현재 일정/회의 맥락을 기준으로 회의 후 팔로업 메일 초안을 작성해줘. 결정 사항, 액션 아이템, 마감일을 포함해줘."),
      ]
    : [
        promptCard("calendar-brief", "Meeting brief", "Prepare for the current calendar event.", "Prepare a meeting brief from the current Google Calendar event with purpose, questions, materials to review, and likely decisions."),
        promptCard("calendar-agenda", "Draft agenda", "Create agenda and time allocation.", "Draft an agenda and time allocation for the current meeting. Include pre-read or prep items for attendees."),
        promptCard("calendar-followup", "Follow-up email", "Write a post-meeting follow-up.", "Draft a follow-up email for this meeting with decisions, action items, owners, and deadlines."),
      ];
}

function createDriveSuggestedQuestions(payload: Record<string, unknown>, locale: string | undefined): ActionCard[] {
  const ko = isKoreanLocale(locale);
  const title = getString(payload.title) || (ko ? "현재 드라이브" : "this Drive folder");
  return ko
    ? [
        promptCard("google-drive-organize", "파일 정리", "현재 폴더/파일을 업무 기준으로 정리", `현재 Google Drive "${title}"의 파일과 폴더를 기준으로 핵심 자료, 누락된 문서, 정리할 폴더 구조, 공유/권한 확인 항목을 정리해줘.`),
        promptCard("google-drive-brief", "자료 요약", "보이는 파일 목록을 프로젝트 브리프로 변환", "현재 Google Drive 화면의 자료 목록을 프로젝트 브리프로 요약해줘. 문서별 용도, 우선 확인할 자료, 다음 액션을 포함해줘."),
        promptCard("google-drive-sharing", "공유 점검", "권한과 공유 리스크 확인", "현재 Drive 화면에서 공유/권한 관점으로 확인해야 할 리스크와 정리 액션을 제안해줘."),
      ]
    : [
        promptCard("google-drive-organize", "Organize files", "Turn the current Drive view into a useful structure.", `Review the current Google Drive view "${title}" and suggest key files, missing docs, folder structure, and sharing checks.`),
        promptCard("google-drive-brief", "Brief materials", "Summarize visible files into a project brief.", "Summarize the visible Drive materials into a project brief with document purpose, priority files, and next actions."),
        promptCard("google-drive-sharing", "Sharing check", "Find sharing and permission risks.", "Identify sharing, permission, and cleanup risks in the current Drive view."),
      ];
}

function createMeetSuggestedQuestions(payload: Record<string, unknown>, locale: string | undefined): ActionCard[] {
  const ko = isKoreanLocale(locale);
  const title = getString(payload.title) || (ko ? "현재 회의" : "this meeting");
  return ko
    ? [
        promptCard("google-meet-brief", "회의 준비", "현재 Meet/회의 맥락으로 아젠다 정리", `현재 Google Meet "${title}" 맥락을 기준으로 회의 목적, 확인할 질문, 의사결정 포인트, 종료 후 액션을 정리해줘.`),
        promptCard("google-meet-followup", "회의 후 정리", "결정 사항과 후속 메일 작성", "현재 회의 맥락을 바탕으로 결정 사항, 액션 아이템, 담당자, 마감일을 정리하고 후속 메일 초안을 작성해줘."),
        promptCard("google-meet-questions", "질문 만들기", "회의 중 물어볼 핵심 질문 제안", "현재 회의/화면 맥락에서 지금 물어봐야 할 핵심 질문과 확인해야 할 리스크를 제안해줘."),
      ]
    : [
        promptCard("google-meet-brief", "Meeting prep", "Prepare agenda, questions, and decisions.", `Prepare for the current Google Meet "${title}" with purpose, questions, decision points, and follow-up actions.`),
        promptCard("google-meet-followup", "Meeting follow-up", "Draft decisions and next actions.", "Summarize decisions, action items, owners, deadlines, and draft a follow-up email from this meeting context."),
        promptCard("google-meet-questions", "Questions to ask", "Suggest timely meeting questions.", "Suggest the key questions and risks to raise based on the current meeting context."),
      ];
}

function createTeamChatSuggestedQuestions(
  payload: Record<string, unknown>,
  locale: string | undefined,
  platform: string,
): ActionCard[] {
  const ko = isKoreanLocale(locale);
  const appName = platform === "google-chat" ? "Google Chat" : "Slack";
  const title = getString(payload.title) || appName;
  return ko
    ? [
        promptCard("team-chat-summary", "대화 요약", "채널/스레드의 결정과 할 일 정리", `현재 ${appName} 대화 "${title}"를 결정 사항, 논점, 할 일, 담당자, 마감일 중심으로 요약해줘.`),
        promptCard("team-chat-reply", "답장 작성", "맥락에 맞는 채팅 답변 초안", `현재 ${appName} 대화 맥락에 맞는 답장을 작성해줘. 진행 상황, 막힌 점, 요청 사항, 다음 액션이 분명하게 보이도록 해줘.`),
        promptCard("team-chat-catchup", "놓친 내용 따라잡기", "긴 채널 흐름을 빠르게 파악", `현재 ${appName} 채널에서 내가 놓친 중요한 업데이트, 결정, 멘션해야 할 사람을 정리해줘.`),
      ]
    : [
        promptCard("team-chat-summary", "Summarize chat", "Extract decisions, tasks, owners, and deadlines.", `Summarize the current ${appName} conversation "${title}" into decisions, discussion points, tasks, owners, and deadlines.`),
        promptCard("team-chat-reply", "Draft reply", "Write a contextual chat response.", `Draft a ${appName} reply that clearly states progress, blockers, request, and next action.`),
        promptCard("team-chat-catchup", "Catch up", "Find important missed updates.", `Catch me up on the current ${appName} channel with important updates, decisions, and people to mention.`),
      ];
}

function createTeamsSuggestedQuestions(payload: Record<string, unknown>, locale: string | undefined): ActionCard[] {
  const ko = isKoreanLocale(locale);
  const title = getString(payload.title) || "Microsoft Teams";
  return ko
    ? [
        promptCard("teams-meeting-brief", "Teams 회의/채널 요약", "대화와 회의 맥락을 업무 요약으로 정리", `현재 Microsoft Teams 화면 "${title}"를 회의/채널 맥락 기준으로 요약해줘. 결정 사항, 할 일, 담당자, 다음 액션을 포함해줘.`),
        promptCard("teams-reply", "Teams 답장 작성", "채널/스레드 답변 초안", "현재 Teams 대화 맥락에 맞는 답변을 작성해줘. 간결하지만 업무적으로 필요한 정보가 빠지지 않게 해줘."),
        promptCard("teams-followup", "후속 액션 정리", "회의 후 공유할 액션아이템 정리", "현재 Teams 화면을 바탕으로 공유할 후속 액션, 담당자, 마감일, 확인 질문을 정리해줘."),
      ]
    : [
        promptCard("teams-meeting-brief", "Teams brief", "Summarize meeting or channel context.", `Summarize the current Microsoft Teams view "${title}" with decisions, tasks, owners, and next actions.`),
        promptCard("teams-reply", "Draft Teams reply", "Write a concise channel or thread response.", "Draft a concise Teams response that includes the necessary work context."),
        promptCard("teams-followup", "Follow-up actions", "Extract owners, deadlines, and questions.", "Extract follow-up actions, owners, deadlines, and open questions from the current Teams view."),
      ];
}

function createGitHubSuggestedQuestions(payload: Record<string, unknown>, locale: string | undefined): ActionCard[] {
  const ko = isKoreanLocale(locale);
  const title = getString(payload.title) || "GitHub";
  return ko
    ? [
        promptCard("github-pr-summary", "PR/이슈 요약", "변경점, 논점, 다음 액션 정리", `현재 GitHub 페이지 "${title}"를 변경점/논점/리스크/다음 액션으로 요약해줘.`),
        promptCard("github-review-risks", "리뷰 포인트", "버그 가능성, 테스트 누락, 보안 리스크 찾기", "현재 GitHub PR/이슈에서 리뷰어가 봐야 할 버그 가능성, 테스트 누락, 보안/호환성 리스크를 찾아줘."),
        promptCard("github-draft-comment", "댓글 초안", "건설적인 리뷰/응답 작성", "현재 GitHub 대화 맥락에 맞는 건설적인 리뷰 댓글이나 응답 초안을 작성해줘."),
      ]
    : [
        promptCard("github-pr-summary", "Summarize PR/issue", "Extract changes, risks, and next actions.", `Summarize the current GitHub page "${title}" into changes, discussion points, risks, and next actions.`),
        promptCard("github-review-risks", "Review risks", "Find bugs, missing tests, and security concerns.", "Identify likely bugs, missing tests, security risks, and compatibility concerns in the current GitHub PR or issue."),
        promptCard("github-draft-comment", "Draft comment", "Write a constructive review or response.", "Draft a constructive GitHub review comment or response based on the current thread."),
      ];
}

function createNotionSuggestedQuestions(payload: Record<string, unknown>, locale: string | undefined): ActionCard[] {
  const ko = isKoreanLocale(locale);
  return ko
    ? [
        promptCard("notion-summary", "페이지 요약", "결정 사항과 할 일 중심 정리", "현재 Notion 페이지를 결정 사항, 논점, 할 일, 담당자 중심으로 요약해줘."),
        promptCard("notion-plan", "실행 계획", "페이지 내용을 실행 가능한 작업 목록으로 변환", "현재 Notion 페이지 내용을 실행 가능한 작업 목록으로 바꿔줘. 우선순위와 담당자/마감일 제안도 포함해줘."),
        promptCard("notion-rewrite", "문서 다듬기", "팀 공유용으로 더 명확하게 정리", "현재 Notion 페이지를 팀 공유용으로 더 명확하고 구조적으로 다시 작성해줘."),
      ]
    : [
        promptCard("notion-summary", "Summarize page", "Focus on decisions and tasks.", "Summarize the current Notion page into decisions, discussion points, tasks, and owners."),
        promptCard("notion-plan", "Action plan", "Turn the page into executable tasks.", "Convert the current Notion page into an action plan with priorities, owners, and suggested deadlines."),
        promptCard("notion-rewrite", "Rewrite page", "Make the page clearer for team sharing.", "Rewrite the current Notion page so it is clearer, more structured, and ready to share with a team."),
      ];
}

function createKoreanTeamChatSuggestedQuestions(
  payload: Record<string, unknown>,
  locale: string | undefined,
  platform: string,
): ActionCard[] {
  const ko = isKoreanLocale(locale);
  const appName = platform === "kakaowork" ? "카카오워크" : "네이버웍스";
  const title = getString(payload.title) || appName;
  return ko
    ? [
        promptCard("korean-team-chat-reply", "답장 초안", "한국 업무 메신저 톤으로 답변 작성", `현재 ${appName} 대화 "${title}"에 맞는 답장 초안을 작성해줘. 공손하지만 짧게, 진행 상황/요청/다음 액션이 보이도록 작성해줘.`),
        promptCard("korean-team-chat-summary", "대화 요약", "결정 사항과 할 일 정리", `현재 ${appName} 대화를 결정 사항, 할 일, 담당자, 마감일, 확인 질문으로 요약해줘.`),
        promptCard("korean-team-chat-report", "보고용 정리", "상사/팀 공유용 요약 작성", `현재 ${appName} 대화 내용을 상사나 팀에 공유할 수 있는 진행상황 보고로 정리해줘.`),
      ]
    : [
        promptCard("korean-team-chat-reply", "Draft reply", "Write a Korean work messenger reply.", `Draft a concise, polite reply for the current ${appName} conversation "${title}".`),
        promptCard("korean-team-chat-summary", "Summarize chat", "Extract decisions and actions.", `Summarize the current ${appName} conversation into decisions, tasks, owners, deadlines, and open questions.`),
        promptCard("korean-team-chat-report", "Status report", "Create a team or manager update.", `Turn the current ${appName} conversation into a status report for a manager or team.`),
      ];
}

function createProjectTaskSuggestedQuestions(
  payload: Record<string, unknown>,
  locale: string | undefined,
  platform: string,
): ActionCard[] {
  const ko = isKoreanLocale(locale);
  const appName = platform === "flow" ? "flow" : platform === "asana" ? "Asana" : "ClickUp";
  const title = getString(payload.title) || appName;
  return ko
    ? [
        promptCard("project-task-summary", "업무 요약", "태스크 상태, 블로커, 다음 액션 정리", `현재 ${appName} 업무 "${title}"를 목표, 현재 상태, 블로커, 담당자, 마감일, 다음 액션 중심으로 요약해줘.`),
        promptCard("project-task-comment", "댓글 작성", "업무툴에 남길 업데이트 초안", `현재 ${appName} 태스크에 남길 댓글을 작성해줘. 진행 상황, 필요한 결정, 요청 사항을 명확하게 포함해줘.`),
        promptCard("project-task-plan", "실행 계획", "작업을 하위 태스크와 우선순위로 분해", `현재 ${appName} 업무를 실행 가능한 하위 태스크로 나누고 우선순위, 의존성, 리스크를 정리해줘.`),
      ]
    : [
        promptCard("project-task-summary", "Task summary", "Summarize status, blockers, and next actions.", `Summarize the current ${appName} task "${title}" by goal, status, blockers, owner, deadline, and next actions.`),
        promptCard("project-task-comment", "Draft update", "Write a task comment update.", `Draft a ${appName} task comment with progress, decisions needed, and requests.`),
        promptCard("project-task-plan", "Action plan", "Break the task into subtasks.", `Break the current ${appName} task into subtasks with priorities, dependencies, and risks.`),
      ];
}

function createJiraSuggestedQuestions(payload: Record<string, unknown>, locale: string | undefined): ActionCard[] {
  const ko = isKoreanLocale(locale);
  const title = getString(payload.title) || "Jira issue";
  return ko
    ? [
        promptCard("jira-issue-summary", "이슈 요약", "요구사항, 상태, 리스크 정리", `현재 Jira 이슈 "${title}"를 요구사항, 현재 상태, 블로커, 리스크, 다음 액션으로 요약해줘.`),
        promptCard("jira-acceptance-criteria", "인수 조건 작성", "완료 기준과 테스트 케이스 제안", "현재 Jira 이슈에 맞는 인수 조건, 테스트 케이스, 예외 케이스를 작성해줘."),
        promptCard("jira-comment", "Jira 댓글 작성", "실무 업데이트 댓글 초안", "현재 Jira 이슈에 남길 업데이트 댓글을 작성해줘. 진행상황, 블로커, 필요한 결정이 분명하게 보이도록 해줘."),
      ]
    : [
        promptCard("jira-issue-summary", "Issue summary", "Summarize requirements, status, and risks.", `Summarize the current Jira issue "${title}" by requirements, status, blockers, risks, and next actions.`),
        promptCard("jira-acceptance-criteria", "Acceptance criteria", "Draft done criteria and tests.", "Draft acceptance criteria, test cases, and edge cases for this Jira issue."),
        promptCard("jira-comment", "Draft Jira comment", "Write a practical status update.", "Draft a Jira update comment with progress, blockers, and decisions needed."),
      ];
}

function createKanbanSuggestedQuestions(payload: Record<string, unknown>, locale: string | undefined): ActionCard[] {
  const ko = isKoreanLocale(locale);
  const title = getString(payload.title) || "Trello card";
  return ko
    ? [
        promptCard("kanban-card-summary", "카드 요약", "체크리스트와 다음 액션 정리", `현재 Trello 카드/보드 "${title}"를 목표, 체크리스트, 담당자, 마감, 다음 액션 중심으로 요약해줘.`),
        promptCard("kanban-card-comment", "카드 댓글 작성", "진행상황 업데이트 초안", "현재 Trello 카드에 남길 진행상황 댓글을 작성해줘. 완료/진행 중/막힌 점을 구분해줘."),
        promptCard("kanban-board-plan", "보드 정리", "카드 흐름과 우선순위 제안", "현재 Trello 보드/카드를 기준으로 우선순위, 병목, 다음으로 옮길 카드를 제안해줘."),
      ]
    : [
        promptCard("kanban-card-summary", "Card summary", "Summarize checklist and next actions.", `Summarize the current Trello card or board "${title}" by goal, checklist, owner, deadline, and next action.`),
        promptCard("kanban-card-comment", "Draft card comment", "Write a progress update.", "Draft a Trello card comment separating done, in-progress, and blocked items."),
        promptCard("kanban-board-plan", "Board plan", "Suggest priorities and flow.", "Suggest priorities, bottlenecks, and next card moves from the current Trello board or card."),
      ];
}

function createNotesSuggestedQuestions(
  payload: Record<string, unknown>,
  locale: string | undefined,
  platform: string,
): ActionCard[] {
  const ko = isKoreanLocale(locale);
  const appName = platform === "evernote" ? "Evernote" : "OneNote";
  const title = getString(payload.title) || appName;
  return ko
    ? [
        promptCard("notes-summarize", "노트 요약", "메모를 핵심/할 일/결정으로 정리", `현재 ${appName} 노트 "${title}"를 핵심 요약, 결정 사항, 할 일, 추후 확인 항목으로 정리해줘.`),
        promptCard("notes-rewrite", "노트 재구성", "읽기 쉬운 문서 구조로 변환", `현재 ${appName} 노트를 제목, 섹션, 체크리스트가 있는 구조화된 문서로 재작성해줘.`),
        promptCard("notes-research-brief", "리서치 메모", "조사 메모를 브리프로 변환", `현재 ${appName} 노트를 리서치 브리프로 바꿔줘. 주장, 근거, 출처 확인 필요, 다음 질문을 포함해줘.`),
      ]
    : [
        promptCard("notes-summarize", "Summarize note", "Extract key points, decisions, and tasks.", `Summarize the current ${appName} note "${title}" into key points, decisions, tasks, and follow-ups.`),
        promptCard("notes-rewrite", "Restructure note", "Turn notes into a readable document.", `Rewrite the current ${appName} note into a structured document with headings, sections, and checklist items.`),
        promptCard("notes-research-brief", "Research brief", "Turn notes into a research brief.", `Convert the current ${appName} note into a research brief with claims, evidence, source checks, and next questions.`),
      ];
}

function createQuickNotesSuggestedQuestions(
  payload: Record<string, unknown>,
  locale: string | undefined,
  platform: string,
): ActionCard[] {
  const ko = isKoreanLocale(locale);
  const appName = platform === "google-keep" ? "Google Keep" : "Samsung Notes";
  const title = getString(payload.title) || appName;
  return ko
    ? [
        promptCard("quick-note-organize", "메모 정리", "짧은 메모를 할 일과 아이디어로 분류", `현재 ${appName} 메모 "${title}"를 할 일, 아이디어, 참고자료, 나중에 확인할 항목으로 정리해줘.`),
        promptCard("quick-note-action", "실행 항목 만들기", "메모를 체크리스트로 변환", `현재 ${appName} 메모를 실행 가능한 체크리스트로 바꿔줘. 우선순위와 오늘 할 일을 구분해줘.`),
        promptCard("quick-note-expand", "메모 확장", "짧은 아이디어를 글/기획으로 발전", `현재 ${appName} 메모를 바탕으로 더 구체적인 글/기획 초안으로 확장해줘.`),
      ]
    : [
        promptCard("quick-note-organize", "Organize note", "Classify short notes into tasks and ideas.", `Organize the current ${appName} note "${title}" into tasks, ideas, references, and later checks.`),
        promptCard("quick-note-action", "Make checklist", "Turn notes into actionable steps.", `Turn the current ${appName} note into an actionable checklist with priorities and today's tasks.`),
        promptCard("quick-note-expand", "Expand idea", "Develop the note into a draft or plan.", `Expand the current ${appName} note into a more concrete draft or plan.`),
      ];
}

function createKoreanWritingSuggestedQuestions(payload: Record<string, unknown>, locale: string | undefined): ActionCard[] {
  const ko = isKoreanLocale(locale);
  const title = getString(payload.title) || (ko ? "현재 글" : "this post");
  return ko
    ? [
        promptCard("korean-writing-draft", "글 초안 작성", "블로그/카페/브런치 글 구조 잡기", `현재 페이지 "${title}" 맥락을 바탕으로 글 초안을 작성해줘. 제목 후보 5개, 도입부, 본문 구조, 결론, CTA를 포함해줘.`),
        promptCard("korean-writing-polish", "문장 다듬기", "자연스럽고 읽기 쉬운 한국어로 개선", "현재 작성 중인 글을 더 자연스럽고 읽기 쉬운 한국어로 다듬어줘. 문체는 과장 없이 전문적이지만 친근하게 유지해줘."),
        promptCard("korean-writing-seo", "SEO 개선", "제목, 소제목, 검색 키워드 제안", "현재 글을 네이버/구글 검색에 더 잘 맞도록 제목, 소제목, 핵심 키워드, 메타 설명, 태그를 제안해줘."),
        promptCard("korean-writing-comment-reply", "댓글/게시글 답변", "카페/블로그 댓글에 자연스럽게 답변", "현재 게시글이나 댓글 맥락에 맞는 답변을 작성해줘. 공격적으로 보이지 않게 공감, 핵심 답변, 추가 안내 순서로 구성해줘."),
      ]
    : [
        promptCard("korean-writing-draft", "Draft post", "Structure a Korean blog/community post.", `Draft a post from "${title}" with title ideas, intro, outline, conclusion, and CTA.`),
        promptCard("korean-writing-polish", "Polish writing", "Make Korean writing clearer and smoother.", "Polish the current Korean writing so it reads naturally, clearly, and professionally."),
        promptCard("korean-writing-seo", "SEO improve", "Suggest titles, headings, and keywords.", "Improve this post for Naver/Google search with title options, headings, keywords, meta description, and tags."),
        promptCard("korean-writing-comment-reply", "Reply to comment", "Draft a community/blog response.", "Draft a response to the current post or comment with empathy, clear answer, and next guidance."),
      ];
}

function createKoreanWorkSuggestedQuestions(payload: Record<string, unknown>, locale: string | undefined): ActionCard[] {
  const ko = isKoreanLocale(locale);
  return ko
    ? [
        promptCard("korean-work-task-summary", "업무 요약", "협업툴 내용을 결정/할 일 중심으로 정리", "현재 업무 페이지를 결정 사항, 논점, 할 일, 담당자, 마감일 중심으로 요약해줘."),
        promptCard("korean-work-comment", "업무 댓글 작성", "두레이/슬랙/지라/협업툴 댓글 초안", "현재 업무 맥락에 맞는 댓글을 작성해줘. 진행 상황, 이슈, 요청 사항, 다음 액션이 분명하게 보이도록 해줘."),
        promptCard("korean-work-meeting-note", "회의록 정리", "논의 내용을 회의록/액션아이템으로 변환", "현재 페이지 내용을 회의록 형태로 정리해줘. 참석자에게 공유할 수 있게 결정 사항, 액션 아이템, 담당자, 마감일을 포함해줘."),
        promptCard("korean-work-status-report", "상태 보고", "상사/팀 공유용 진행상황 보고 작성", "현재 업무 내용을 바탕으로 상사나 팀에게 공유할 진행상황 보고를 작성해줘. 완료/진행 중/블로커/도움 요청을 구분해줘."),
      ]
    : [
        promptCard("korean-work-task-summary", "Work summary", "Summarize decisions, tasks, owners, and deadlines.", "Summarize the current work page into decisions, issues, action items, owners, and deadlines."),
        promptCard("korean-work-comment", "Draft work comment", "Write a clear collaboration-tool comment.", "Draft a work comment that clearly states progress, issue, request, and next action."),
        promptCard("korean-work-meeting-note", "Meeting notes", "Convert discussion into notes and action items.", "Turn the current page into meeting notes with decisions, action items, owners, and deadlines."),
        promptCard("korean-work-status-report", "Status report", "Write a team or manager update.", "Write a status update with completed items, in-progress items, blockers, and help needed."),
      ];
}

function createKoreanCommunitySuggestedQuestions(payload: Record<string, unknown>, locale: string | undefined): ActionCard[] {
  const ko = isKoreanLocale(locale);
  return ko
    ? [
        promptCard("korean-community-summary", "글/댓글 요약", "긴 게시글과 댓글 흐름 빠르게 정리", "현재 게시글과 댓글 흐름을 핵심 주장, 반응, 쟁점, 유용한 정보로 요약해줘."),
        promptCard("korean-community-reply", "댓글 답변 작성", "상황에 맞는 자연스러운 답변", "현재 커뮤니티 글 맥락에 맞는 댓글을 작성해줘. 논쟁을 키우지 않고 핵심만 부드럽게 전달하는 톤으로 작성해줘."),
        promptCard("korean-community-factcheck", "팩트체크 포인트", "확인해야 할 주장과 근거 정리", "현재 글에서 사실 확인이 필요한 주장, 근거가 약한 부분, 추가로 찾아볼 키워드를 정리해줘."),
      ]
    : [
        promptCard("korean-community-summary", "Summarize thread", "Summarize post and comment flow.", "Summarize the current community post and comments into claims, reactions, disputes, and useful information."),
        promptCard("korean-community-reply", "Draft comment", "Write a natural community reply.", "Draft a reply that fits the current community context and avoids escalating conflict."),
        promptCard("korean-community-factcheck", "Fact-check points", "Identify claims to verify.", "Identify claims that need verification, weak evidence, and keywords to research next."),
      ];
}

function createKoreanHiringSuggestedQuestions(payload: Record<string, unknown>, locale: string | undefined): ActionCard[] {
  const ko = isKoreanLocale(locale);
  return ko
    ? [
        promptCard("korean-hiring-fit", "공고 적합도 분석", "채용공고와 내 역량 매칭 포인트 정리", "현재 채용공고를 기준으로 핵심 요구사항, 우대사항, 숨은 기대역량, 지원자가 강조해야 할 경험을 정리해줘."),
        promptCard("korean-hiring-cover-letter", "지원동기 초안", "공고 맞춤 자기소개/지원동기 작성", "현재 채용공고에 맞춰 지원동기/자기소개 초안을 작성해줘. 회사/직무 요구사항과 연결되는 경험을 강조해줘."),
        promptCard("korean-hiring-interview", "면접 예상질문", "공고 기반 예상 질문과 답변 방향", "현재 채용공고를 바탕으로 면접 예상 질문 10개와 답변 방향을 만들어줘. 실무/협업/성과 질문을 구분해줘."),
        promptCard("korean-hiring-redflags", "공고 리스크 점검", "불명확한 조건과 확인 질문 찾기", "현재 채용공고에서 확인이 필요한 조건, 모호한 표현, 리스크, 면접에서 물어볼 질문을 정리해줘."),
      ]
    : [
        promptCard("korean-hiring-fit", "Job fit analysis", "Match requirements to strengths.", "Analyze the current job posting for requirements, preferred qualifications, hidden expectations, and experiences to emphasize."),
        promptCard("korean-hiring-cover-letter", "Cover letter draft", "Write a tailored application draft.", "Draft a tailored cover letter or application response based on this job posting."),
        promptCard("korean-hiring-interview", "Interview prep", "Create questions and answer angles.", "Create 10 interview questions and answer angles from this job posting, grouped by technical, collaboration, and impact topics."),
        promptCard("korean-hiring-redflags", "Posting risks", "Find unclear conditions and questions.", "Find unclear conditions, risks, and questions to ask during interviews from this job posting."),
      ];
}

function createFigmaSuggestedQuestions(payload: Record<string, unknown>, locale: string | undefined): ActionCard[] {
  const ko = isKoreanLocale(locale);
  return ko
    ? [
        promptCard("figma-ui-review", "UI 리뷰", "시각 계층, 여백, 접근성 점검", "현재 Figma 화면을 기준으로 시각 계층, 정보 구조, 여백, 접근성, 모바일 대응 관점에서 리뷰해줘."),
        promptCard("figma-copy", "UX 문구 개선", "버튼/라벨/온보딩 문구 제안", "현재 Figma 디자인의 버튼, 라벨, 빈 상태, 온보딩 문구를 더 명확하게 개선해줘."),
        promptCard("figma-handoff", "개발 핸드오프", "구현 포인트와 상태 정의 정리", "현재 Figma 화면을 개발 핸드오프 문서로 정리해줘. 컴포넌트, 상태, 반응형, 접근성 고려사항을 포함해줘."),
      ]
    : [
        promptCard("figma-ui-review", "UI review", "Check hierarchy, spacing, and accessibility.", "Review the current Figma screen for visual hierarchy, information architecture, spacing, accessibility, and responsive behavior."),
        promptCard("figma-copy", "Improve UX copy", "Suggest clearer labels and empty states.", "Improve the buttons, labels, empty states, and onboarding copy in the current Figma design."),
        promptCard("figma-handoff", "Dev handoff", "Create implementation notes.", "Turn the current Figma screen into developer handoff notes covering components, states, responsive behavior, and accessibility."),
      ];
}

function createShoppingSuggestedQuestions(payload: Record<string, unknown>, locale: string | undefined): ActionCard[] {
  const ko = isKoreanLocale(locale);
  return ko
    ? [
        promptCard("shopping-compare", "상품 비교", "가격, 장단점, 구매 리스크 비교", "현재 상품 페이지를 가격, 핵심 스펙, 장단점, 리뷰 리스크, 대체 후보 기준으로 비교해줘."),
        promptCard("shopping-review-risk", "리뷰 신뢰도", "리뷰에서 반복되는 장점/불만 찾기", "현재 상품의 리뷰와 설명에서 반복되는 장점, 불만, 과장 가능성, 구매 전 확인할 점을 정리해줘."),
        promptCard("shopping-decision", "구매 판단", "내가 사도 되는지 결정 기준 제안", "현재 상품을 구매해도 되는지 판단해줘. 사야 하는 경우/보류해야 하는 경우/대체품을 찾아야 하는 경우로 나눠줘."),
      ]
    : [
        promptCard("shopping-compare", "Compare product", "Compare price, pros, cons, and risks.", "Compare the current product page by price, specs, pros, cons, review risks, and alternatives."),
        promptCard("shopping-review-risk", "Review risks", "Find repeated praise and complaints.", "Analyze the product description and reviews for repeated strengths, complaints, hype, and pre-purchase checks."),
        promptCard("shopping-decision", "Buying decision", "Decide whether this is worth buying.", "Help me decide whether to buy this product. Separate buy, wait, and look-for-alternatives scenarios."),
      ];
}

function createTravelSuggestedQuestions(payload: Record<string, unknown>, locale: string | undefined): ActionCard[] {
  const ko = isKoreanLocale(locale);
  return ko
    ? [
        promptCard("travel-plan", "일정 계획", "현재 장소/항공/호텔 기준 일정 제안", "현재 여행 관련 페이지를 기준으로 일정, 이동 동선, 비용 리스크, 예약 전 확인 사항을 정리해줘."),
        promptCard("travel-compare", "옵션 비교", "항공/호텔/장소 후보 비교", "현재 페이지의 여행 옵션을 가격, 시간, 위치, 취소 정책, 실사용 리스크 기준으로 비교해줘."),
        promptCard("travel-checklist", "예약 체크리스트", "예약 전 확인할 항목 정리", "현재 여행 페이지에서 예약 전에 확인해야 할 체크리스트를 만들어줘."),
      ]
    : [
        promptCard("travel-plan", "Plan trip", "Use this travel page to plan next steps.", "Use the current travel page to plan itinerary, routing, cost risks, and pre-booking checks."),
        promptCard("travel-compare", "Compare options", "Compare flights, hotels, or places.", "Compare the travel options on this page by price, time, location, cancellation policy, and practical risks."),
        promptCard("travel-checklist", "Booking checklist", "List what to verify before booking.", "Create a checklist of what to verify before booking from the current travel page."),
      ];
}

function createNewsSuggestedQuestions(payload: Record<string, unknown>, locale: string | undefined): ActionCard[] {
  const ko = isKoreanLocale(locale);
  const title = getString(payload.title) || (ko ? "현재 기사" : "this article");
  return ko
    ? [
        promptCard("news-article-summary", "기사 핵심 요약", "뉴스 기사 핵심을 빠르게 정리", `현재 뉴스 기사 "${title}"를 핵심 사건, 배경, 이해관계자, 주요 근거/인용, 시사점, 확인이 필요한 주장으로 나눠서 요약해줘.`),
        promptCard("news-facts-claims", "팩트와 주장 분리", "확인된 사실, 해석, 추정 구분", `현재 뉴스 기사 "${title}"에서 확인된 사실, 기자/관계자의 해석, 추정 또는 아직 검증이 필요한 주장을 분리해줘. 확인이 필요한 부분은 어떤 자료로 검증해야 하는지도 제안해줘.`),
        workflowCard("news-infographic", "인포그래픽 만들기", "기사 내용을 시각 자료로 변환"),
        promptCard("news-timeline", "타임라인 정리", "사건 흐름과 다음 관전 포인트 정리", `현재 뉴스 기사 "${title}"의 사건 흐름을 시간순 타임라인으로 정리하고, 앞으로 확인해야 할 후속 이슈와 관전 포인트를 제안해줘.`),
      ]
    : [
        promptCard("news-article-summary", "Summarize article", "Extract the article's core facts and implications.", `Summarize the current news article "${title}" by core event, background, stakeholders, evidence or quotes, implications, and claims that need verification.`),
        promptCard("news-facts-claims", "Separate facts and claims", "Distinguish verified facts, interpretation, and uncertainty.", `Separate verified facts, reporter/source interpretation, assumptions, and claims that need verification in the current news article "${title}". Suggest what evidence would verify uncertain points.`),
        workflowCard("news-infographic", "Create infographic", "Turn the article into a visual brief."),
        promptCard("news-timeline", "Extract timeline", "Create a timeline and follow-up watchlist.", `Turn the current news article "${title}" into a chronological timeline and list the follow-up issues to watch next.`),
      ];
}

function createArxivSuggestedQuestions(payload: Record<string, unknown>, locale: string | undefined): ActionCard[] {
  const ko = isKoreanLocale(locale);
  const title = getString(payload.title) || (ko ? "현재 논문" : "this paper");
  const arxivId = getString(payload.arxivId);
  const idHint = arxivId ? ` (${arxivId})` : "";
  return ko
    ? [
        promptCard("arxiv-paper-summary", "논문 요약", "초록, 문제, 방법, 결과를 빠르게 정리", `현재 arXiv 논문 "${title}"${idHint}을 논문 Q&A용으로 요약해줘. 연구 문제, 핵심 아이디어, 방법론, 실험/결과, 한계, 내가 읽어야 할 섹션을 구분해줘.`),
        promptCard("arxiv-method-review", "방법론 검토", "모델/실험 설계와 한계 분석", `현재 arXiv 논문 "${title}"의 방법론을 검토해줘. 접근법이 해결하는 문제, 가정, 실험 설계, 비교 기준, 재현성 리스크, 약한 근거를 분리해줘.`),
        promptCard("arxiv-related-work", "관련 연구/차별점", "기존 연구와의 차이 및 후속 검색 키워드", `현재 arXiv 논문 "${title}"의 related work 관점에서 기존 연구와의 차별점, 이어서 읽어야 할 논문 유형, 검색 키워드를 제안해줘.`),
        promptCard("arxiv-implementation-plan", "구현 포인트", "코드로 재현할 때 필요한 단계 정리", `현재 arXiv 논문 "${title}"을 구현하거나 실험 재현하려면 필요한 데이터, 모델 구성, 학습/평가 절차, 체크리스트를 정리해줘.`),
      ]
    : [
        promptCard("arxiv-paper-summary", "Summarize paper", "Extract problem, method, results, and caveats.", `Summarize the current arXiv paper "${title}"${idHint} for Q&A. Separate research problem, core idea, method, experiments/results, limitations, and sections I should read.`),
        promptCard("arxiv-method-review", "Review method", "Analyze assumptions, experiments, and risks.", `Review the methodology of the current arXiv paper "${title}". Separate what it solves, assumptions, experiment design, baselines, reproducibility risks, and weak evidence.`),
        promptCard("arxiv-related-work", "Related work", "Find positioning and follow-up reading.", `Explain how the current arXiv paper "${title}" differs from prior work and suggest follow-up paper types and search keywords.`),
        promptCard("arxiv-implementation-plan", "Implementation plan", "Turn the paper into reproducible steps.", `Create an implementation and reproduction checklist for the arXiv paper "${title}" covering data, model setup, training, evaluation, and validation.`),
      ];
}

function createPdfSuggestedQuestions(payload: Record<string, unknown>, locale: string | undefined): ActionCard[] {
  const ko = isKoreanLocale(locale);
  const title = getString(payload.title) || getString(payload.filename) || (ko ? "현재 PDF" : "this PDF");
  return ko
    ? [
        promptCard("pdf-document-summary", "PDF 요약", "문서 구조와 핵심 내용을 정리", `현재 PDF "${title}"를 문서 구조, 핵심 주장/정보, 중요한 표나 수치, 결론, 확인해야 할 질문으로 요약해줘.`),
        promptCard("pdf-key-points", "핵심 포인트 추출", "중요 문장, 수치, 액션 아이템 찾기", `현재 PDF "${title}"에서 중요한 문장, 수치, 정의, 액션 아이템을 추출해줘. 가능한 경우 페이지나 섹션 단서도 함께 표시해줘.`),
        promptCard("pdf-questions", "PDF 질의응답", "문서 기반으로 물어볼 질문 만들기", `현재 PDF "${title}"를 바탕으로 내가 이해도를 확인할 수 있는 질문 10개와 답변을 만들어줘. 문서에 근거가 없는 내용은 추정하지 말아줘.`),
        promptCard("pdf-brief", "업무 브리프", "PDF를 보고/회의용 요약으로 변환", `현재 PDF "${title}"를 업무용 브리프로 바꿔줘. 배경, 핵심 내용, 리스크, 의사결정 포인트, 다음 액션을 포함해줘.`),
      ]
    : [
        promptCard("pdf-document-summary", "Summarize PDF", "Summarize structure and key content.", `Summarize the current PDF "${title}" by document structure, key claims or information, important tables or numbers, conclusion, and questions to verify.`),
        promptCard("pdf-key-points", "Extract key points", "Find important lines, numbers, and actions.", `Extract important lines, numbers, definitions, and action items from the current PDF "${title}". Include page or section clues when available.`),
        promptCard("pdf-questions", "Ask PDF questions", "Generate grounded Q&A from the document.", `Create 10 comprehension questions and answers from the current PDF "${title}". Do not infer anything that is not grounded in the document.`),
        promptCard("pdf-brief", "Work brief", "Turn the PDF into a business brief.", `Turn the current PDF "${title}" into a work brief with background, key points, risks, decision points, and next actions.`),
      ];
}

function createResearchSuggestedQuestions(payload: Record<string, unknown>, locale: string | undefined): ActionCard[] {
  const ko = isKoreanLocale(locale);
  const title = getString(payload.title) || (ko ? "현재 페이지" : "this page");
  return ko
    ? [
        promptCard("research-summary", "핵심 요약", "주장, 근거, 반론 정리", `현재 페이지 "${title}"의 핵심 주장, 근거, 반론, 신뢰도 판단 포인트를 정리해줘.`),
        promptCard("research-related", "관련 정보 찾기", "추가로 확인해야 할 질문과 출처 제안", "현재 페이지를 바탕으로 추가로 확인해야 할 질문, 필요한 출처 유형, 검색 키워드를 제안해줘."),
        promptCard("research-brief", "리서치 브리프", "실무용 조사 메모로 변환", "현재 페이지를 실무용 리서치 브리프로 바꿔줘. 요약, 시사점, 리스크, 다음 확인 항목을 포함해줘."),
      ]
    : [
        promptCard("research-summary", "Summarize key points", "Extract claims, evidence, and caveats.", `Summarize "${title}" with main claims, evidence, counterpoints, and reliability checks.`),
        promptCard("research-related", "Find related info", "Suggest follow-up questions and sources.", "Suggest follow-up questions, source types, and search keywords based on the current page."),
        promptCard("research-brief", "Research brief", "Turn the page into a work-ready brief.", "Turn the current page into a research brief with summary, implications, risks, and next verification steps."),
      ];
}

function promptCard(id: string, title: string, description: string, prompt: string): ActionCard {
  return { id, title, description, kind: "prompt", prompt };
}

function workflowCard(id: string, title: string, description: string): ActionCard {
  return { id, title, description, kind: "workflow" };
}

function isKoreanLocale(locale: string | undefined): boolean {
  return locale?.toLowerCase().startsWith("ko") ?? false;
}

function getString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function getStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.map(getString).filter(Boolean);
}

function getFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatTimestamp(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  const paddedMinutes = hours > 0 ? String(minutes).padStart(2, "0") : String(minutes).padStart(2, "0");
  const paddedSeconds = String(seconds).padStart(2, "0");

  return hours > 0
    ? `${hours}:${paddedMinutes}:${paddedSeconds}`
    : `${paddedMinutes}:${paddedSeconds}`;
}
