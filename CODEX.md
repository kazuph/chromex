# Chromex

- This workspace is a multi-package TypeScript project with `packages/shared`, `packages/bridge`, `packages/native-host`, and `packages/extension`.
- Keep browser-side features non-destructive. Image edits should stay in preview/overlay flows unless the user explicitly asks for export or upload behavior.
- When you change the extension-to-bridge contract, update the shared types, the bridge router, and the extension background message handlers together.
- Preferred verification commands:
  - `npm run test`
  - `npm run typecheck`
  - `npm run build`
