import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { homedir, platform } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const LABEL = "com.codex.sidepanel.http-bridge";
const HTTP_BRIDGE_PORT = 8765;
const CHROME_WEB_STORE_EXTENSION_ID = "odlalmnpmmakfigepbaabimjcmcppgfo";

if (platform() !== "darwin") {
  throw new Error("install-http-bridge.mjs currently supports macOS only.");
}

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const extensionManifestPath = resolve(repoRoot, "packages/extension/public/manifest.json");
const extensionIdArg = normalizeCliValue(process.argv.slice(2).find((arg) => !arg.startsWith("--")));
const derivedExtensionId = await deriveExtensionIdFromManifest(extensionManifestPath);
const extensionId = extensionIdArg ?? derivedExtensionId ?? CHROME_WEB_STORE_EXTENSION_ID;

if (!isValidExtensionId(extensionId)) {
  throw new Error("The extension ID must be a 32-character Chrome extension ID using letters a-p.");
}

const allowedExtensionIds = [...new Set([extensionId, derivedExtensionId, CHROME_WEB_STORE_EXTENSION_ID].filter(Boolean))];
const allowedOrigins = allowedExtensionIds.map((id) => `chrome-extension://${id}`);

const appSupportDir = resolve(homedir(), "Library", "Application Support", "CodexSidepanel", "http-bridge");
const launchAgentsDir = resolve(homedir(), "Library", "LaunchAgents");
const plistPath = resolve(launchAgentsDir, `${LABEL}.plist`);
const logsDir = resolve(appSupportDir, "logs");
const sourceNativeHostPath = resolve(repoRoot, "packages/native-host/dist/http-bin.js");
const sourceBridgeEntryPath = resolve(repoRoot, "packages/bridge/dist/cli.js");
const nativeHostSourceDir = resolve(repoRoot, "packages/native-host/dist");
const bundledBridgeCandidates = [resolve(repoRoot, "bridge/cli.bundle.cjs"), resolve(repoRoot, "bridge/cli.bundle.mjs")];
const nativeHostInstallDir = resolve(appSupportDir, "native-host");
const bundledBridgePath = resolve(appSupportDir, "bridge/cli.bundle.cjs");
const launcherPath = resolve(appSupportDir, "run-http-bridge.sh");
const stdoutPath = resolve(logsDir, "stdout.log");
const stderrPath = resolve(logsDir, "stderr.log");
const sourceMode =
  (await findFirstExistingPath([resolve(repoRoot, "node_modules")])) &&
  (await findFirstExistingPath([sourceNativeHostPath])) &&
  (await findFirstExistingPath([sourceBridgeEntryPath]));

await assertBuiltAsset(nativeHostSourceDir, "packages/native-host/dist");
const existingBundle = await findFirstExistingPath(bundledBridgeCandidates);
if (!sourceMode && !existingBundle) {
  await assertBuiltAsset(resolve(repoRoot, "packages/bridge/dist/cli.js"), "packages/bridge/dist/cli.js");
}

await rm(appSupportDir, { force: true, recursive: true });
await mkdir(logsDir, { recursive: true });
await writeFile(resolve(appSupportDir, "package.json"), JSON.stringify({ private: true, type: "module" }, null, 2));
let hostPath = sourceNativeHostPath;
let bridgeEntryPath = sourceBridgeEntryPath;
if (!sourceMode) {
  await mkdir(nativeHostInstallDir, { recursive: true });
  await mkdir(dirname(bundledBridgePath), { recursive: true });
  hostPath = resolve(nativeHostInstallDir, "dist/http-bin.js");
  bridgeEntryPath = bundledBridgePath;
  await cp(nativeHostSourceDir, resolve(nativeHostInstallDir, "dist"), { recursive: true });
  if (existingBundle) {
    await cp(existingBundle, bundledBridgePath);
  } else {
    await buildBridgeBundle(resolve(repoRoot, "packages/bridge/dist/cli.js"), bundledBridgePath);
  }
}
await writeLauncher({
  launcherPath,
  hostPath,
  bridgeEntryPath,
  allowedOrigins,
});
await mkdir(launchAgentsDir, { recursive: true });
await writeFile(plistPath, createLaunchAgentPlist({ launcherPath, stdoutPath, stderrPath, workingDirectory: sourceMode ? repoRoot : appSupportDir }));

const domainTarget = `gui/${process.getuid()}`;
spawnSync("launchctl", ["bootout", domainTarget, plistPath], { stdio: "ignore" });
const bootstrapResult = spawnSync("launchctl", ["bootstrap", domainTarget, plistPath], { encoding: "utf8" });
if (bootstrapResult.status !== 0) {
  throw new Error(bootstrapResult.stderr.trim() || "Failed to bootstrap the local HTTP bridge.");
}
const kickstartResult = spawnSync("launchctl", ["kickstart", "-k", `${domainTarget}/${LABEL}`], { encoding: "utf8" });
if (kickstartResult.status !== 0) {
  throw new Error(kickstartResult.stderr.trim() || "Failed to start the local HTTP bridge.");
}

