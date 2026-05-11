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

type BridgeResponse = {
  id: string;
  result?: unknown;
  error?: { message: string };
};

export class NativeHostRelay {
  readonly #decoder = new NativeMessageStreamDecoder();
  #bridge?: ChildProcessByStdio<Writable, Readable, null>;
  #shuttingDown = false;
  #pendingResponses = new Map<string, (msg: BridgeResponse) => void>();
  #lineReader?: readline.Interface;

  start(): void {
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
      this.#shutdown();
    });
    process.stdout.on("error", (error) => {
      if (this.#handleOutputError(error)) {
        return;
      }
      throw error;
    });
    process.stdin.on("end", () => {
      this.#shutdown();
    });
    process.on("SIGTERM", () => {
      this.#shutdown();
    });
    process.on("SIGINT", () => {
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

    this.#lineReader = readline.createInterface({
      input: this.#bridge.stdout,
    });
    this.#lineReader.on("line", (line) => {
      if (!line.trim()) {
        return;
      }

      const response = JSON.parse(line) as BridgeResponse;
      
      // Handle HTTP requests waiting for responses
      const handler = this.#pendingResponses.get(response.id);
      if (handler) {
        this.#pendingResponses.delete(response.id);
        handler(response);
      } else {
        // Handle native messaging responses
        this.#writeToStdout(encodeNativeMessage(response));
      }
    });
  }

  async sendToBridge(message: BridgeMessage): Promise<unknown> {
    return new Promise((resolve, reject) => {
      const handler = (response: BridgeResponse) => {
        if (response.error) {
          reject(new Error(response.error.message));
        } else {
          resolve(response.result);
        }
      };

      this.#pendingResponses.set(message.id, handler);
      if (!this.#writeToBridge(`${JSON.stringify(message)}\n`)) {
        this.#pendingResponses.delete(message.id);
        reject(new Error("Failed to write to bridge"));
      }

      // Timeout after 30 seconds
      setTimeout(() => {
        if (this.#pendingResponses.delete(message.id)) {
          reject(new Error("Request timeout"));
        }
      }, 30000);
    });
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
    this.#bridge?.kill();
    process.exit(0);
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
