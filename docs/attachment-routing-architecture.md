# Attachment Routing Architecture

## Goal

Keep the side panel chat-first while supporting:

- current-page context
- uploaded images
- uploaded documents and spreadsheets
- explicit routing between DOM-heavy, vision-heavy, and mixed requests

The implementation follows a split that is common across public agent products:

- page context is an explicit browser context source
- uploaded images are sent as multimodal model inputs
- uploaded non-image files are parsed locally into compact text context

## Why It Works This Way

### Codex app-server

`codex app-server` exposes structured turn inputs for:

- `text`
- `image`
- `localImage`
- `skill`
- `mention`

That means uploaded images map cleanly to `localImage`, but arbitrary binary files are not first-class turn inputs in the same way. For this extension, non-image uploads are parsed inside the local bridge and injected as text sections instead of being passed through as opaque blobs.

Reference:

- [OpenAI Codex app-server README](https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md)
- [OpenAI Codex TypeScript SDK README](https://github.com/openai/codex/blob/main/sdk/typescript/README.md)

### Claude / Anthropic public model behavior

Anthropic documents two patterns that are relevant here:

- images remain native multimodal inputs
- PDFs and other files are model/file features with dedicated handling, not just arbitrary raw bytes pasted into prompts

That supports the same design principle used here: file type decides transport and preprocessing.

Reference:

- [Anthropic Files API](https://docs.anthropic.com/en/docs/build-with-claude/files)
- [Anthropic PDF support](https://docs.anthropic.com/en/docs/build-with-claude/pdf-support)
- [Anthropic Claude Code slash commands](https://docs.anthropic.com/en/docs/claude-code/slash-commands)
- [Anthropic Claude Code hooks](https://docs.anthropic.com/en/docs/claude-code/hooks)

### Other public OSS patterns

Two public patterns show up repeatedly:

- explicit context providers instead of invisible auto-context
- images handled separately from generic file attachments

Continue uses typed context providers like `@Files`, `@Terminal`, and active-file context. Open WebUI treats images differently from uploaded files and exposes file metadata separately for downstream tools. This extension now follows the same split.

Reference:

- [Continue Chat context selection](https://docs.continue.dev/ide-extensions/chat/context-selection)
- [Continue How chat works](https://docs.continue.dev/ide-extensions/chat/how-it-works)
- [Open WebUI file management](https://docs.openwebui.com/features/chat-conversations/data-controls/files/)
- [Open WebUI reserved file arguments](https://docs.openwebui.com/features/plugin/development/reserved-args/)

## Implemented Policy

### Routing tasks

The shared router now classifies requests into:

- `general`
- `document-analysis`
- `visual-analysis`
- `image-edit`
- `comparison`

It considers:

- question text
- selected model
- current page sources
- uploaded file kinds
- read strategy override

It can reroute to:

- the `image-editor` profile
- an image-capable model
- a stronger page read strategy such as `hybrid`

### Current page plus uploaded files

When both are present, the prompt now states a strict priority rule:

- current page = live browser state
- uploaded files = explicit user artifacts

If the request is destructive image editing and both the current page image and an uploaded image are present, the routing notes tell Codex to clarify the target if the user did not identify it.

### File transport policy

- uploaded images -> `localImage`
- text / markdown / code -> UTF-8 extraction
- PDF -> bridge-side text extraction
- DOCX -> bridge-side raw text extraction
- CSV / TSV / XLSX / XLSM -> compact table summary
- unsupported binary -> metadata-only note

### Safety limits

To stay below Chrome extension/native messaging limits and to avoid accidental data sprawl:

- uploads are not persisted with saved chats
- selection is capped by file count
- each file is capped by byte size
- total upload bytes are capped
- extracted text is truncated before prompt assembly

Reference:

- [Chrome Native Messaging](https://developer.chrome.com/docs/extensions/mv3/nativeMessaging)
- [Chrome Message Passing](https://developer.chrome.com/docs/extensions/mv3/messaging)

## Code Map

- Shared routing: [packages/shared/src/prompt-routing.ts](../packages/shared/src/prompt-routing.ts)
- Extension upload policy: [packages/extension/src/sidepanel/file-attachments.ts](../packages/extension/src/sidepanel/file-attachments.ts)
- Sidepanel UI integration: [packages/extension/src/sidepanel/index.ts](../packages/extension/src/sidepanel/index.ts)
- Background routing integration: [packages/extension/src/background/index.ts](../packages/extension/src/background/index.ts)
- Bridge file parsing: [packages/bridge/src/file-attachments.ts](../packages/bridge/src/file-attachments.ts)
- Prompt assembly: [packages/bridge/src/prompt.ts](../packages/bridge/src/prompt.ts)
- Codex turn input integration: [packages/bridge/src/codex-plane.ts](../packages/bridge/src/codex-plane.ts)

