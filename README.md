# Chromex

[![CI](https://github.com/GENEXIS-AI/chromex/actions/workflows/ci.yml/badge.svg)](https://github.com/GENEXIS-AI/chromex/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![English](https://img.shields.io/badge/readme-English-111827.svg)](./README.md)
[![한국어](https://img.shields.io/badge/readme-한국어-2563eb.svg)](./README.ko.md)

Chromex is a Chrome MV3 side-panel assistant that connects Chrome to Codex through a local native bridge. It helps users work with the current page, selected tabs, uploaded files, voice input, images, and browser workflows while keeping credentials out of extension storage.

Published by **GenexisAI CHOI**.

![Chromex browser side-panel assistant](./assets/chromex-hero.png)

## What It Does

- Chat with the current webpage, selected open tabs, screenshots, uploaded files, PDFs, Office files, images, and browser history when requested.
- Summarize and compare page content, YouTube videos, news articles, research pages, PDFs, and arXiv papers.
- Edit or generate images through Codex image workflows with local output handling.
- Use voice transcription, live voice mode, page-aware suggestions, custom profiles, and optional Codex skills.
- Run browser-control workflows through Chrome content scripts with visible in-page activity indicators.

## Install In 5 Minutes

Fastest path for users:

1. Open the latest GitHub Release.
2. Download `chromex-*-unpacked-extension-*.zip`.
3. Unzip it.
4. Open `chrome://extensions`.
5. Enable **Developer mode**.
6. Select **Load unpacked** and choose the unzipped `chromex-extension` folder.
7. Open Chromex from the Chrome toolbar or side panel and follow onboarding.

Developer source install:

```bash
git clone https://github.com/GENEXIS-AI/chromex.git
cd chromex
npm install
npm run build
node scripts/install-native-host.mjs
```

Then open `chrome://extensions`, enable **Developer mode**, select **Load unpacked**, and choose:

```text
packages/extension/dist
```

## Runtime Boundary

Chromex uses this boundary:

```text
Chrome Extension -> Native Messaging Host -> Local Bridge -> codex app-server
```

The source tree is organized as:

- `packages/extension`: Chrome MV3 side-panel extension
- `packages/bridge`: local bridge daemon for Codex app-server and multimodal workflows
- `packages/native-host`: Chrome Native Messaging relay
- `packages/shared`: shared types, policies, profiles, and helpers

## Language Support

Chromex follows the browser language automatically by default. Users can also choose a language in **Settings > General > App UI language**.

The extension ships Chrome `_locales` entries for English, Korean, Japanese, Chinese, Arabic, French, German, Spanish, Portuguese, Hindi, Vietnamese, Thai, Turkish, Ukrainian, and many other Chrome-compatible locales. Model responses are instructed to follow the selected UI language unless the user asks for another language.

## Security And Privacy Defaults

- The extension does not store raw OpenAI API keys, OAuth tokens, or ChatGPT session tokens in Chrome extension storage.
- Codex OAuth / ChatGPT login is handled through the local Codex app-server flow.
- API-key login is an optional local fallback and is never used automatically without user confirmation.
- Page content, tab data, screenshots, browser history, microphone input, and browser actions are used only for user-requested workflows.
- `history`, `tabs`, screen capture, microphone, and site access are requested only when a feature needs them.
- Conversation history is session-only by default. Persistent local chat history is opt-in.
- Native-host child processes and workspace hooks run with a reduced environment allowlist.
- Generated image originals, temporary uploads, and diagnostics are handled by the local bridge.

Read [SECURITY.md](./SECURITY.md) and [PRIVACY.md](./PRIVACY.md) before publishing or deploying a modified build.

## Features

- Persistent MV3 side panel with chat-first UX.
- Automatic routing for page, file, image, history, voice, and browser-control requests.
- `@` picker for selecting one or more open tabs.
- `/` picker for profile selection.
- Attachments for images, text, PDF, DOCX, CSV, TSV, XLSX, and XLSM.
- Read strategy policy for DOM, vision, hybrid, and site-adapter workflows.
- Site-aware suggestions for YouTube, news, research, mail, collaboration, notes, task tools, shopping, travel, and Korean work services.
- YouTube adapter with current timestamp context and seek actions.
- Non-destructive image editing for uploaded images, page images, or visible screen captures.
- Markdown rendering with code blocks, tables, links, and copy controls.
- Optional Codex skills loaded from a user's local `.codex/skills/*/SKILL.md` only when enabled.

## Development

```bash
npm install
npm run typecheck
npm run test
npm run build
npm run release:audit
```

Optional browser smoke test:

```bash
npm run smoke
```

If no compatible browser exists, install the Playwright Chromium runtime:

```bash
npm run smoke:install-browser
```

The built extension is emitted to:

```text
packages/extension/dist
```

## Chrome Web Store Package

Create an upload-ready extension zip:

```bash
npm run package:webstore
```

The command rebuilds the extension, stages `packages/extension/dist`, removes the unpacked-install `manifest.key`, strips source maps and local build metadata, validates the zip, and writes the package to `output/chrome-web-store/`.

## Public Source Release

Create sanitized public release artifacts:

```bash
npm run package:public
```

This writes two artifacts under `output/public-release/`:

- `chromex-*-public-source-*.zip`: source archive for GitHub publication.
- `chromex-*-unpacked-extension-*.zip`: ready-to-unzip Chrome Developer Mode package. After unzip, select the `chromex-extension` folder in **Load unpacked**.

## Release Management

Chromex uses normal open-source release history from `0.1.1` onward. Versioning, pull request flow, and release checklist are documented in [RELEASE.md](./RELEASE.md).

## Troubleshooting

- **Native host missing or forbidden**: run `npm run build`, then `node scripts/install-native-host.mjs`, reload the extension in `chrome://extensions`, and check Chromex onboarding/system status.
- **Model list does not load**: confirm the native bridge is connected, then sign in through the app-server-backed login flow.
- **Page context is unavailable**: open Chromex from the target tab or approve the Chrome site permission prompt when the workflow requests access.
- **Chrome still shows old UI**: run `npm run build`, reload the extension card, and confirm Chrome is loading `packages/extension/dist`.
- **Browser smoke test fails because no browser exists**: run `npm run smoke:install-browser`, then `npm run smoke`.

## License

MIT. See [LICENSE](./LICENSE).
