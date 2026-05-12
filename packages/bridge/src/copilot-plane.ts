import { randomUUID } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";

import type { CodexModelOption, CodexThreadMessage } from "@codex-sidepanel/shared";

import { COPILOT_FIXED_MODEL_ID, CopilotAcpRunner, normalizeCopilotModel, type CopilotSessionUpdate } from "./copilot-acp.js";
import type { BridgeDiagnostics } from "./diagnostics.js";
import type { BridgeHarnessRuntime } from "./harness.js";
import type {
  AccountStatus,
  BridgeCodexPlane,
  BridgeEvent,
  GoalClearResult,
  GoalGetResult,
  GoalSetParams,
  GoalSetResult,
  PlanUserInputResponseParams,
  PromptSendParams,
  SessionParams,
  ThreadCompactParams,
  ThreadCompactResult,
  ThreadGoal,
} from "./types.js";

type RuntimeResolver = () => Promise<{
  resolvedCommand: string;
}>;

type LocalTurn = {
  id: string;
  status: string;
  startedAt: number | null;
  completedAt: number | null;
  durationMs: number | null;
};

type LocalThread = {
  id: string;
  title: string;
  preview: string;
  updatedAt: number;
  status: string;
  cwd: string;
  model: string;
  messages: CodexThreadMessage[];
  turns: LocalTurn[];
};

type ActivePrompt = {
  threadId: string;
  turnId: string;
  controller: AbortController;
};

type PlainConversationMessage = {
  role: "user" | "assistant";
  text: string;
};

const DEFAULT_COPILOT_MODEL: CodexModelOption = {
  id: COPILOT_FIXED_MODEL_ID,
  label: "GPT-5.4",
  description: "Pinned default model for the Copilot backend.",
  isDefault: true,
  supportsImages: true,
  reasoningEfforts: ["low", "medium", "high", "xhigh"],
  defaultReasoningEffort: "medium",
  supportsParallelToolCalls: true,
  supportsSearchTool: true,
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error ?? "");
}

