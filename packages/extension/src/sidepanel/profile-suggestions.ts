import type { ActionCard, OpenTabContext, ProfileTemplate } from "@codex-sidepanel/shared";

export interface ProfileSuggestionInput {
  profile: ProfileTemplate | null;
  currentTab: OpenTabContext | null;
  locale: string;
}

type ProfilePromptTemplate = {
  title: string;
  description: string;
  prompt: (context: ProfileSuggestionContext) => string;
};

type ProfileSuggestionContext = {
  title: string;
  siteLabel: string;
  isYouTube: boolean;
  ko: boolean;
};

export type SuggestionCardSource = "profile" | "site";

const PROFILE_PROMPTS_KO: Record<string, ProfilePromptTemplate[]> = {
  "youtube-summarizer": [
    {
      title: "영상 핵심 요약",
      description: "현재 영상의 주장과 근거를 빠르게 정리",
      prompt: ({ title }) => `현재 유튜브 영상 "${title}"을 핵심 주장, 근거, 결론 중심으로 요약해줘. 중요한 지점은 타임스탬프로 표시해줘.`,
    },
    {
      title: "챕터별 노트",
      description: "영상 흐름을 학습 노트로 정리",
      prompt: ({ title }) => `현재 유튜브 영상 "${title}"을 챕터별 학습 노트로 정리해줘. 각 구간마다 핵심 내용, 인용 가능한 문장, 후속 질문을 구분해줘.`,
    },
  ],
  "research-assistant": [
    {
      title: "핵심 근거 정리",
      description: "현재 사이트의 주장, 근거, 불확실성 정리",
      prompt: ({ title, siteLabel }) => `${siteLabel}의 "${title}" 내용을 리서치 관점에서 핵심 주장, 근거, 반론 가능성, 확인해야 할 출처로 나눠 정리해줘.`,
    },
    {
      title: "관련 질문 만들기",
      description: "더 깊게 조사할 질문 생성",
      prompt: ({ title }) => `"${title}"를 더 깊게 조사하기 위한 후속 질문 7개와 각 질문을 확인할 방법을 제안해줘.`,
    },
  ],
  "fact-checker": [
    {
      title: "주장별 팩트체크",
      description: "검증 가능한 주장과 근거를 분리",
      prompt: ({ title, siteLabel }) => `${siteLabel}의 "${title}"에서 검증 가능한 주장을 분리하고, 각 주장별로 근거, 반대 근거, 빠진 맥락, 판정 신뢰도를 정리해줘.`,
    },
    {
      title: "오해 소지 찾기",
      description: "맞지만 misleading한 부분 점검",
      prompt: ({ title }) => `"${title}"에서 사실처럼 보이지만 맥락이 빠졌거나 오해를 부를 수 있는 표현을 찾아 수정된 요약으로 바꿔줘.`,
    },
    {
      title: "출처 검증 계획",
      description: "확인해야 할 1차 출처 제안",
      prompt: ({ title }) => `"${title}"의 핵심 주장 5개를 검증하려면 어떤 1차 출처나 공식 자료가 필요한지, 확인 순서와 이유를 정리해줘.`,
    },
  ],
  "strategy-analyst": [
    {
      title: "기회와 리스크 분석",
      description: "비즈니스 관점의 의사결정 포인트 정리",
      prompt: ({ title, siteLabel }) => `${siteLabel}의 "${title}" 내용을 전략 분석 관점에서 기회, 리스크, 가정, 의사결정 포인트로 정리해줘.`,
    },
    {
      title: "실행안 비교",
      description: "선택지를 비교하고 추천안 작성",
      prompt: ({ title }) => `"${title}"를 바탕으로 가능한 실행안 3가지를 비교하고, 비용/효과/리스크 기준으로 추천안을 제시해줘.`,
    },
  ],
  "product-manager": [
    {
      title: "PRD 초안 만들기",
      description: "현재 맥락을 제품 요구사항으로 변환",
      prompt: ({ title }) => `"${title}"를 바탕으로 문제 정의, 대상 사용자, 근거, 비목표, 성공 지표, 사용자 스토리, 리스크를 포함한 PRD 초안을 작성해줘.`,
    },
    {
      title: "제품 기회 평가",
      description: "기능 요청을 검증 가능한 기회로 정리",
      prompt: ({ title }) => `"${title}"에서 제품 기회를 찾아 사용자 문제, 비즈니스 임팩트, 검증 방법, RICE 기준의 우선순위로 정리해줘.`,
    },
    {
      title: "로드맵 판단",
      description: "지금/다음/나중 기준으로 분류",
      prompt: ({ title }) => `"${title}"를 제품 로드맵 관점에서 Now / Next / Later로 나누고, 각 항목의 근거와 필요한 증거를 설명해줘.`,
    },
  ],
  "marketing-strategist": [
    {
      title: "콘텐츠 훅 뽑기",
      description: "현재 사이트 맥락을 마케팅 메시지로 변환",
      prompt: ({ title, siteLabel, isYouTube }) =>
        `${siteLabel}의 "${title}"${isYouTube ? " 영상" : ""}을 마케팅 관점에서 분석하고, 바로 쓸 수 있는 콘텐츠 훅 10개, 타깃 고객, 핵심 메시지, CTA를 제안해줘.`,
    },
    {
      title: "캠페인 아이디어",
      description: "캠페인 각도와 실험안 제안",
      prompt: ({ title }) => `"${title}"를 바탕으로 캠페인 아이디어 5개를 만들고, 각 아이디어의 타깃, 메시지, 채널, 성공 지표를 표로 정리해줘.`,
    },
  ],
  "slide-maker": [
    {
      title: "슬라이드 이미지 만들기",
      description: "현재 페이지를 발표용 슬라이드 이미지로 제작",
      prompt: ({ title, siteLabel }) =>
        `${siteLabel}의 "${title}" 내용을 핵심 파트별로 분석해서 각 파트를 대표하는 16:9 발표 슬라이드 이미지를 만들어줘. 먼저 청중, 목적, 디자인 방향, 파트별 스토리보드를 짧게 세우고, 각 파트마다 source-grounded slide spec과 이미지 생성 프롬프트를 만든 뒤 같은 Codex 턴 안에서 슬라이드를 순서대로 한 장씩 생성해줘. 내용에 맞게 디자인 방향은 다르게 선택하고, 출처에 없는 숫자나 차트는 만들지 마.`,
    },
    {
      title: "슬라이드 스토리보드",
      description: "이미지 생성 전 발표 흐름 설계",
      prompt: ({ title }) =>
        `"${title}"를 발표 자료로 만들기 위해 원문을 의미 있는 파트로 나누고, 각 파트의 대표 슬라이드 제목, 핵심 메시지, 필요한 근거, 추천 시각화 형식을 표로 정리해줘.`,
    },
    {
      title: "임원 보고 슬라이드",
      description: "의사결정용 슬라이드 구조로 변환",
      prompt: ({ title }) =>
        `"${title}"를 임원 보고용 슬라이드로 바꿔줘. 한 장 요약, 핵심 인사이트, 근거, 리스크, 다음 액션 구조로 정리하고 필요한 경우 슬라이드 이미지 생성용 프롬프트까지 작성해줘.`,
    },
  ],
  "sales-gtm-strategist": [
    {
      title: "세일즈 메시지 작성",
      description: "현재 맥락으로 아웃리치 초안 생성",
      prompt: ({ title, siteLabel }) => `${siteLabel}의 "${title}"를 바탕으로 ICP, 고객 고통, 트리거 이벤트, 개인화 포인트를 정리하고 짧은 세일즈 아웃리치 3가지를 작성해줘.`,
    },
    {
      title: "고객 반론 정리",
      description: "예상 반론과 대응 메시지 생성",
      prompt: ({ title }) => `"${title}" 맥락에서 예상 고객 반론, 필요한 증거, 답변 스크립트, 다음 액션을 표로 정리해줘.`,
    },
    {
      title: "GTM 실험 설계",
      description: "작게 검증할 수 있는 시장 진입 실험",
      prompt: ({ title }) => `"${title}"를 바탕으로 GTM 실험 3개를 설계해줘. 각 실험의 타깃, 메시지, 채널, 성공 지표, 중단 기준을 포함해줘.`,
    },
  ],
  "legal-reviewer": [
    {
      title: "리스크 조항 찾기",
      description: "법률 검토 관점의 리스크와 확인 질문 정리",
      prompt: ({ title }) => `"${title}" 내용을 법률 검토 관점에서 요약하고, 잠재 리스크, 의무사항, 모호한 표현, 전문가에게 확인할 질문을 정리해줘. 법률 자문이 아니라 검토 보조로 답해줘.`,
    },
    {
      title: "의무사항 정리",
      description: "해야 할 일과 주의사항 추출",
      prompt: ({ title }) => `"${title}"에서 당사자별 의무사항, 기한, 금지사항, 확인 필요한 조항을 표로 추출해줘.`,
    },
  ],
  "teacher-mode": [
    {
      title: "쉽게 설명해줘",
      description: "현재 내용을 쉬운 말과 예시로 설명",
      prompt: ({ title }) => `"${title}" 내용을 초보자도 이해할 수 있게 쉬운 비유와 예시로 설명해줘. 마지막에 이해 확인 질문 3개를 넣어줘.`,
    },
    {
      title: "핵심 개념 정리",
      description: "학습용 개념 카드로 변환",
      prompt: ({ title }) => `"${title}"에서 꼭 알아야 할 핵심 개념을 용어 설명, 예시, 흔한 오해, 한 줄 요약으로 정리해줘.`,
    },
  ],
  "data-analyst": [
    {
      title: "지표 인사이트 추출",
      description: "표, 차트, 숫자에서 의미와 이상점 찾기",
      prompt: ({ title }) => `"${title}"에서 확인 가능한 지표와 수치를 데이터 분석 관점으로 해석해줘. 핵심 인사이트, 이상치, 가능한 원인, 추가 분석 질문을 정리해줘.`,
    },
    {
      title: "분석 계획 만들기",
      description: "다음 분석 단계 제안",
      prompt: ({ title }) => `"${title}"를 더 정확히 분석하기 위한 데이터 요구사항, 지표 정의, 시각화 아이디어, 검증 방법을 제안해줘.`,
    },
  ],
  "product-ux-strategist": [
    {
      title: "UX 개선점 찾기",
      description: "사용자 흐름과 마찰 지점 분석",
      prompt: ({ title, siteLabel }) => `${siteLabel}의 "${title}" 화면을 UX 관점에서 평가하고, 사용자의 목표, 마찰 지점, 개선 우선순위, 바로 쓸 수 있는 문구를 제안해줘.`,
    },
    {
      title: "전환율 개선안",
      description: "CTA, 정보 구조, 신뢰 요소 개선",
      prompt: ({ title }) => `"${title}"의 전환율을 높이기 위한 정보 구조, CTA, 신뢰 요소, 접근성 개선안을 우선순위별로 정리해줘.`,
    },
  ],
  "writing-editor": [
    {
      title: "문장 다듬기",
      description: "현재 글을 더 명확하게 개선",
      prompt: ({ title }) => `"${title}"의 핵심 문장을 더 명확하고 자연스럽게 다듬어줘. 원래 의도는 유지하고, 바꾼 이유를 짧게 설명해줘.`,
    },
    {
      title: "톤 바꿔쓰기",
      description: "대상 독자에 맞게 문체 변환",
      prompt: ({ title }) => `"${title}" 내용을 더 전문적인 톤, 친근한 톤, 짧은 SNS 톤 3가지로 다시 써줘.`,
    },
  ],
  "customer-support": [
    {
      title: "응대 초안 작성",
      description: "고객에게 보낼 답변 초안 작성",
      prompt: ({ title }) => `"${title}" 맥락을 바탕으로 고객 응대 답변 초안을 작성해줘. 공감, 문제 확인, 해결 단계, 추가로 필요한 정보를 포함해줘.`,
    },
    {
      title: "문제 원인 정리",
      description: "이슈 원인과 에스컬레이션 기준 정리",
      prompt: ({ title }) => `"${title}"에서 고객 문제의 가능 원인, 확인 질문, 해결 경로, 에스컬레이션 기준을 정리해줘.`,
    },
  ],
  "hr-recruiting-partner": [
    {
      title: "채용 문구 개선",
      description: "JD나 후보자 메시지를 개선",
      prompt: ({ title }) => `"${title}" 내용을 HR/채용 관점에서 더 명확하고 공정한 문구로 개선해줘. 역할 기대치, 평가 기준, 편향 가능성도 점검해줘.`,
    },
    {
      title: "인터뷰 질문 만들기",
      description: "역량 기반 질문과 평가 기준 생성",
      prompt: ({ title }) => `"${title}"를 바탕으로 직무 관련 인터뷰 질문, 좋은 답변 기준, 레드 플래그를 표로 만들어줘.`,
    },
  ],
  "finance-business-analyst": [
    {
      title: "핵심 숫자 해석",
      description: "현재 자료의 재무/비즈니스 의미 정리",
      prompt: ({ title }) => `"${title}"에서 확인 가능한 숫자와 비즈니스 지표를 해석해줘. 핵심 결론, 계산 가정, 리스크, 추가 확인 항목을 구분해줘.`,
    },
    {
      title: "시나리오 분석",
      description: "업사이드/베이스/다운사이드 비교",
      prompt: ({ title }) => `"${title}"를 바탕으로 업사이드, 베이스, 다운사이드 시나리오를 만들고 주요 가정과 민감도를 정리해줘.`,
    },
    {
      title: "가격/수익성 점검",
      description: "가격, 마진, 단위경제성 관점 분석",
      prompt: ({ title }) => `"${title}"를 가격과 수익성 관점에서 분석하고, 단위경제성, 마진 리스크, 개선 실험을 제안해줘.`,
    },
  ],
  "email-comms-assistant": [
    {
      title: "답장 초안 작성",
      description: "현재 메일이나 메시지에 보낼 답변 생성",
      prompt: ({ title }) => `"${title}" 맥락을 바탕으로 자연스러운 답장 초안을 작성해줘. 상대 의도, 필요한 확인 질문, 짧은 버전도 함께 제안해줘.`,
    },
    {
      title: "메일 핵심 정리",
      description: "해야 할 일과 답변 포인트 추출",
      prompt: ({ title }) => `"${title}"에서 상대방 요청, 마감, 내가 해야 할 일, 답장에 포함할 내용을 정리해줘.`,
    },
    {
      title: "톤 바꿔 답장",
      description: "정중/간결/친근 버전 생성",
      prompt: ({ title }) => `"${title}"에 대한 답장을 정중한 버전, 간결한 버전, 친근한 버전으로 각각 작성해줘.`,
    },
  ],
  "roast-coach": [
    {
      title: "날카롭게 까줘",
      description: "아이디어나 글의 약점 찾기",
      prompt: ({ title }) => `"${title}"를 로스팅 모드로 평가해줘. 한 줄로 날카롭게 찌르고, 실제 문제, 착각한 가정, 더 나은 수정안을 구분해서 말해줘.`,
    },
    {
      title: "자기합리화 찾기",
      description: "내가 놓친 약한 논리 점검",
      prompt: ({ title }) => `"${title}"에서 내가 자기합리화하고 있을 가능성, 근거 없는 확신, 남들이 바로 지적할 약점을 찾아줘. 공격이 아니라 개선 포인트로 정리해줘.`,
    },
    {
      title: "출시 전 망신 방지",
      description: "공개 전 부끄러운 부분 점검",
      prompt: ({ title }) => `"${title}"를 공개하기 전에 망신당할 만한 표현, 허술한 주장, 오해받을 포인트를 가장 냉정하게 점검하고 고쳐줘.`,
    },
  ],
  "harsh-comment-simulator": [
    {
      title: "악플 시뮬레이션",
      description: "예상되는 거친 반응과 대응 정리",
      prompt: ({ title }) => `"${title}"에 사람들이 달 수 있는 거친 반응을 시뮬레이션하고, 각 반응 뒤에 숨은 진짜 우려와 수정/대응 방법을 정리해줘.`,
    },
    {
      title: "논란 포인트 예측",
      description: "어디서 공격받을지 사전 점검",
      prompt: ({ title }) => `"${title}"가 공개되면 논란이 될 수 있는 지점, 악의적으로 해석될 수 있는 문장, 방어 가능한 답변을 정리해줘.`,
    },
    {
      title: "댓글 대응 문구",
      description: "거친 댓글에 답하는 문장 작성",
      prompt: ({ title }) => `"${title}"에 대한 거친 댓글 유형 5개를 만들고, 감정적으로 대응하지 않는 짧은 답변 문구를 각각 작성해줘.`,
    },
  ],
};

