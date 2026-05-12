import { spawn, type ChildProcessByStdio } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import type { Readable, Writable } from "node:stream";
import readline from "node:readline";

export const COPILOT_FIXED_MODEL_ID = "gpt-5.4";

type JsonRpcMessage = {
  jsonrpc?: string;
  id?: number | string;
  method?: string;
  params?: Record<string, unknown>;
  result?: unknown;
  error?: {
    code?: number;
    message?: string;
  };
};

type SessionUpdateParams = {
  sessionId?: string;
  update?: Record<string, unknown>;
};

export type CopilotInitializeResult = {
  protocolVersion?: number;
  agentCapabilities?: {
    promptCapabilities?: {
      image?: boolean;
      audio?: boolean;
      embeddedContext?: boolean;
    };
  };
  agentInfo?: {
    name?: string;
    title?: string;
    version?: string;
  };
  authMethods?: Array<Record<string, unknown>>;
};

export type CopilotSessionUpdate = {
  sessionId: string;
  update: Record<string, unknown>;
};

export interface CopilotPromptResult {
  initialize: CopilotInitializeResult;
  sessionId: string;
  text: string;
  reasoning: string;
  stopReason: string | null;
}

type PendingRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error ?? "");
}

function isPathWithinRoot(candidate: string, root: string): boolean {
  const relativePath = relative(root, candidate);
  return relativePath === "" || (!relativePath.startsWith("..") && !relativePath.includes(`..${process.platform === "win32" ? "\\" : "/"}`));
}

async function readTextFileWithinRoot(path: string, cwd: string, line?: unknown, limit?: unknown): Promise<string> {
  const resolved = resolve(cwd, path);
  if (!isPathWithinRoot(resolved, cwd)) {
    throw new Error(`Path '${resolved}' is outside the session cwd '${cwd}'.`);
  }
  const content = await readFile(resolved, "utf8").catch((error: unknown) => {
    if ((error as { code?: string } | undefined)?.code === "ENOENT") {
      return "";
    }
    throw error;
  });
  if (!(typeof line === "number" && line > 1)) {
    return content;
  }
  const lines = content.split(/\n/gu).map((value, index, array) => (index < array.length - 1 ? `${value}\n` : value));
  const start = line - 1;
  const end = typeof limit === "number" && limit > 0 ? start + limit : undefined;
  return lines.slice(start, end).join("");
}

async function writeTextFileWithinRoot(path: string, cwd: string, content: unknown): Promise<void> {
  const resolved = resolve(cwd, path);
  if (!isPathWithinRoot(resolved, cwd)) {
    throw new Error(`Path '${resolved}' is outside the session cwd '${cwd}'.`);
  }
  await mkdir(resolve(resolved, ".."), { recursive: true });
  await writeFile(resolved, String(content ?? ""), "utf8");
}

export class CopilotAcpRunner {
  readonly #command: string;

  constructor(command: string) {
    this.#command = command;
  }

