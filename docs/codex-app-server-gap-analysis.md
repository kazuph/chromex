# Codex App Server Gap Analysis

Last verified: 2026-04-22

## Sources

- Official README: `openai/codex` `codex-rs/app-server/README.md`
- Official Codex product updates:
  - `2026-04-16` `openai.com/index/codex-for-almost-everything/`
  - `2026-02-02` `openai.com/index/introducing-the-codex-app/`
- Official Codex issue context:
  - `2026-03-17` `openai/codex#14895`
- Local schema generated from the installed binary:
  - `codex --version` -> `codex-cli 0.122.0-alpha.13`
  - `codex app-server generate-ts --out /tmp/codex-app-schema`

## Implemented In The Extension

- `model/list`
  - Side panel model picker is now populated from app-server, not a hardcoded list.
- `thread/list`, `thread/read`, `thread/turns/list`
  - The panel now shows workspace-scoped Codex threads and can resume a server thread with reconstructed chat history.
- `turn/start`, `turn/steer`, `turn/interrupt`
  - Active turns now support stop and mid-turn steer from the composer.
- `turn/started`, `turn/plan/updated`, `turn/diff/updated`, `turn/completed`
  - Live turn status, plan, diff, and completion state now flow into the panel.
- `account/rateLimits/read`, `account/rateLimits/updated`
  - Rate-limit status is now visible in the top bar and kept up to date from notifications.
- `skills/list`, `app/list`
  - App-server skills and connected apps are now surfaced as structured prompt inputs.
- Built-in image generation/editing
  - The extension now resolves the built-in `imagegen` skill from `skills/list`, sends the current page image as a `localImage` input, and collects `imageGeneration` thread items back into an in-panel preview.
  - This matches the current Codex image workflow where ChatGPT-authenticated sessions can use built-in image generation without requiring `OPENAI_API_KEY`.
  - The `2026-03-17` GitHub issue reflects an older limitation. The `2026-04-16` product update supersedes that limitation for current Codex app users signed in with ChatGPT.
- Realtime voice recovery
  - `thread/realtime/start`, `thread/realtime/sdp`, transcript events, stop, and bounded automatic reconnect are wired through the bridge and side panel.
  - Explicit user stops and terminal auth/permission failures intentionally do not reconnect.
- `plugin/list`
  - Installed/enabled plugins from `plugin/list` are normalized into `plugin://name@marketplace` structured mentions and are available from the context view and the `@` picker.
- Structured `UserInput`
  - Prompt building now emits:
    - `text` with `text_elements: []`
    - `skill`
    - `mention`
    - `image`
    - `localImage`
  - Skill and app tokens are prefixed into the user text when needed, matching the README examples.

## Still Deliberately Out Of Scope Or Blocked

- Non-browser app-server features
  - Filesystem APIs, command-exec APIs, config mutation APIs, and marketplace/plugin installation flows are not surfaced in this Chrome panel because they are not part of the browser-side product scope.

## Practical Result

The Chrome extension is now aligned with the current public app-server surface for the browser-relevant interaction loop:

- authenticate
- list/select models
- open/resume/list threads
- send and steer turns
- interrupt turns
- stream messages, plan, and diff
- inspect rate limits
- attach app-server skills and apps
- attach installed app-server plugins as structured mentions
- send multimodal page context with local images