const PROFILE_PROMPTS_EN: Record<string, ProfilePromptTemplate[]> = {
  "youtube-summarizer": [
    {
      title: "Summarize video",
      description: "Extract the current video's argument and evidence.",
      prompt: ({ title }) => `Summarize the current YouTube video "${title}". Focus on the main claim, evidence, conclusion, and important timestamped moments.`,
    },
    {
      title: "Chapter notes",
      description: "Turn the video flow into study notes.",
      prompt: ({ title }) => `Create chapter-by-chapter notes for the current YouTube video "${title}". Separate key ideas, quotable lines, and follow-up questions for each section.`,
    },
  ],
  "research-assistant": [
    {
      title: "Extract evidence",
      description: "Separate claims, sources, and uncertainty.",
      prompt: ({ title, siteLabel }) => `Analyze "${title}" on ${siteLabel} as research material. Separate key claims, supporting evidence, counterpoints, uncertainty, and sources to verify.`,
    },
    {
      title: "Build research questions",
      description: "Create deeper follow-up questions.",
      prompt: ({ title }) => `Create 7 follow-up research questions for "${title}" and explain how to verify each one.`,
    },
  ],
  "fact-checker": [
    {
      title: "Check claims",
      description: "Separate verifiable claims from evidence.",
      prompt: ({ title, siteLabel }) => `Fact-check "${title}" on ${siteLabel}. Extract checkable claims and list evidence, counter-evidence, missing context, verdict, and confidence for each.`,
    },
    {
      title: "Find misleading framing",
      description: "Identify technically true but incomplete claims.",
      prompt: ({ title }) => `Find statements in "${title}" that may be technically true but misleading because of missing context. Rewrite a verified-only summary.`,
    },
    {
      title: "Source verification plan",
      description: "List primary sources needed to verify claims.",
      prompt: ({ title }) => `For the top 5 claims in "${title}", identify which primary or official sources would verify them and the order to check them.`,
    },
  ],
  "strategy-analyst": [
    {
      title: "Opportunities and risks",
      description: "Frame business drivers and decisions.",
      prompt: ({ title, siteLabel }) => `Analyze "${title}" on ${siteLabel} from a strategy perspective. Summarize opportunities, risks, assumptions, decision points, and recommended next actions.`,
    },
    {
      title: "Compare options",
      description: "Turn context into an option table.",
      prompt: ({ title }) => `Based on "${title}", compare 3 possible actions by cost, impact, risk, and recommendation.`,
    },
  ],
  "product-manager": [
    {
      title: "Draft PRD",
      description: "Turn context into product requirements.",
      prompt: ({ title }) => `Draft a PRD from "${title}" with problem statement, target user, evidence, non-goals, success metrics, user stories, risks, and launch measurement.`,
    },
    {
      title: "Assess opportunity",
      description: "Validate feature value and priority.",
      prompt: ({ title }) => `Evaluate the product opportunity in "${title}". Cover user pain, business impact, validation plan, RICE-style priority, and what evidence would change the decision.`,
    },
    {
      title: "Roadmap decision",
      description: "Sort into now, next, and later.",
      prompt: ({ title }) => `Classify ideas from "${title}" into Now / Next / Later and explain the evidence, trade-offs, and dependencies for each.`,
    },
  ],
  "marketing-strategist": [
    {
      title: "Find content hooks",
      description: "Turn the page into marketing angles.",
      prompt: ({ title, siteLabel, isYouTube }) =>
        `Analyze "${title}" on ${siteLabel}${isYouTube ? " video" : ""} from a marketing perspective. Suggest 10 content hooks, target audiences, key messages, and CTAs.`,
    },
    {
      title: "Campaign ideas",
      description: "Create campaign angles and tests.",
      prompt: ({ title }) => `Create 5 campaign ideas from "${title}". For each, list target, message, channel, and success metric.`,
    },
  ],
  "slide-maker": [
    {
      title: "Create slide images",
      description: "Turn the page into presentation-ready images.",
      prompt: ({ title, siteLabel }) =>
        `Create polished 16:9 presentation slide images from "${title}" on ${siteLabel} by analyzing the source into meaningful parts and making one representative slide image for each part. First define audience, objective, design direction, and a compact source-part storyboard. For each slide, write one source-grounded slide spec and one source-grounded image prompt, then generate the slides sequentially in this same Codex turn, one image at a time. For slide 2 and later, use the previous generated slide image path or preview reference plus the previous slide prompt as explicit continuity references for style, layout, palette, typography, and components. Choose a visual language that fits the content instead of reusing one generic template. Do not invent numbers, charts, logos, or claims not present in the source context.`,
    },
    {
      title: "Storyboard deck",
      description: "Plan the deck before generating visuals.",
      prompt: ({ title }) =>
        `Storyboard a deck from "${title}" by segmenting the source into meaningful parts. For each representative part, include audience need, slide title, core message, source evidence needed, and recommended visual structure.`,
    },
    {
      title: "Turn into executive slides",
      description: "Create decision-ready executive slide images.",
      prompt: ({ title }) =>
        `Turn "${title}" into decision-ready executive slide images by mapping the source's meaningful parts into a board-ready narrative: decision context, executive summary, key insights, options or trade-offs, recommendation, execution plan, risks, and asks only where supported by the source. First create the source-part storyboard, then write a source-grounded slide spec and image prompt for each representative part, and generate the slides sequentially in this same Codex turn, one image at a time. For every slide after slide 1, include the previous generated slide image path or preview reference and previous slide prompt summary as continuity references so the deck feels like one coherent visual system. Do not stop at an outline unless I explicitly ask only for planning.`,
    },
  ],
  "sales-gtm-strategist": [
    {
      title: "Draft sales outreach",
      description: "Create personalized outreach from context.",
      prompt: ({ title, siteLabel }) => `Use "${title}" on ${siteLabel} to identify ICP, customer pain, trigger event, personalization points, and write 3 concise sales outreach drafts.`,
    },
    {
      title: "Handle objections",
      description: "Map likely objections and responses.",
      prompt: ({ title }) => `From "${title}", list likely customer objections, proof needed, response scripts, and next-best actions in a table.`,
    },
    {
      title: "Design GTM tests",
      description: "Create small market validation experiments.",
      prompt: ({ title }) => `Design 3 GTM experiments from "${title}" with target, message, channel, success metric, and stop criteria.`,
    },
  ],
  "legal-reviewer": [
    {
      title: "Find legal risks",
      description: "Identify obligations and open questions.",
      prompt: ({ title }) => `Review "${title}" from a legal-understanding perspective. Summarize risks, obligations, ambiguous wording, and questions for qualified legal counsel. Do not present this as legal advice.`,
    },
    {
      title: "Extract obligations",
      description: "Create a party-by-party obligation table.",
      prompt: ({ title }) => `Extract obligations, deadlines, restrictions, and terms needing clarification from "${title}" in a table.`,
    },
  ],
  "teacher-mode": [
    {
      title: "Explain simply",
      description: "Use plain language, examples, and checks.",
      prompt: ({ title }) => `Explain "${title}" in simple terms for a beginner. Use analogies, examples, and end with 3 check-for-understanding questions.`,
    },
    {
      title: "Concept cards",
      description: "Turn the content into study cards.",
      prompt: ({ title }) => `Extract the must-know concepts from "${title}" as term, explanation, example, common misconception, and one-line summary.`,
    },
  ],
  "data-analyst": [
    {
      title: "Extract insights",
      description: "Interpret metrics, tables, and charts.",
      prompt: ({ title }) => `Analyze the visible metrics and data in "${title}". Summarize insights, anomalies, likely causes, and follow-up analyses.`,
    },
    {
      title: "Analysis plan",
      description: "Define metrics and next analysis steps.",
      prompt: ({ title }) => `Create a data analysis plan for "${title}" including required data, metric definitions, visualization ideas, and validation steps.`,
    },
  ],
  "product-ux-strategist": [
    {
      title: "Find UX improvements",
      description: "Evaluate goals, friction, and copy.",
      prompt: ({ title, siteLabel }) => `Evaluate "${title}" on ${siteLabel} from a product and UX perspective. Identify user goals, friction, accessibility issues, prioritized fixes, and implementation-ready copy.`,
    },
    {
      title: "Improve conversion",
      description: "Optimize IA, CTA, and trust cues.",
      prompt: ({ title }) => `Suggest conversion improvements for "${title}" covering information architecture, CTA, trust signals, accessibility, and priority.`,
    },
  ],
  "writing-editor": [
    {
      title: "Improve writing",
      description: "Clarify structure and wording.",
      prompt: ({ title }) => `Improve the writing in "${title}" while preserving intent. Explain the main edits briefly.`,
    },
    {
      title: "Change tone",
      description: "Rewrite for different audiences.",
      prompt: ({ title }) => `Rewrite "${title}" in three tones: professional, friendly, and short social-post style.`,
    },
  ],
  "customer-support": [
    {
      title: "Draft support reply",
      description: "Create a practical customer response.",
      prompt: ({ title }) => `Draft a customer support reply using "${title}" as context. Include empathy, problem confirmation, resolution steps, and missing information to request.`,
    },
    {
      title: "Diagnose issue",
      description: "Find likely cause and escalation path.",
      prompt: ({ title }) => `From "${title}", summarize the customer's likely issue, possible root causes, clarifying questions, resolution path, and escalation criteria.`,
    },
  ],
  "hr-recruiting-partner": [
    {
      title: "Improve recruiting copy",
      description: "Clarify job expectations and fairness.",
      prompt: ({ title }) => `Improve "${title}" from an HR and recruiting perspective. Clarify expectations, evaluation criteria, and bias risks.`,
    },
    {
      title: "Interview questions",
      description: "Create competency questions and rubrics.",
      prompt: ({ title }) => `Create job-relevant interview questions from "${title}" with strong-answer criteria and red flags in a table.`,
    },
  ],
  "finance-business-analyst": [
    {
      title: "Interpret key numbers",
      description: "Explain financial and business implications.",
      prompt: ({ title }) => `Interpret the financial or business metrics in "${title}". Separate conclusion, assumptions, risks, and follow-up checks.`,
    },
    {
      title: "Scenario analysis",
      description: "Compare upside, base, and downside cases.",
      prompt: ({ title }) => `Build upside, base, and downside scenarios from "${title}" with key assumptions, sensitivities, and risk factors.`,
    },
    {
      title: "Pricing and margin check",
      description: "Review pricing, margin, and unit economics.",
      prompt: ({ title }) => `Analyze "${title}" from pricing and profitability perspectives. Cover unit economics, margin risk, and validation experiments.`,
    },
  ],
  "email-comms-assistant": [
    {
      title: "Draft reply",
      description: "Write a response for the current thread.",
      prompt: ({ title }) => `Draft a natural reply for "${title}". Include the other person's intent, any missing questions, and a shorter version.`,
    },
    {
      title: "Extract action items",
      description: "Summarize requests and next steps.",
      prompt: ({ title }) => `From "${title}", extract the sender's request, deadline, my action items, and what the reply should include.`,
    },
    {
      title: "Change reply tone",
      description: "Create formal, concise, and friendly versions.",
      prompt: ({ title }) => `Write three reply versions for "${title}": formal, concise, and friendly.`,
    },
  ],
  "roast-coach": [
    {
      title: "Roast this",
      description: "Find the weak points with blunt feedback.",
      prompt: ({ title }) => `Review "${title}" in roast-coach mode. Give a sharp one-line roast, the real issue underneath, weak assumptions, a smarter revision, and one next action.`,
    },
    {
      title: "Find self-deception",
      description: "Expose shaky logic and overconfidence.",
      prompt: ({ title }) => `Find where "${title}" may contain self-justification, unsupported confidence, or weaknesses other people would immediately notice. Turn it into actionable improvements.`,
    },
    {
      title: "Pre-embarrassment check",
      description: "Catch flaws before publishing.",
      prompt: ({ title }) => `Before publishing "${title}", identify embarrassing phrasing, flimsy claims, likely misunderstandings, and how to fix them.`,
    },
  ],
  "harsh-comment-simulator": [
    {
      title: "Simulate harsh comments",
      description: "Predict rough public reactions and fixes.",
      prompt: ({ title }) => `Simulate harsh public reactions to "${title}". For each reaction, explain the legitimate concern underneath and how to revise or respond.`,
    },
    {
      title: "Predict controversy",
      description: "Find likely attack surfaces.",
      prompt: ({ title }) => `Predict where "${title}" could be controversial, maliciously interpreted, or attacked. Suggest defensible responses and revisions.`,
    },
    {
      title: "Reply to hostile comments",
      description: "Draft calm responses to rough comments.",
      prompt: ({ title }) => `Create 5 types of harsh comments about "${title}" and write concise, non-defensive responses for each.`,
    },
  ],
};

