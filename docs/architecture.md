# Architecture

## Runtime Graph

`Chrome Side Panel UI -> background service worker -> native messaging host -> local bridge -> codex app-server`

The current voice UX uses Codex app-server realtime transport. The side panel creates the microphone-backed WebRTC offer and renders live transcript events; the bridge owns app-server `thread/realtime/start`, `thread/realtime/stop`, SDP answer forwarding, transcript forwarding, and lifecycle hooks. Image editing stays on the Codex side of the boundary by driving Codex's built-in `image_gen` capability through `codex app-server`.

Authentication is exposed in the product as Codex OAuth. In implementation terms, the extension asks the bridge to call app-server `account/login/start` with `type: "chatgpt"` and opens the returned authorization URL. The extension never stores ChatGPT tokens or raw API keys.

## Workspace Harness

The bridge now includes a filesystem-based workspace harness modeled after the public Claude Code settings and memory hierarchy.

- `CODEX.md` and `.codex/CODEX.md` provide durable workspace instructions.
- `.codex/rules/**/*.md` adds scoped rules that can target domains and profile ids.
- `.codex/skills/*/SKILL.md` and `.codex/commands/*.md` become slash shortcuts in the side panel.
- `.codex/settings.json` and `.codex/settings.local.json` define:
  - permission mode
  - allow/ask/deny operation rules
  - optional command hooks for lifecycle events

The side panel reads the resulting snapshot at startup and shows the active workspace root, permission mode, hook count, and available workspace shortcuts.

## Core Planes

### CodexControlPlane

- owns Codex authentication state
- opens or resumes threads
- starts turns with profile-driven prompt scaffolding
- enriches turns with workspace instructions and scoped rules from the harness
- streams `item/agentMessage/delta`, `item/completed`, and `turn/completed` back to the extension
- attaches normalized page context plus multimodal image inputs

### ImagePlane

- receives the clicked image or visible-tab capture from the extension
- creates an ephemeral Codex thread and routes the edit through the built-in `image_gen` capability
- returns a preview ref for side-by-side or overlay preview flows

### VoicePlane

- represented in the bridge as a separate session state machine
- starts app-server `thread/realtime/start` with `transport: { type: "webrtc", sdp }`
- forwards `thread/realtime/sdp`, transcript deltas, transcript completions, errors, and close events to the side panel
- uses a bounded side-panel reconnect loop for unexpected realtime drops, but never reconnects explicit user stops or terminal auth/permission failures
- runs voice lifecycle hooks without storing microphone audio or long-lived credentials in extension storage

### BrowserActionPlane

Browser actions are intentionally not implemented by embedding Playwright or a desktop Computer Use controller inside the extension. Those runtimes are useful for tests or local desktop agents, but they are too broad for a public Chrome extension because they can automate outside the currently viewed page.

Instead, the extension uses a constrained DOM action harness:

1. The content script collects a visible interactive-element snapshot from the active tab.
2. The bridge asks `codex app-server` to create an ephemeral JSON-only action plan.
3. The model may plan only `click`, `fill`, `select`, `scroll`, `focus`, or `submit`.
4. The planner may target only element refs/selectors present in the DOM snapshot.
5. The background service worker applies the normal browser-action permission gate.
6. The content script executes the bounded DOM actions without arbitrary JavaScript evaluation.

The planner refuses irreversible actions such as purchases, payments, account changes, public posts, sending messages/emails, and deletes. Those cases remain draft-or-confirm workflows rather than automatic site mutations.

## Context Model

All site and page extraction is normalized into `PageContextEnvelope`:

- `metadata`
- `selectionText`
- `domSummary`
- `visionAssets`
- `adapterPayload`
- `privacyFlags`

The extension decides the `ReadStrategy` using page heuristics:

- `dom`
- `vision`
- `hybrid`
- `adapter`

## Vision Attachment Path

The important implementation detail is that screenshot captures are not left as data URLs inside prompt text.

1. The extension captures the visible tab with `chrome.tabs.captureVisibleTab()`.
2. The screenshot data URL is stored in `visionAssets`.
3. The bridge converts data URLs into temporary local files.
4. `codex app-server` receives those files as `localImage` inputs on `turn/start`.
5. Remote page images are forwarded as `image` URL inputs when possible.

This keeps the DOM-plus-vision hybrid route actually multimodal.

## Site Adapters

The generic extractor and site-specific adapters are intentionally separate.

The first implemented adapter is YouTube:

- page/video metadata
- current playback time
- chapter-aware suggested questions
- timestamp seek action back into the page

The extension can grow additional adapters for productivity, shopping, or document sites without replacing the generic extraction pipeline.

## Permissions Model

Baseline permissions are installed up front:

- `sidePanel`
- `activeTab`
- `scripting`
- `storage`
- `contextMenus`
- `nativeMessaging`

Feature-gated permissions stay optional:

- `history`
- `tabs`
- `<all_urls>` host access

Inside the product, extension-side actions now also pass through a workspace harness permission layer:

- `default`: asks before risky browsing actions
- `acceptBrowserActions`: auto-allows browser mutations
- `plan`: blocks mutations and multimodal write actions
- `auto`: allows actions unless an explicit deny rule matches

The extension enforces these policies for:

- history search
- image editing
- voice session start
- page navigation commands
- constrained DOM actions on the active page
- in-page image overlay preview

## Current Scope

Included now:

- side panel scaffolding
- profile templates
- open-tabs/history attachments
- YouTube adapter
- Codex OAuth/ChatGPT login handoff
- API key fallback
- image editing overlay preview
- Codex built-in image generation/editing via ChatGPT login
- Claude Code-style workspace memory, rules, shortcuts, hooks, and permission modes
- Codex app-server realtime voice session lifecycle
- app-server-planned constrained DOM actions for the active tab

Deferred for a later pass:

- arbitrary cross-site write-back automation
- project-memory persistence similar to ChatGPT Projects
