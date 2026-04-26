# Claude Code Harness Audit

Checked on April 22, 2026 against public Anthropic sources:

- [Claude Code GitHub repository](https://github.com/anthropics/claude-code)
- [Claude Code settings](https://code.claude.com/docs/en/settings)
- [Hooks reference](https://code.claude.com/docs/en/hooks)
- [How Claude remembers your project](https://code.claude.com/docs/en/memory)
- [Slash Commands in the SDK](https://code.claude.com/docs/en/agent-sdk/slash-commands)
- [Configure permissions](https://code.claude.com/docs/en/permissions)
- [Common workflows](https://code.claude.com/docs/en/common-workflows)

## What Claude Code public docs emphasize

- Hierarchical filesystem configuration with user, project, and local overrides.
- Persistent workspace memory loaded from `CLAUDE.md` and scoped rules under `.claude/rules/`.
- Filesystem-defined slash commands and skills.
- Hook events around session start, prompt submit, tool execution, and completion.
- Permission modes and allow/ask/deny rules that are separable from the model itself.

## Gaps we had before this pass

- Browser UX was strong, but workspace-level reproducibility was weak because most shortcuts and settings lived in Chrome storage.
- There was no project-memory equivalent to `CLAUDE.md`, so prompt behavior was not anchored to repo-local instructions.
- There was no hook system for prompt, image, or voice lifecycle events.
- Browser actions were governed only by panel toggles, not by a declarative workspace permission policy.

## Implemented in this pass

- Added a bridge-side workspace harness runtime that loads:
  - `CODEX.md`
  - `.codex/CODEX.md`
  - `.codex/CODEX.local.md`
  - `.codex/rules/**/*.md`
  - `.codex/skills/*/SKILL.md`
  - `.codex/commands/*.md`
  - `.codex/settings.json`
  - `.codex/settings.local.json`
- Added prompt enrichment so workspace memory and scoped rules are appended to Codex turns before `turn/start`.
- Added command hooks for:
  - `SessionStart`
  - `InstructionsLoaded`
  - `PromptSubmit`
  - `PromptComplete`
  - `ImageEditStart`
  - `ImageEditComplete`
  - `VoiceSessionStart`
  - `VoiceSessionStop`
- Added a shared permission resolver with `default`, `acceptBrowserActions`, `plan`, and `auto` modes plus allow/ask/deny pattern rules.
- Enforced permission policy in the extension for:
  - history search
  - image edit requests
  - voice session startup
  - page navigation commands
  - in-page image overlay preview
- Added a workspace harness panel summary so the user can see which root, mode, hooks, rules, and shortcuts are active.
- Seeded this repository with a minimal `CODEX.md` and `.codex/` configuration.

## Remaining deltas

- Claude Code’s public hook system supports many more events, prompt hooks, HTTP hooks, and tool-level interception. This implementation currently supports command hooks for the extension-specific lifecycle only.
- Claude Code can lazily load subdirectory-scoped rules when particular files are opened. Our extension uses domain/profile scoping instead, because the main task domain is browser context rather than source-file context.
- Claude Code exposes richer interactive permission UIs such as `/permissions`; our side panel currently uses inline confirmation prompts when a workspace rule resolves to `ask`.

## Why these changes matter

The product already had a competitive side-panel experience. The missing layer was the harness: durable repo-local behavior, repeatable shortcuts, declarative permission policy, and workflow automation that survives across sessions. That is the layer this pass added.