export function createProfileSuggestionCards(input: ProfileSuggestionInput): ActionCard[] {
  const profile = input.profile;
  if (!profile || profile.id === "default") {
    return [];
  }

  const ko = input.locale.toLowerCase().startsWith("ko");
  const context = createSuggestionContext(input.currentTab, ko);
  if (profile.suggestedPrompts?.length) {
    return profile.suggestedPrompts.slice(0, 3).map((prompt, index) => ({
      id: `profile-${profile.id}-custom-${index + 1}`,
      title: createPromptTitle(prompt),
      description: ko ? "사용자가 설정한 추천 메시지" : "User-defined profile suggestion",
      kind: "prompt",
      prompt: interpolatePrompt(prompt, context),
    }));
  }
  const templates = (ko ? PROFILE_PROMPTS_KO : PROFILE_PROMPTS_EN)[profile.id] ?? createFallbackTemplates(profile.name, ko);
  return templates.slice(0, 3).map((template, index) => ({
    id: `profile-${profile.id}-${index + 1}`,
    title: template.title,
    description: template.description,
    kind: "prompt",
    prompt: template.prompt(context),
  }));
}

function createPromptTitle(prompt: string): string {
  const normalized = prompt.trim().replace(/\s+/gu, " ");
  return normalized.length <= 24 ? normalized : `${normalized.slice(0, 23).trimEnd()}…`;
}

