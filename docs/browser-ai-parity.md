# Browser AI Parity Plan

Last updated: 2026-04-23

## Public References

- Google Chrome Help: [Use Gemini in Chrome](https://support.google.com/chrome/answer/16283624)
- OpenAI: [ChatGPT Atlas](https://chatgpt.com/atlas/)
- Perplexity: [Comet Browser](https://www.perplexity.ai/comet)
- OpenAI Codex: [`codex app-server` README](https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md)
- Open source browser-agent reference: [nanobrowser](https://github.com/nanobrowser/nanobrowser)

## Product Shape

This extension is designed as a Codex-powered Chrome side-panel assistant, not a standalone hosted web app.

The user-facing flow mirrors the public browser-AI pattern:

1. The side panel opens as the main chat surface.
2. The current tab is attached by default when Chrome allows page access.
3. `@` selects open tabs and explicit context only.
4. `/` selects profile or workspace skills.
5. The router uses Codex app-server planning to decide whether the request needs DOM, vision, hybrid page context, selected tabs, uploaded files, or image editing.
6. YouTube and future site adapters provide domain-specific context and suggested questions.

## Security Boundary

Production traffic remains:

`Chrome extension -> native messaging host -> local bridge -> codex app-server`

The extension does not connect directly to the app-server WebSocket transport because the public app-server README marks WebSocket transport as experimental and unsupported for production. The stable local transport is stdio.

Codex OAuth/ChatGPT managed login is owned by `codex app-server`:

- the side panel calls `account.login.start`
- the bridge requests `type: "chatgpt"`
- the extension opens the returned `authUrl`
- tokens stay in Codex-managed local storage, not in `chrome.storage`
- API key login remains a fallback and is never persisted by the extension

## Parity Mapping

| Browser AI behavior | Implementation |
| --- | --- |
| Gemini-style current-tab context | `current-page` is attached by default for normal prompts. |
| Gemini-style open tab insertion | `@` opens an in-composer tab picker capped by user selection. |
| Atlas-style page-aware sidebar | DOM and visible-screen context are normalized into `PageContextEnvelope`. |
| Atlas-style controlled actions | Browser mutations and image overlays pass through harness permission gates. |
| Comet-style delegated workflows | A Codex route planner emits an agentic plan before prompt execution. |
| Comet/nanobrowser-style status visibility | Routing, context collection, Codex waiting, voice, and image edit states stream as UI status events. |
| YouTube-specific assistance | The YouTube adapter supplies video metadata, current timestamp, chapters, and tailored suggested questions. |

## YouTube Behavior

When the active tab is YouTube:

- the adapter collects title, channel, description, playback time, transcript availability, and chapter titles
- read strategy becomes `adapter`, with screenshot fallback when visual evidence is needed
- the side panel shows suggested questions generated from actual adapter payload:
  - video summary
  - current moment explanation
  - chapter notes
  - blog/thread draft
- selected question cards fill the composer with a concrete prompt instead of forcing the user to manually design the request
- timestamp seek actions remain available for cited moments

## Agentic Routing

The router is intentionally semantic:

- it asks Codex to return a JSON plan
- it does not depend on a multilingual keyword list
- it resolves target first, then context
- visible page image edits become `page-image` workflows
- uploaded image edits become `uploaded-image` workflows only when the planner identifies the uploaded file as the target
- page plus file workflows preserve both context planes

If the router is unavailable, fallback mode avoids unsafe semantic guessing and uses only explicit attachments plus the default current-page baseline.

## Open Source Release Posture

- no personal account, token, or path is required in source
- native host path detection is automatic
- optional permissions are requested at runtime
- build outputs and generated native manifests are excluded from source control
- the public extension key is metadata only and exists to keep native messaging origin stable during unpacked installs
- all competitor and open-source references are public documentation or public repositories
