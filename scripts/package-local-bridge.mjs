import { execFileSync } from "node:child_process";
import { copyFile, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import process from "node:process";
import { build } from "esbuild";
import JSZip from "jszip";

const root = process.cwd();
const packageJson = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
const version = String(packageJson.version ?? "0.0.0");
const timestamp = new Date().toISOString().replace(/[-:.TZ]/gu, "").slice(0, 14);
const outDir = resolve(root, "output/local-bridge");
const stagingDir = resolve(outDir, "chromex-local-bridge");
const zipPath = resolve(outDir, `chromex-${version}-local-bridge-${timestamp}.zip`);
const stableZipPath = resolve(outDir, "chromex-local-bridge.zip");

await rm(outDir, { recursive: true, force: true });
await mkdir(resolve(stagingDir, "scripts"), { recursive: true });
await mkdir(resolve(stagingDir, "bridge"), { recursive: true });
await mkdir(resolve(stagingDir, "packages/native-host"), { recursive: true });
await mkdir(resolve(stagingDir, "packages/shared"), { recursive: true });

await assertPathExists(resolve(root, "packages/bridge/dist/cli.js"), "packages/bridge/dist/cli.js");
await assertPathExists(resolve(root, "packages/native-host/dist/bin.js"), "packages/native-host/dist/bin.js");
await assertPathExists(resolve(root, "packages/shared/dist/index.js"), "packages/shared/dist/index.js");

await build({
  entryPoints: [resolve(root, "packages/bridge/dist/cli.js")],
  outfile: resolve(stagingDir, "bridge/cli.bundle.cjs"),
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

await cp(resolve(root, "packages/native-host/dist"), resolve(stagingDir, "packages/native-host/dist"), {
  recursive: true,
});
await cp(resolve(root, "packages/shared/dist"), resolve(stagingDir, "packages/shared/dist"), {
  recursive: true,
});
await copyFile(resolve(root, "packages/shared/package.json"), resolve(stagingDir, "packages/shared/package.json"));
await copyFile(resolve(root, "scripts/install-http-bridge.mjs"), resolve(stagingDir, "scripts/install-http-bridge.mjs"));
await copyFile(resolve(root, "scripts/install-native-host.mjs"), resolve(stagingDir, "scripts/install-native-host.mjs"));
await writeFile(
  resolve(stagingDir, "package.json"),
  JSON.stringify({ name: "chromex-local-bridge", version, private: true, type: "module" }, null, 2),
);
await writeFile(resolve(stagingDir, "INSTALL.md"), createInstallReadme(version));

await createZipFromDirectory(stagingDir, zipPath, "chromex-local-bridge");
await copyFile(zipPath, stableZipPath);

console.log(`Local bridge package created: ${zipPath}`);
console.log(`Stable local bridge package created: ${stableZipPath}`);

async function assertPathExists(path, label) {
  try {
    await readFile(path);
  } catch {
    throw new Error(`Missing ${label}. Run npm run build before packaging the local bridge.`);
  }
}

function createInstallReadme(version) {
  return `# Chromex Local Bridge ${version}

This package is for Chrome Web Store users. It installs the local bridge service that lets Chromex talk to Codex on this computer without Chrome native messaging restarts.

## Before You Start

Install the official Codex CLI and verify it works. Official install options: https://github.com/openai/codex

\`\`\`bash
npm install -g @openai/codex
codex --version
\`\`\`

## Install the Bridge

From this extracted \`chromex-local-bridge\` folder, run:

\`\`\`bash
node scripts/install-http-bridge.mjs
\`\`\`

The Chrome Web Store extension ID is included automatically. If Chrome shows a different Chromex extension ID, pass it explicitly:

\`\`\`bash
node scripts/install-http-bridge.mjs <extension-id>
\`\`\`

After installation, Chrome restart is not required. Reopen the Chromex side panel or press **Check connection**.

## Compatibility

- \`install-http-bridge.mjs\` currently supports macOS.
- The legacy \`install-native-host.mjs\` script remains bundled for older native-messaging setups.
`;
}

async function createZipFromDirectory(directory, zipPath, archiveRoot) {
  const files = execFileSync("find", [directory, "-type", "f"], { encoding: "utf8" })
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
  const zip = new JSZip();
  for (const file of files) {
    const relativePath = file.slice(directory.length + 1);
    zip.file(`${archiveRoot}/${relativePath}`, await readFile(file), {
      date: new Date(0),
      unixPermissions: 0o100644,
    });
  }
  await mkdir(dirname(zipPath), { recursive: true });
  await writeFile(
    zipPath,
    await zip.generateAsync({
      type: "nodebuffer",
      compression: "DEFLATE",
      compressionOptions: { level: 9 },
      platform: "UNIX",
    }),
  );
}