function interpolatePrompt(prompt: string, context: ProfileSuggestionContext): string {
  return prompt
    .replaceAll("{title}", context.title)
    .replaceAll("{site}", context.siteLabel);
}

export function mergeProfileAndSiteSuggestionCards(
  profileCards: ActionCard[],
  siteCards: ActionCard[],
  limit: number,
): ActionCard[] {
  const seen = new Set<string>();
  const merged: ActionCard[] = [];
  for (const card of [...profileCards, ...siteCards]) {
    if (seen.has(card.id)) {
      continue;
    }
    seen.add(card.id);
    merged.push(card);
    if (merged.length >= limit) {
      break;
    }
  }
  return merged;
}

export function getSuggestionCardSource(card: Pick<ActionCard, "id">): SuggestionCardSource {
  return card.id.startsWith("profile-") ? "profile" : "site";
}

function createSuggestionContext(tab: OpenTabContext | null, ko: boolean): ProfileSuggestionContext {
  const title = normalizeTitle(tab?.title ?? (ko ? "현재 페이지" : "current page"));
  const siteLabel = getSiteLabel(tab?.url ?? "", ko);
  return {
    title,
    siteLabel,
    isYouTube: isYouTubeLikeUrl(tab?.url ?? ""),
    ko,
  };
}