function summarizeText(value: string, maxLength = 140): string {
  const normalized = value.replace(/\s+/gu, " ").trim();
  if (!normalized) {
    return "";
  }
  if (normalized.length <= maxLength) {
    return normalized;
  }
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function sanitizeFileName(name: string, fallback: string): string {
  const safe = basename(name).replace(/[^\w.-]+/gu, "-").replace(/^-+/u, "").replace(/-+$/u, "");
  return safe || fallback;
}

function createThreadPreview(messages: CodexThreadMessage[]): string {
  return summarizeText(messages.at(-1)?.text ?? "");
}

function createThreadTitle(messages: CodexThreadMessage[]): string {
  const firstUserMessage = messages.find((message) => message.role === "user")?.text ?? "";
  return summarizeText(firstUserMessage, 60) || "Copilot chat";
}

function now(): number {
  return Date.now();
}

function mapToolActivityKind(update: Record<string, unknown>): "reasoning" | "web" | "file" | "command" | "tool" | "browser" | "image" | "response" {
  const kind = String(update.kind ?? "").toLowerCase();
  const title = String(update.title ?? "").toLowerCase();
  const rawInput = update.rawInput;
  const command = typeof (rawInput as { command?: unknown } | undefined)?.command === "string"
    ? String((rawInput as { command?: string }).command)
    : "";
  if (kind === "execute" || command) {
    return /\b(rg|grep|find|ls|cat|sed|awk|head|tail|git)\b/iu.test(command) ? "file" : "command";
  }
  if (kind === "web" || /\bweb|search|browse|fetch\b/iu.test(title)) {
    return "web";
  }
  if (kind === "browser") {
    return "browser";
  }
  return "tool";
}

function formatToolActivityDetail(update: Record<string, unknown>): string {
  const rawInput = update.rawInput as Record<string, unknown> | undefined;
  if (typeof rawInput?.command === "string") {
    return summarizeText(rawInput.command);
  }
  if (typeof rawInput?.query === "string") {
    return summarizeText(rawInput.query);
  }
  if (typeof update.title === "string") {
    return summarizeText(update.title);
  }
  return summarizeText(JSON.stringify(rawInput ?? {}));
}

async function writePromptAttachments(
  tempDir: string,
  attachments: PromptSendParams["fileAttachments"],
): Promise<string[]> {
  if (!attachments?.length) {
    return [];
  }
  const paths: string[] = [];
  for (const [index, attachment] of attachments.entries()) {
    const base = sanitizeFileName(attachment.name, `attachment-${index + 1}${extname(attachment.name)}`);
    const filePath = join(tempDir, `${index + 1}-${base}`);
    await writeFile(filePath, Buffer.from(attachment.base64, "base64"));
    paths.push(filePath);
  }
  return paths;
}

function formatPrompt(params: PromptSendParams, input: {
  history: PlainConversationMessage[];
  attachmentPaths: string[];
}): string {
  const contextSections = params.contexts.map((context, index) => [
    `Context ${index + 1}`,
    `Title: ${context.metadata.title}`,
    `URL: ${context.metadata.url}`,
    context.selectionText ? `Selection:\n${context.selectionText}` : "",
    `DOM summary:\n${context.domSummary}`,
  ].filter(Boolean).join("\n"));

  const attachmentSection = input.attachmentPaths.length
    ? [
        "Attached local files",
        ...input.attachmentPaths.map((path, index) => {
          const attachment = params.fileAttachments?.[index];
          return `- ${attachment?.name ?? "Attachment"} (${attachment?.mimeType ?? "application/octet-stream"}): ${path}`;
        }),
      ].join("\n")
    : "";

  const structuredInputSection = params.structuredInputs?.length
    ? [
        "Structured inputs",
        ...params.structuredInputs.map((input) => `- ${input.type}: ${input.name} (${input.path})`),
      ].join("\n")
    : "";

  const routePlanSection = params.routePlan
    ? ["Routing plan", JSON.stringify(params.routePlan, null, 2)].join("\n")
    : "";

  const historySection = input.history.length
    ? [
        "Conversation history",
        ...input.history.map((message) => `${message.role === "user" ? "User" : "Assistant"}:\n${message.text}`),
      ].join("\n\n")
    : "";

  return [
    "You are Chromex running through GitHub Copilot CLI.",
    "Use tools when they help. Prefer direct inspection over guessing.",
    "When local file paths are provided, inspect them directly before answering.",
    params.profile.systemPrompt?.trim() ? `Profile instructions:\n${params.profile.systemPrompt.trim()}` : "",
    params.planMode
      ? "Plan mode is enabled. Return a concrete plan or one concise clarification when the task is underspecified."
      : "",
    params.useGoal && params.goalObjective?.trim() ? `Active goal: ${params.goalObjective.trim()}` : "",
    params.conversationContext?.trim() ? `Conversation context:\n${params.conversationContext.trim()}` : "",
    routePlanSection,
    structuredInputSection,
    contextSections.length ? ["Browser context", ...contextSections].join("\n\n") : "",
    attachmentSection,
    historySection,
    `Current user request:\n${params.message.trim()}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

export class CopilotBridgePlane implements BridgeCodexPlane {
  readonly #harness: BridgeHarnessRuntime;
  readonly #emitEvent: ((event: BridgeEvent) => void) | null;
  readonly #diagnostics: BridgeDiagnostics | undefined;
  readonly #resolveRuntime: RuntimeResolver;
  readonly #threads = new Map<string, LocalThread>();
  readonly #goals = new Map<string, ThreadGoal>();
  readonly #activePrompts = new Map<string, ActivePrompt>();

  constructor(options: {
    harness: BridgeHarnessRuntime;
    resolveRuntime: RuntimeResolver;
    emitEvent?: (event: BridgeEvent) => void;
    diagnostics?: BridgeDiagnostics;
  }) {
    this.#harness = options.harness;
    this.#resolveRuntime = options.resolveRuntime;
    this.#emitEvent = options.emitEvent ?? null;
    this.#diagnostics = options.diagnostics;
  }

  async accountStatus(): Promise<AccountStatus> {
    const command = await this.#resolveCommand();
    const runner = new CopilotAcpRunner(command);
    try {
      const result = await runner.runPrompt({
        cwd: await this.#harness.getWorkspaceRoot(),
        prompt: "Reply with exactly: ok",
      });
      return {
        authMode: "chatgpt",
        codexAuthenticated: result.text.trim().length > 0,
        multimodalAvailable: Boolean(result.initialize.agentCapabilities?.promptCapabilities?.image),
        openAiApiKeyConfigured: false,
        planType: "copilot",
      };
    } catch {
      return {
        authMode: null,
        codexAuthenticated: false,
        multimodalAvailable: false,
        openAiApiKeyConfigured: false,
        planType: "copilot",
      };
    }
  }

  async login(): Promise<unknown> {
    throw new Error("Copilot login must be completed in a terminal. Run `copilot login`.");
  }

  async cancelLogin(): Promise<void> {}

  async logout(): Promise<void> {
    throw new Error("Copilot logout is not supported from Chromex. Use `copilot logout` in a terminal.");
  }

  async listModels(): Promise<CodexModelOption[]> {
    return [DEFAULT_COPILOT_MODEL];
  }

  async listThreads(params: { cwd?: string; limit?: number; searchTerm?: string }) {
    const cwd = await this.#resolveCwd(params.cwd);
    const search = params.searchTerm?.trim().toLowerCase() ?? "";
    return [...this.#threads.values()]
      .filter((thread) => (!cwd || thread.cwd === cwd))
      .filter((thread) =>
        !search ||
        `${thread.title}\n${thread.preview}\n${thread.messages.map((message) => message.text).join("\n")}`.toLowerCase().includes(search),
      )
      .sort((left, right) => right.updatedAt - left.updatedAt)
      .slice(0, params.limit ?? 12)
      .map((thread) => ({
        id: thread.id,
        title: thread.title,
        preview: thread.preview,
        updatedAt: thread.updatedAt,
        status: thread.status,
        cwd: thread.cwd,
        source: "copilot",
      }));
  }

  async readThread(params: { threadId: string }) {
    const thread = this.#requireThread(params.threadId);
    return {
      id: thread.id,
      title: thread.title,
      preview: thread.preview,
      updatedAt: thread.updatedAt,
      status: thread.status,
      cwd: thread.cwd,
      messages: thread.messages.map((message) => ({ ...message })),
    };
  }

  async listTurns(params: { threadId: string; limit?: number }) {
    const thread = this.#requireThread(params.threadId);
    return thread.turns.slice(-(params.limit ?? 50)).map((turn) => ({ ...turn }));
  }

  async listSkills() {
    return [];
  }

  async listApps() {
    return [];
  }

  async listPlugins() {
    return [];
  }

  async listMcpServers() {
    return [];
  }

  async startMcpOauthLogin(): Promise<{ authorizationUrl: string }> {
    throw new Error("Copilot MCP OAuth login is not supported from Chromex.");
  }

  async callMcpTool(): Promise<{ content: unknown[]; structuredContent?: unknown; isError?: boolean; meta?: unknown }> {
    throw new Error("Direct MCP tool calls are not supported on the Copilot backend.");
  }

  async reloadMcpServers(): Promise<{ ok: true }> {
    return { ok: true };
  }

  async readRateLimits() {
    return null;
  }

  async setGoal(params: GoalSetParams): Promise<GoalSetResult> {
    const goal: ThreadGoal = {
      threadId: params.threadId,
      objective: params.objective?.trim() ?? this.#goals.get(params.threadId)?.objective ?? "",
      status: params.status?.trim() ?? this.#goals.get(params.threadId)?.status ?? "active",
      tokenBudget: params.tokenBudget ?? null,
      budgetLimited: params.budgetLimited ?? null,
      tokensUsed: null,
      timeUsedSeconds: null,
      createdAt: this.#goals.get(params.threadId)?.createdAt ?? now(),
      updatedAt: now(),
    };
    this.#goals.set(params.threadId, goal);
    this.#emitEvent?.({ type: "goal.updated", threadId: params.threadId, goal });
    return { goal };
  }

  async getGoal(params: { threadId: string }): Promise<GoalGetResult> {
    return { goal: this.#goals.get(params.threadId) ?? null };
  }

  async clearGoal(params: { threadId: string }): Promise<GoalClearResult> {
    const cleared = this.#goals.delete(params.threadId);
    if (cleared) {
      this.#emitEvent?.({ type: "goal.cleared", threadId: params.threadId });
    }
    return { cleared };
  }

  async respondToUserInputRequest(_params: PlanUserInputResponseParams): Promise<{ ok: true }> {
    return { ok: true };
  }

  async openSession(params: SessionParams): Promise<{ threadId: string }> {
    const cwd = await this.#resolveCwd(params.cwd);
    const threadId = randomUUID();
    const thread: LocalThread = {
      id: threadId,
      title: "Copilot chat",
      preview: "",
      updatedAt: now(),
      status: "idle",
      cwd,
      model: normalizeCopilotModel(params.model) ?? "",
      messages: [],
      turns: [],
    };
    this.#threads.set(threadId, thread);
    return { threadId };
  }

  async resumeSession(params: { threadId: string }): Promise<{ threadId: string }> {
    this.#requireThread(params.threadId);
    return { threadId: params.threadId };
  }

  async sendPrompt(params: PromptSendParams, emit: (event: BridgeEvent) => void): Promise<{ threadId: string; turnId: string }> {
    return this.#runPrompt(params, emit);
  }

  async compactThread(params: ThreadCompactParams): Promise<ThreadCompactResult> {
    const threadId = params.threadId ?? [...this.#threads.keys()].at(-1);
    if (!threadId) {
      throw new Error("No Copilot thread is available to compact.");
    }
    return { threadId, status: "completed" };
  }

  async steerTurn(params: PromptSendParams & { expectedTurnId: string }): Promise<{ threadId: string; turnId: string }> {
    const active = params.threadId ? this.#activePrompts.get(params.threadId) : null;
    if (active && active.turnId === params.expectedTurnId) {
      active.controller.abort();
    }
    return this.#runPrompt(params);
  }

  async interruptTurn(params: { threadId: string; turnId: string }): Promise<{ threadId: string; turnId: string }> {
    const active = this.#activePrompts.get(params.threadId);
    if (active && active.turnId === params.turnId) {
      active.controller.abort();
    }
    return params;
  }

  async #runPrompt(
    params: PromptSendParams,
    emit?: (event: BridgeEvent) => void,
  ): Promise<{ threadId: string; turnId: string }> {
    const threadId = params.threadId?.trim() ? params.threadId : (await this.openSession(params)).threadId;
    const thread = this.#threads.get(threadId) ?? this.#requireThread(threadId);
    const cwd = await this.#resolveCwd(params.cwd || thread.cwd);
    const turnId = randomUUID();
    const startedAt = now();
    const activePrompt: ActivePrompt = {
      threadId,
      turnId,
      controller: new AbortController(),
    };
    this.#activePrompts.set(threadId, activePrompt);
    thread.status = "running";
    thread.cwd = cwd;
    const notify = emit ?? this.#emitEvent ?? (() => undefined);
    notify({
      type: "turn.started",
      activeTurn: {
        threadId,
        turnId,
      },
    });

    const tempDir = await mkdtemp(join(tmpdir(), "chromex-copilot-"));
    try {
      const history = normalizeConversationHistory(params, thread.messages);
      const attachmentPaths = await writePromptAttachments(tempDir, params.fileAttachments);
      const command = await this.#resolveCommand();
      const runner = new CopilotAcpRunner(command);
      const requestedModel = normalizeCopilotModel(params.model);
      let assistantItemId = `copilot-${turnId}`;
      const result = await runner.runPrompt({
        cwd,
        signal: activePrompt.controller.signal,
        prompt: formatPrompt(params, { history, attachmentPaths }),
        ...(requestedModel ? { model: requestedModel } : {}),
        onSessionUpdate: (update) => {
          this.#handleSessionUpdate(update, {
            emit: notify,
            threadId,
            turnId,
            assistantItemIdRef: {
              get value() {
                return assistantItemId;
              },
              set value(next: string) {
                assistantItemId = next;
              },
            },
          });
        },
      });

      const assistantText = result.text.trim();
      const userMessage: CodexThreadMessage = {
        id: `user-${turnId}`,
        role: "user",
        text: params.message,
      };
      const assistantMessage: CodexThreadMessage = {
        id: assistantItemId,
        role: "assistant",
        text: assistantText,
      };
      thread.messages.push(userMessage, assistantMessage);
      thread.title = createThreadTitle(thread.messages);
      thread.preview = createThreadPreview(thread.messages);
      thread.updatedAt = now();
      thread.status = "completed";
      thread.model = normalizeCopilotModel(params.model) ?? thread.model;
      thread.turns.push({
        id: turnId,
        status: "completed",
        startedAt,
        completedAt: thread.updatedAt,
        durationMs: thread.updatedAt - startedAt,
      });
      notify({
        type: "message.completed",
        itemId: assistantItemId,
        text: assistantText,
        threadId,
        turnId,
      });
      notify({
        type: "turn.completed",
        threadId,
        turnId,
      });
      await this.#diagnostics?.record("copilot.prompt.completed", {
        threadId,
        turnId,
        stopReason: result.stopReason,
        model: normalizeCopilotModel(params.model) ?? null,
      }).catch(() => undefined);
      return { threadId, turnId };
    } catch (error) {
      thread.status = "failed";
      thread.updatedAt = now();
      thread.turns.push({
        id: turnId,
        status: "failed",
        startedAt,
        completedAt: thread.updatedAt,
        durationMs: thread.updatedAt - startedAt,
      });
      notify({
        type: "turn.failed",
        threadId,
        turnId,
        message: getErrorMessage(error),
        clientRequestId: params.clientRequestId ?? null,
      });
      throw error;
    } finally {
      this.#activePrompts.delete(threadId);
      await rm(tempDir, { recursive: true, force: true }).catch(() => undefined);
    }
  }

  #handleSessionUpdate(
    sessionUpdate: CopilotSessionUpdate,
    input: {
      emit: (event: BridgeEvent) => void;
      threadId: string;
      turnId: string;
      assistantItemIdRef: { value: string };
    },
  ): void {
    const update = sessionUpdate.update;
    const kind = String(update.sessionUpdate ?? "").trim();
    if (kind === "agent_message_chunk") {
      const content = update.content as { text?: unknown } | undefined;
      if (typeof content?.text === "string" && content.text) {
        input.emit({
          type: "message.delta",
          itemId: input.assistantItemIdRef.value,
          delta: content.text,
          threadId: input.threadId,
          turnId: input.turnId,
        });
      }
      return;
    }

    if (kind === "tool_call" || kind === "tool_call_update") {
      const itemId = String(update.toolCallId ?? `${input.turnId}-tool`);
      input.emit({
        type: "turn.activity",
        threadId: input.threadId,
        turnId: input.turnId,
        itemId,
        kind: mapToolActivityKind(update),
        title: summarizeText(String(update.title ?? "Using tool")) || "Using tool",
        detail: formatToolActivityDetail(update),
        status: kind === "tool_call_update" && String(update.status ?? "") === "completed" ? "completed" : "running",
        timestampMs: now(),
      });
    }
  }

  #requireThread(threadId: string): LocalThread {
    const thread = this.#threads.get(threadId);
    if (!thread) {
      throw new Error(`Copilot conversation not found: ${threadId}`);
    }
    return thread;
  }

  async #resolveCommand(): Promise<string> {
    const runtime = await this.#resolveRuntime();
    const command = runtime.resolvedCommand.trim();
    if (!command) {
      throw new Error("No Copilot CLI binary was detected. Install Copilot or set the runtime command to copilot.");
    }
    return command;
  }

  async #resolveCwd(cwd?: string): Promise<string> {
    const trimmed = cwd?.trim();
    if (trimmed) {
      return trimmed;
    }
    return this.#harness.getWorkspaceRoot();
  }
}

function normalizeConversationHistory(
  params: PromptSendParams,
  threadMessages: CodexThreadMessage[],
): PlainConversationMessage[] {
  const rawHistory = Array.isArray(params.conversationMessages) && params.conversationMessages.length
    ? params.conversationMessages
    : threadMessages;
  return rawHistory
    .map((message) => {
      if (!message || typeof message !== "object") {
        return null;
      }
      const role = (message as { role?: unknown }).role;
      const text = (message as { text?: unknown }).text;
      if ((role === "user" || role === "assistant") && typeof text === "string" && text.trim()) {
        return {
          role,
          text: text.trim(),
        } satisfies PlainConversationMessage;
      }
      return null;
    })
    .filter((message): message is PlainConversationMessage => message !== null);
}