  async runPrompt(options: {
    cwd: string;
    prompt: string;
    model?: string;
    signal?: AbortSignal;
    onSessionUpdate?: (update: CopilotSessionUpdate) => void;
  }): Promise<CopilotPromptResult> {
    const args = ["--acp", "--stdio"];
    const model = normalizeCopilotModel(options.model);
    if (model) {
      args.push("--model", model);
    }

    const processHandle = spawn(this.#command, args, {
      cwd: options.cwd,
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env },
      ...(process.platform === "win32" ? { shell: true } : {}),
    }) as ChildProcessByStdio<Writable, Readable, Readable>;

    const pending = new Map<number, PendingRequest>();
    let requestId = 0;
    let shuttingDown = false;
    let startError: Error | null = null;
    const stdout = processHandle.stdout;
    const stdin = processHandle.stdin;
    const stderrChunks: string[] = [];

    if (!stdout || !stdin) {
      throw new Error("Copilot ACP stdio is not available.");
    }

    processHandle.stderr?.on("data", (chunk) => {
      stderrChunks.push(String(chunk));
    });

    const failPending = (error: Error) => {
      if (startError) {
        return;
      }
      startError = error;
      for (const request of pending.values()) {
        request.reject(error);
      }
      pending.clear();
    };

    const killProcess = () => {
      if (shuttingDown) {
        return;
      }
      shuttingDown = true;
      processHandle.kill();
    };

    processHandle.on("error", (error) => {
      failPending(new Error(`Failed to start Copilot ACP with "${this.#command}": ${getErrorMessage(error)}`));
    });
    processHandle.on("exit", (code) => {
      const stderrTail = stderrChunks.join("").trim();
      const message = stderrTail
        ? `Copilot ACP exited with code ${code ?? "unknown"}: ${stderrTail}`
        : `Copilot ACP exited with code ${code ?? "unknown"}.`;
      failPending(new Error(message));
    });

    const lineReader = readline.createInterface({ input: stdout });
    const textParts: string[] = [];
    const reasoningParts: string[] = [];
    const handleUpdate = (update: CopilotSessionUpdate): void => {
      options.onSessionUpdate?.(update);
      const kind = String(update.update.sessionUpdate ?? "").trim();
      const content = asRecord(update.update.content);
      const chunkText = typeof content?.text === "string" ? content.text : "";
      if (kind === "agent_message_chunk" && chunkText) {
        textParts.push(chunkText);
      } else if (kind === "agent_thought_chunk" && chunkText) {
        reasoningParts.push(chunkText);
      }
    };
    lineReader.on("line", (line) => {
      if (!line.trim()) {
        return;
      }
      const message = JSON.parse(line) as JsonRpcMessage;
      if (message.method) {
        void this.#handleServerMessage({
          message,
          cwd: options.cwd,
          stdin,
          onSessionUpdate: handleUpdate,
        });
        return;
      }
      const id = typeof message.id === "number" ? message.id : Number(message.id);
      const request = Number.isFinite(id) ? pending.get(id) : undefined;
      if (!request) {
        return;
      }
      pending.delete(id);
      if (message.error) {
        request.reject(new Error(message.error.message ?? "Unknown Copilot ACP error."));
        return;
      }
      request.resolve(message.result);
    });

    const abortListener = () => {
      failPending(new Error("Copilot request interrupted."));
      killProcess();
    };
    options.signal?.addEventListener("abort", abortListener, { once: true });

    const request = <TResult = unknown>(method: string, params: Record<string, unknown>): Promise<TResult> =>
      new Promise<TResult>((resolveRequest, rejectRequest) => {
        requestId += 1;
        pending.set(requestId, {
          resolve: (value) => resolveRequest(value as TResult),
          reject: rejectRequest,
        });
        stdin.write(
          `${JSON.stringify({
            jsonrpc: "2.0",
            id: requestId,
            method,
            params,
          })}\n`,
        );
      });

    try {
      const initialize = await request<CopilotInitializeResult>("initialize", {
        protocolVersion: 1,
        clientCapabilities: {
          fs: {
            readTextFile: true,
            writeTextFile: true,
          },
        },
        clientInfo: {
          name: "chromex-bridge",
          title: "Chromex",
          version: "0.0.0",
        },
      });
      const session = await request<{ sessionId?: string }>("session/new", {
        cwd: options.cwd,
        mcpServers: [],
      });
      const sessionId = String(session.sessionId ?? "").trim();
      if (!sessionId) {
        throw new Error("Copilot ACP did not return a sessionId.");
      }
      const stopResult = await request<{ stopReason?: string }>("session/prompt", {
        sessionId,
        prompt: [{ type: "text", text: options.prompt }],
      });

      return {
        initialize,
        sessionId,
        text: textParts.join(""),
        reasoning: reasoningParts.join(""),
        stopReason: typeof stopResult.stopReason === "string" ? stopResult.stopReason : null,
      };
    } finally {
      options.signal?.removeEventListener("abort", abortListener);
      lineReader.close();
      killProcess();
    }
  }

  async #handleServerMessage(input: {
    message: JsonRpcMessage;
    cwd: string;
    stdin: Writable;
    onSessionUpdate?: (update: CopilotSessionUpdate) => void;
  }): Promise<void> {
    const method = input.message.method ?? "";
    const messageId = input.message.id;
    const params = asRecord(input.message.params) ?? {};

    if (method === "session/update") {
      const updateParams = params as SessionUpdateParams;
      const sessionId = String(updateParams.sessionId ?? "").trim();
      const update = asRecord(updateParams.update) ?? {};
      input.onSessionUpdate?.({ sessionId, update });
      return;
    }

    if (messageId === undefined || messageId === null) {
      return;
    }

    let response: JsonRpcMessage;
    if (method === "session/request_permission") {
      response = {
        jsonrpc: "2.0",
        id: messageId,
        result: {
          outcome: {
            outcome: "approved",
          },
        },
      };
    } else if (method === "fs/read_text_file") {
      try {
        response = {
          jsonrpc: "2.0",
          id: messageId,
          result: {
            content: await readTextFileWithinRoot(
              String(params.path ?? ""),
              input.cwd,
              params.line,
              params.limit,
            ),
          },
        };
      } catch (error) {
        response = jsonRpcError(messageId, -32602, getErrorMessage(error));
      }
    } else if (method === "fs/write_text_file") {
      try {
        await writeTextFileWithinRoot(String(params.path ?? ""), input.cwd, params.content);
        response = {
          jsonrpc: "2.0",
          id: messageId,
          result: null,
        };
      } catch (error) {
        response = jsonRpcError(messageId, -32602, getErrorMessage(error));
      }
    } else {
      response = jsonRpcError(messageId, -32601, `Unsupported Copilot ACP request: ${method}`);
    }
    input.stdin.write(`${JSON.stringify(response)}\n`);
  }
}

function jsonRpcError(id: number | string, code: number, message: string): JsonRpcMessage {
  return {
    jsonrpc: "2.0",
    id,
    error: {
      code,
      message,
    },
  };
}

export function normalizeCopilotModel(model: string | null | undefined): string | undefined {
  void model;
  return COPILOT_FIXED_MODEL_ID;
}