function createFallbackTemplates(profileName: string, ko: boolean): ProfilePromptTemplate[] {
  return [
    {
      title: ko ? `${profileName}로 분석` : `Analyze as ${profileName}`,
      description: ko ? "선택한 프로필 관점으로 현재 맥락 분석" : "Analyze the current context with the selected profile.",
      prompt: ({ title }) =>
        ko
          ? `"${title}"를 ${profileName} 관점에서 분석하고, 핵심 요약, 중요한 포인트, 다음 액션을 제안해줘.`
          : `Analyze "${title}" from the perspective of ${profileName}. Summarize the key points, important details, and recommended next actions.`,
    },
  ];
}

function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+-\s+YouTube$/iu, "").trim() || "현재 페이지";
}

function getSiteLabel(url: string, ko: boolean): string {
  if (isYouTubeLikeUrl(url)) {
    return ko ? "현재 YouTube" : "the current YouTube page";
  }
  try {
    const hostname = new URL(url).hostname.replace(/^www\./iu, "");
    return hostname || (ko ? "현재 사이트" : "the current site");
  } catch {
    return ko ? "현재 사이트" : "the current site";
  }
}

function isYouTubeLikeUrl(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.replace(/^www\./iu, "");
    return hostname === "youtube.com" || hostname.endsWith(".youtube.com") || hostname === "youtu.be";
  } catch {
    return /youtube|youtu\.be/iu.test(url);
  }
}
