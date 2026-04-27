# Open-Source Release Checklist

Use this before publishing a public repository, creating a release archive, or accepting outside contributions.

## Backup

Create a source-only backup outside the repository before release work:

```bash
mkdir -p "$HOME/Desktop/chromex-backups"
tar \
  --exclude='./node_modules' \
  --exclude='./packages/*/node_modules' \
  --exclude='./packages/*/dist' \
  --exclude='./output' \
  --exclude='./.codex-sidepanel' \
  --exclude='./__load_extension__' \
  --exclude='./__load_extension__.crx' \
  --exclude='./__load_extension__.pem' \
  --exclude='./*.log' \
  --exclude='./tmp-*' \
  -czf "$HOME/Desktop/chromex-backups/chromex-source-$(date +%Y%m%d-%H%M%S).tar.gz" \
  .
```

Restore into a separate directory, never over the working tree:

```bash
mkdir -p /tmp/chromex-restore
tar -xzf "$HOME/Desktop/chromex-backups/<archive>.tar.gz" -C /tmp/chromex-restore
```

## Source-Control Hygiene

- Keep generated images, native-host manifests, unpacked-extension build output, `.pem`, `.crx`, logs, and local app data untracked.
- Keep `.codex/settings.local.json` local-only.
- Keep the committed extension manifest key public-only. Do not commit Chrome Web Store signing material.
- Do not commit `OPENAI_API_KEY`, ChatGPT session tokens, native app-server auth files, or generated image originals.
- Review every new file with `rg --files -g '!node_modules' -g '!packages/*/dist'` before publishing.
- Run `npm run release:audit` before each public push.

## Verification

Run these commands from the repository root:

```bash
npm run typecheck
npm run test
npm run build
npm run release:audit
npm run package:webstore
npm audit --audit-level=high --omit=dev
```

`npm run package:webstore` rebuilds the extension before packaging, removes the public unpacked-install manifest key from the staged copy, and validates that generated metadata, source maps, private keys, environment files, and source-only image assets are not present in the Chrome Web Store zip.

The browser smoke test is optional for local release verification because it launches a real Chromium profile:

```bash
npm run smoke
```

CI should run the same checks on macOS, Linux, and Windows before a public release is tagged.

For platform compatibility, verify that native-host installation, Codex binary discovery, generated-image output, diagnostics logs, and API-key fallback secrets all resolve to per-user OS locations rather than hard-coded developer paths.

## Runtime Boundary

- Extension code talks to Chrome APIs and the native messaging host only.
- The native host relays framed JSON and does not own product logic.
- The bridge owns Codex app-server sessions, account state, filesystem temp files, file parsing, image outputs, and secret-adjacent logic.
- OAuth/ChatGPT login and API-key fallback stay app-server/bridge-owned; extension storage must not contain raw credentials.

## Documentation

- Keep [README.md](../README.md) aligned with the current UI surface.
- Keep [SECURITY.md](../SECURITY.md) aligned with the native host and bridge boundary.
- Update architecture docs when extension-to-bridge RPC contracts, permissions, or local storage behavior change.