console.log(`Installed ${LABEL}`);
console.log(`Bridge URL: http://127.0.0.1:${HTTP_BRIDGE_PORT}`);
console.log(`LaunchAgent: ${plistPath}`);
console.log(`Logs: ${logsDir}`);
console.log(`Allowed extension IDs: ${allowedExtensionIds.join(", ")}`);
console.log(`Mode: ${sourceMode ? "source-checkout" : "packaged"}`);
console.log("Chrome restart is not required. Reopen the side panel or press Check connection.");

async function writeLauncher({ launcherPath, hostPath, bridgeEntryPath, allowedOrigins }) {
  const forwardedLauncherEnv = [
    "COPILOT_AGENT_SESSION_ID",
    "COPILOT_CLI",
    "COPILOT_CLI_BINARY_VERSION",
    "COPILOT_LOADER_PID",
    "COPILOT_RUN_APP",
  ]
    .map((key) => [key, process.env[key]?.trim() ?? ""])
    .filter(([, value]) => value);
  const launcherBody = [
    "#!/bin/sh",
    `export BRIDGE_ENTRY="${bridgeEntryPath}"`,
    `export BRIDGE_ALLOWED_ORIGINS="${allowedOrigins.join(",")}"`,
    `export BRIDGE_HTTP_PORT="${HTTP_BRIDGE_PORT}"`,
    `export PATH="${dirname(process.execPath)}:$PATH"`,
    ...forwardedLauncherEnv.map(([key, value]) => `export ${key}="${escapeShellDoubleQuoted(value)}"`),
    `exec "${process.execPath}" "${hostPath}"`,
    "",
  ].join("\n");
  await writeFile(launcherPath, launcherBody, { mode: 0o755 });
  await chmod(launcherPath, 0o755);
}

function escapeShellDoubleQuoted(value) {
  return String(value).replace(/["\\$`]/gu, "\\$&");
}

function createLaunchAgentPlist({ launcherPath, stdoutPath, stderrPath, workingDirectory }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${launcherPath}</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${workingDirectory}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>StandardOutPath</key>
  <string>${stdoutPath}</string>
  <key>StandardErrorPath</key>
  <string>${stderrPath}</string>
</dict>
</plist>
`;
}

async function deriveExtensionIdFromManifest(manifestPath) {
  try {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    if (!manifest?.key || typeof manifest.key !== "string") {
      return null;
    }

    const digest = createHash("sha256")
      .update(Buffer.from(manifest.key, "base64"))
      .digest("hex")
      .slice(0, 32);
    return digest.replace(/[0-9a-f]/g, (character) =>
      String.fromCharCode("a".charCodeAt(0) + Number.parseInt(character, 16)),
    );
  } catch {
    return null;
  }
}

function isValidExtensionId(value) {
  return /^[a-p]{32}$/u.test(value);
}

function normalizeCliValue(value) {
  const normalized = stripWrappingQuotes(value?.trim() ?? "");
  return normalized || undefined;
}

function stripWrappingQuotes(value) {
  let normalized = value.trim();
  while (
    normalized.length >= 2 &&
    ((normalized.startsWith("\"") && normalized.endsWith("\"")) ||
      (normalized.startsWith("'") && normalized.endsWith("'")))
  ) {
    normalized = normalized.slice(1, -1).trim();
  }
  return normalized;
}

async function assertBuiltAsset(path, label) {
  try {
    await stat(path);
  } catch {
    throw new Error(`Missing ${label}. Run "npm run build" before installing the local HTTP bridge.`);
  }
}

async function findFirstExistingPath(paths) {
  for (const path of paths) {
    try {
      await stat(path);
      return path;
    } catch {
      // continue
    }
  }
  return null;
}

async function buildBridgeBundle(entryPoint, outfile) {
  let esbuild;
  try {
    ({ build: esbuild } = await import("esbuild"));
  } catch {
    throw new Error("Missing bundled bridge and esbuild is unavailable. Re-run npm run package:local-bridge or install from the source checkout.");
  }
  await esbuild({
    entryPoints: [entryPoint],
    outfile,
    bundle: true,
    platform: "node",
    format: "cjs",
    target: "node20",
    sourcemap: false,
    banner: {
      js: 'const __chromexImportMetaUrl = require("node:url").pathToFileURL(__filename).href;',
    },
    define: {
      "import.meta.url": "__chromexImportMetaUrl",
    },
    packages: "bundle",
    external: ["@aws-sdk/client-s3"],
    logLevel: "silent",
  });
}
