import { spawn, type ChildProcessByStdio } from "node:child_process";
import type { Readable, Writable } from "node:stream";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import readline from "node:readline";

import { NativeMessageStreamDecoder, encodeNativeMessage } from "./framing.js";
import { createBridgeProcessEnv } from "./environment.js";

export class NativeHostRelay {
  readonly #decoder = new NativeMessageStreamDecoder();
  #bridge?: ChildProcessByStdio<Writable, Readable, null>;
  #shuttingDown = false;

  start(): void {
    this.#bridge = spawn(process.execPath, [this.#resolveBridgeEntry()], {
      stdio: ["pipe", "pipe", "inherit"],
      env: createBridgeProcessEnv(process.env),
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

    const lineReader = readline.createInterface({
      input: this.#bridge.stdout,
    });
    lineReader.on("line", (line) => {
      if (!line.trim()) {
        return;
      }

      this.#writeToStdout(encodeNativeMessage(JSON.parse(line)));
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
    if (process.env.BRIDGE_ENTRY) {
      return process.env.BRIDGE_ENTRY;
    }

    const currentDir = dirname(fileURLToPath(import.meta.url));
    return resolve(currentDir, "../../bridge/dist/cli.js");
  }
}

function isBrokenPipeError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    ((error as { code?: string }).code === "EPIPE" || (error as { code?: string }).code === "ERR_STREAM_DESTROYED")
  );
}
