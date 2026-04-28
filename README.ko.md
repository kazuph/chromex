# Chromex

[![CI](https://github.com/GENEXIS-AI/chromex/actions/workflows/ci.yml/badge.svg)](https://github.com/GENEXIS-AI/chromex/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![English](https://img.shields.io/badge/readme-English-111827.svg)](./README.md)
[![한국어](https://img.shields.io/badge/readme-한국어-2563eb.svg)](./README.ko.md)

Chromex는 Chrome과 Codex를 로컬 네이티브 브리지로 연결하는 Chrome MV3 사이드 패널 어시스턴트입니다. 현재 페이지, 선택한 탭, 업로드 파일, 음성 입력, 이미지, 브라우저 작업을 처리하면서 인증 정보는 확장 프로그램 저장소 밖에 두도록 설계했습니다.

배포 주체: **GenexisAI CHOI**.

## 주요 기능

- 현재 웹페이지, 선택한 열린 탭, 스크린샷, 업로드 파일, PDF, Office 파일, 이미지, 브라우저 기록을 사용자가 요청할 때만 바탕으로 대화합니다.
- 페이지, 유튜브 영상, 뉴스 기사, 리서치 페이지, PDF, arXiv 논문을 요약하고 비교합니다.
- Codex 이미지 워크플로우를 통해 이미지를 편집하거나 생성하고 결과물을 로컬에서 관리합니다.
- 음성 전사, 라이브 음성 모드, 페이지별 추천 질문, 사용자 프로필, 선택형 Codex 스킬을 지원합니다.
- Chrome content script 경계를 통해 브라우저 제어 워크플로우를 실행하고 페이지 안에 작업 상태를 표시합니다.

## 5분 설치

일반 사용자 설치:

1. 최신 GitHub Release를 엽니다.
2. `chromex-*-unpacked-extension-*.zip`을 다운로드합니다.
3. 압축을 풉니다.
4. Chrome에서 `chrome://extensions`를 엽니다.
5. **개발자 모드**를 켭니다.
6. **압축해제된 확장 프로그램을 로드합니다**를 선택하고 압축을 푼 `chromex-extension` 폴더를 선택합니다.
7. Chrome 툴바 또는 사이드 패널에서 Chromex를 열고 온보딩을 진행합니다.

개발자 소스 설치:

```bash
git clone https://github.com/GENEXIS-AI/chromex.git
cd chromex
npm install
npm run build
node scripts/install-native-host.mjs
```

그다음 `chrome://extensions`에서 **개발자 모드**를 켜고 **압축해제된 확장 프로그램을 로드합니다**로 다음 폴더를 선택합니다.

```text
packages/extension/dist
```

## 런타임 경계

Chromex는 다음 경계로 동작합니다.

```text
Chrome Extension -> Native Messaging Host -> Local Bridge -> codex app-server
```

소스 구조는 다음과 같습니다.

- `packages/extension`: Chrome MV3 사이드 패널 확장 프로그램
- `packages/bridge`: Codex app-server와 멀티모달 워크플로우를 처리하는 로컬 브리지
- `packages/native-host`: Chrome Native Messaging 릴레이
- `packages/shared`: 공유 타입, 정책, 프로필, 헬퍼

## 언어 지원

Chromex는 기본적으로 브라우저 언어를 자동으로 따릅니다. 사용자는 **설정 > 일반 > 앱 UI 언어**에서 언어를 직접 선택할 수 있습니다.

확장 프로그램은 영어, 한국어, 일본어, 중국어, 아랍어, 프랑스어, 독일어, 스페인어, 포르투갈어, 힌디어, 베트남어, 태국어, 터키어, 우크라이나어 등 Chrome 호환 로케일을 `_locales`로 제공합니다. 모델 응답은 사용자가 다른 언어를 요청하지 않는 한 선택된 UI 언어를 따르도록 지시됩니다.

## 보안 및 개인정보 기본값

- 확장 프로그램은 원본 OpenAI API 키, OAuth 토큰, ChatGPT 세션 토큰을 Chrome extension storage에 저장하지 않습니다.
- Codex OAuth / ChatGPT 로그인은 로컬 Codex app-server 흐름을 통해 처리합니다.
- API 키 로그인은 선택형 로컬 fallback이며, 사용자 확인 없이 자동 전환하지 않습니다.
- 페이지 내용, 탭 데이터, 스크린샷, 브라우저 기록, 마이크 입력, 브라우저 조작은 사용자가 요청한 워크플로우에서만 사용합니다.
- `history`, `tabs`, 화면 캡처, 마이크, 사이트 접근 권한은 필요한 기능을 사용할 때만 요청합니다.
- 대화 기록은 기본적으로 세션 전용입니다. 로컬 기기 저장은 사용자가 직접 켜야 합니다.
- Native host 자식 프로세스와 워크스페이스 훅은 축소된 환경 변수 allowlist로 실행됩니다.
- 생성 이미지 원본, 임시 업로드, 진단 로그는 로컬 브리지가 처리합니다.

수정 빌드를 배포하기 전 [SECURITY.md](./SECURITY.md)와 [PRIVACY.md](./PRIVACY.md)를 확인하세요.

## 기능

- 채팅 중심의 MV3 사이드 패널
- 페이지, 파일, 이미지, 기록, 음성, 브라우저 제어 요청 자동 라우팅
- 여러 열린 탭을 선택할 수 있는 `@` 피커
- 프로필 선택을 위한 `/` 피커
- 이미지, 텍스트, PDF, DOCX, CSV, TSV, XLSX, XLSM 첨부
- DOM, vision, hybrid, site adapter 기반 읽기 전략
- 유튜브, 뉴스, 리서치, 메일, 협업 도구, 노트, 업무 관리, 쇼핑, 여행, 한국 업무 서비스에 맞춘 추천 질문
- 현재 재생 시간 컨텍스트와 이동 액션을 지원하는 YouTube adapter
- 업로드 이미지, 페이지 이미지, 현재 화면 캡처 기반 비파괴 이미지 편집
- 코드블록, 테이블, 링크, 복사 컨트롤을 포함한 Markdown 렌더링
- 사용자가 활성화한 경우에만 로드되는 로컬 `.codex/skills/*/SKILL.md` 기반 선택형 Codex 스킬

## 개발

```bash
npm install
npm run typecheck
npm run test
npm run build
npm run release:audit
```

선택형 브라우저 smoke test:

```bash
npm run smoke
```

호환 브라우저가 없으면 Playwright Chromium 런타임을 설치합니다.

```bash
npm run smoke:install-browser
```

빌드 결과는 다음 폴더에 생성됩니다.

```text
packages/extension/dist
```

## Chrome Web Store 패키지

업로드 가능한 확장 프로그램 zip을 생성합니다.

```bash
npm run package:webstore
```

이 명령은 확장 프로그램을 다시 빌드하고, `packages/extension/dist`를 스테이징한 뒤, Web Store 업로드에 허용되지 않는 `manifest.key`, source map, 로컬 빌드 메타데이터를 제거하고 `output/chrome-web-store/`에 zip을 생성합니다.

## 공개 소스 릴리즈

정제된 공개 릴리즈 아티팩트를 생성합니다.

```bash
npm run package:public
```

`output/public-release/` 아래에 두 아티팩트가 생성됩니다.

- `chromex-*-public-source-*.zip`: GitHub 공개용 소스 아카이브
- `chromex-*-unpacked-extension-*.zip`: Chrome 개발자 모드에서 바로 로드할 수 있는 패키지. 압축 해제 후 **압축해제된 확장 프로그램을 로드합니다**에서 `chromex-extension` 폴더를 선택합니다.

## 문제 해결

- **Native host missing or forbidden**: `npm run build` 후 `node scripts/install-native-host.mjs`를 실행하고 `chrome://extensions`에서 확장 프로그램을 다시 로드한 뒤 Chromex 온보딩/시스템 상태를 확인하세요.
- **모델 목록이 로드되지 않음**: native bridge 연결을 먼저 확인한 뒤 app-server 기반 로그인 흐름으로 로그인하세요.
- **페이지 컨텍스트를 사용할 수 없음**: 대상 탭에서 Chromex를 열거나 워크플로우가 요청하는 Chrome 사이트 권한을 승인하세요.
- **Chrome에 이전 UI가 계속 보임**: `npm run build`를 실행하고 확장 프로그램 카드를 다시 로드한 뒤 Chrome이 `packages/extension/dist`를 로드하는지 확인하세요.
- **브라우저 smoke test가 브라우저 없음으로 실패함**: `npm run smoke:install-browser` 후 `npm run smoke`를 실행하세요.

## 라이선스

MIT. [LICENSE](./LICENSE)를 참고하세요.
