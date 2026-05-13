import { spawn, type ChildProcessByStdio } from "node:child_process";
import type { Readable, Writable } from "node:stream";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import readline from "node:readline";

import { NativeMessageStreamDecoder, encodeNativeMessage } from "./framing.js";
import { createBridgeProcessEnv, mergeShellProviderEnv } from "./environment.js";

type BridgeMessage = {
  id: string;
  method: string;
  params: Record<string, unknown>;
};

type BridgeEventMessage = {
  event: unknown;
};

type BridgeResponse = {
  id?: string;
  result?: unknown;
  error?: { message: string };
};

type RelayOptions = {
  enableNativeMessaging?: boolean;
};

const DEFAULT_BRIDGE_RESPONSE_TIMEOUT_MS = 30_000;
const IMAGE_EDIT_BRIDGE_RESPONSE_TIMEOUT_MS = 20 * 60 * 1000;
const IMAGE_GENERATE_BRIDGE_RESPONSE_TIMEOUT_MS = 60 * 60 * 1000;

export function getBridgeResponseTimeoutMs(method: string): number {
  switch (method) {
    case "image.edit.start":
      return IMAGE_EDIT_BRIDGE_RESPONSE_TIMEOUT_MS;
    case "image.generate.start":
      return IMAGE_GENERATE_BRIDGE_RESPONSE_TIMEOUT_MS;
    default:
      return DEFAULT_BRIDGE_RESPONSE_TIMEOUT_MS;
  }
}

export class NativeHostRelay {
  readonly #decoder = new NativeMessageStreamDecoder();
  #bridge: ChildProcessByStdio<Writable, Readable, null> | undefined;
  #shuttingDown = false;
  #restartingBridge = false;
  #pendingResponses = new Map<string, (msg: BridgeResponse) => void>();
  #lineReader: readline.Interface | undefined;
  #eventListeners = new Set<(event: unknown) => void>();
  #nativeMessagingEnabled = true;

  start(options: RelayOptions = {}): void {
    this.#nativeMessagingEnabled = options.enableNativeMessaging ?? true;
    this.#spawnBridge();
    if (this.#nativeMessagingEnabled) {
      process.stdout.on("error", (error) => {
        if (this.#handleOutputError(error)) {
          return;
        }
        throw error;
      });
      process.stdin.on("end", () => {
        this.#shutdown();
      });
      process.stdin.on("data", (chunk: Buffer) => {
        const messages = this.#decoder.push(chunk);
        for (const message of messages) {
          if (!this.#writeToBridge(`${JSON.stringify(message)}\n`)) {
            return;
          }
        }
      });
    }
    process.on("SIGTERM", () => {
      this.#shutdown();
    });
    process.on("SIGINT", () => {
      this.#shutdown();
    });

  }

  subscribe(listener: (event: unknown) => void): () => void {
    this.#eventListeners.add(listener);
    return () => {
      this.#eventListeners.delete(listener);
    };
  }

  async sendToBridge(message: BridgeMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const timeoutMs = getBridgeResponseTimeoutMs(message.method);
      const timeout = setTimeout(() => {
        if (this.#pendingResponses.delete(message.id)) {
          reject(new Error("Request timeout"));
        }
      }, timeoutMs);

      const handler = (response: BridgeResponse) => {
        clearTimeout(timeout);
        if (response.error) {
          reject(new Error(response.error.message));
        } else {
          resolve(response.result);
        }
      };

      this.#pendingResponses.set(message.id, handler);
      if (!this.#writeToBridge(`${JSON.stringify(message)}\n`)) {
        clearTimeout(timeout);
        this.#pendingResponses.delete(message.id);
        reject(new Error("Failed to write to bridge"));
      }
    });
  }

  async restartBridge(): Promise<void> {
    if (!this.#bridge) {
      this.#spawnBridge();
      return;
    }

    this.#restartingBridge = true;
    this.#failPendingResponses("Bridge restarted.");
    const exitingBridge = this.#bridge;
    this.#bridge = undefined;
    this.#lineReader?.close();
    this.#lineReader = undefined;
    await new Promise<void>((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) {
          return;
        }
        settled = true;
        resolve();
      };
      exitingBridge.once("exit", finish);
      exitingBridge.kill();
      setTimeout(finish, 1_000);
    });
    this.#restartingBridge = false;
    this.#spawnBridge();
  }

  #writeToBridge(payload: string): boolean {
    try {
      this.#bridge?.stdin?.write(payload);
      return true;
    } catch (error) {
      if (this.#handleOutputError(error)) {
        return false;
      }
      throw error;
    }
  }

  #writeToStdout(payload: Buffer): boolean {
    try {
      process.stdout.write(payload);
      return true;
    } catch (error) {
      if (this.#handleOutputError(error)) {
        return false;
      }
      throw error;
    }
  }

  #handleOutputError(error: unknown): boolean {
    if (!isBrokenPipeError(error)) {
      return false;
    }

    this.#shutdown();
    return true;
  }

  #shutdown(): void {
    if (this.#shuttingDown) {
      return;
    }

    this.#shuttingDown = true;
    this.#failPendingResponses("Bridge stopped.");
    this.#lineReader?.close();
    this.#bridge?.kill();
    process.exit(0);
  }

  #spawnBridge(): void {
    const bridgeBaseEnv = mergeShellProviderEnv(process.env);
    this.#bridge = spawn(process.execPath, [this.#resolveBridgeEntry()], {
      stdio: ["pipe", "pipe", "inherit"],
      env: createBridgeProcessEnv(bridgeBaseEnv),
    });
    this.#bridge.stdin.on("error", (error) => {
      if (this.#handleOutputError(error)) {
        return;
      }
      throw error;
    });
    this.#bridge.on("exit", () => {
      this.#lineReader?.close();
      this.#lineReader = undefined;
      if (this.#restartingBridge) {
        return;
      }
      this.#shutdown();
    });
    this.#lineReader = readline.createInterface({
      input: this.#bridge.stdout,
    });
    this.#lineReader.on("line", (line) => {
      if (!line.trim()) {
        return;
      }

      const message = JSON.parse(line) as BridgeResponse | BridgeEventMessage;
      if ("event" in message) {
        for (const listener of this.#eventListeners) {
          listener(message.event);
        }
        if (this.#nativeMessagingEnabled) {
          this.#writeToStdout(encodeNativeMessage(message));
        }
        return;
      }

      if (message.id) {
        const handler = this.#pendingResponses.get(message.id);
        if (handler) {
          this.#pendingResponses.delete(message.id);
          handler(message);
          return;
        }
      }

      if (this.#nativeMessagingEnabled) {
        this.#writeToStdout(encodeNativeMessage(message));
      }
    });
  }

  #failPendingResponses(message: string): void {
    for (const handler of this.#pendingResponses.values()) {
      handler({ error: { message } });
    }
    this.#pendingResponses.clear();
  }

  #resolveBridgeEntry(): string {
    const configuredBridgeEntry = normalizeNativeHostPath(process.env.BRIDGE_ENTRY ?? "");
    if (configuredBridgeEntry) {
      return configuredBridgeEntry;
    }

    const currentDir = dirname(fileURLToPath(import.meta.url));
    return resolve(currentDir, "../../bridge/dist/cli.js");
  }
}

export function normalizeNativeHostPath(value: string): string {
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

function isBrokenPipeError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    ((error as { code?: string }).code === "EPIPE" || (error as { code?: string }).code === "ERR_STREAM_DESTROYED")
  );
}
