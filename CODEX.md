# Chromex

- This workspace is a multi-package TypeScript project with `packages/shared`, `packages/bridge`, `packages/native-host`, and `packages/extension`.
- Keep browser-side features non-destructive. Image edits should stay in preview/overlay flows unless the user explicitly asks for export or upload behavior.
- When you change the extension-to-bridge contract, update the shared types, the bridge router, and the extension background message handlers together.
- Public release identity is fixed: publish only to `GENEXIS-AI/chromex` under **GenexisAI CHOI**. Never publish or release Chromex from `pomcro`.
- `0.1.1` and later use normal open-source history. Do not recreate public releases as fresh single-commit repositories unless a security incident requires history replacement.
- Routine public commits, pushes, and PRs should follow `RELEASE.md`: branch from `main`, keep focused commits, verify CI, and tag releases from verified `main`.
- Never push this development workspace directly to GitHub. Public release archives must still be created from `npm run package:public` output.
- Public exports must exclude internal `docs/`, `.codex/`, `.codex-sidepanel/`, `CODEX.md`, `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, `MEMORY.md`, `*harness*.md`, build output, local backups, generated images, credentials, signing keys, native-host generated manifests, and local user paths.
- If release packaging rules change, update `scripts/package-public-release.mjs`, `scripts/audit-git-history.mjs`, `packages/extension/test/open-source-hygiene.test.ts`, `RELEASE.md`, and this file together. Public README files should stay focused on user-facing installation, privacy, and packaging details.
- When user-facing README content changes, update `README.md`, `README.ko.md`, `README.ja.md`, and `README.zh-CN.md` together, including language badges, install links, release asset names, privacy/security claims, and troubleshooting guidance.
- Never hardcode user-facing UI copy, action-card labels, suggested prompts, runtime prompt templates, or prompt language labels in feature helpers. Add them to `packages/extension/src/sidepanel/i18n.ts` and the sidepanel i18n generation path first, then consume them through `getUiStrings(...)` so the selected UI language controls both visible text and sent prompts. When a prompt must name the response language, use the selected locale's localized/native label instead of English-only names such as `Korean` or `Japanese`.
- Preferred verification commands:
  - `npm run test`
  - `npm run typecheck`
  - `npm run build`
