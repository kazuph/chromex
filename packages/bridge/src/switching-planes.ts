import type { VoiceSessionState } from "@codex-sidepanel/shared";

import type {
  BridgeBrowserActionPlane,
  BridgeCodexPlane,
  BridgeEvent,
  BridgeImagePlane,
  BridgeRoutePlane,
  BridgeRuntimeConfig,
  BridgeVoicePlane,
  GoalClearResult,
  GoalGetResult,
  GoalSetParams,
  GoalSetResult,
  PlanUserInputResponseParams,
  PromptSendParams,
  SessionParams,
  ThreadCompactParams,
  ThreadCompactResult,
  VoiceAppendAudioParams,
  VoiceAppendTextParams,
  VoiceStartParams,
  VoiceStopParams,
  ImageEditParams,
  ImageGenerateParams,
  ImagePreviewParams,
  ImageAssetReadParams,
  ImageAssetDeleteParams,
} from "./types.js";
import { detectBackendKind, type BridgeBackendKind } from "./backend-kind.js";

type RuntimeInspector = () => Promise<BridgeRuntimeConfig>;

export class ActiveBackendRuntime {
  readonly #inspectConfig: RuntimeInspector;

  constructor(inspectConfig: RuntimeInspector) {
    this.#inspectConfig = inspectConfig;
  }

  async inspect(): Promise<BridgeRuntimeConfig & { backendKind: BridgeBackendKind }> {
    const runtime = await this.#inspectConfig();
    return {
      ...runtime,
      backendKind: runtime.backendKind ?? detectBackendKind(runtime.resolvedCodexBinPath || runtime.codexBinPath),
    };
  }
}

export class SwitchingCodexPlane implements BridgeCodexPlane {
  readonly #runtime: ActiveBackendRuntime;
  readonly #codex: BridgeCodexPlane;
  readonly #copilot: BridgeCodexPlane;

  constructor(options: {
    runtime: ActiveBackendRuntime;
    codex: BridgeCodexPlane;
    copilot: BridgeCodexPlane;
  }) {
    this.#runtime = options.runtime;
    this.#codex = options.codex;
    this.#copilot = options.copilot;
  }

  async #plane(): Promise<BridgeCodexPlane> {
    return (await this.#runtime.inspect()).backendKind === "copilot" ? this.#copilot : this.#codex;
  }

  accountStatus() { return this.#plane().then((plane) => plane.accountStatus()); }
  login(params: Parameters<BridgeCodexPlane["login"]>[0]) { return this.#plane().then((plane) => plane.login(params)); }
  cancelLogin(params: Parameters<BridgeCodexPlane["cancelLogin"]>[0]) { return this.#plane().then((plane) => plane.cancelLogin(params)); }
  logout() { return this.#plane().then((plane) => plane.logout()); }
  listModels() { return this.#plane().then((plane) => plane.listModels()); }
  listThreads(params: Parameters<BridgeCodexPlane["listThreads"]>[0]) { return this.#plane().then((plane) => plane.listThreads(params)); }
  readThread(params: Parameters<BridgeCodexPlane["readThread"]>[0]) { return this.#plane().then((plane) => plane.readThread(params)); }
  listTurns(params: Parameters<BridgeCodexPlane["listTurns"]>[0]) { return this.#plane().then((plane) => plane.listTurns(params)); }
  listSkills(params: Parameters<BridgeCodexPlane["listSkills"]>[0]) { return this.#plane().then((plane) => plane.listSkills(params)); }
  listApps(params: Parameters<BridgeCodexPlane["listApps"]>[0]) { return this.#plane().then((plane) => plane.listApps(params)); }
  listPlugins(params: Parameters<BridgeCodexPlane["listPlugins"]>[0]) { return this.#plane().then((plane) => plane.listPlugins(params)); }
  listMcpServers(params: Parameters<BridgeCodexPlane["listMcpServers"]>[0]) { return this.#plane().then((plane) => plane.listMcpServers(params)); }
  startMcpOauthLogin(params: Parameters<BridgeCodexPlane["startMcpOauthLogin"]>[0]) { return this.#plane().then((plane) => plane.startMcpOauthLogin(params)); }
  callMcpTool(params: Parameters<BridgeCodexPlane["callMcpTool"]>[0]) { return this.#plane().then((plane) => plane.callMcpTool(params)); }
  reloadMcpServers() { return this.#plane().then((plane) => plane.reloadMcpServers()); }
  readRateLimits() { return this.#plane().then((plane) => plane.readRateLimits()); }
  setGoal(params: GoalSetParams) { return this.#plane().then((plane) => plane.setGoal(params)); }
  getGoal(params: Parameters<BridgeCodexPlane["getGoal"]>[0]) { return this.#plane().then((plane) => plane.getGoal(params)); }
  clearGoal(params: Parameters<BridgeCodexPlane["clearGoal"]>[0]) { return this.#plane().then((plane) => plane.clearGoal(params)); }
  respondToUserInputRequest(params: PlanUserInputResponseParams) { return this.#plane().then((plane) => plane.respondToUserInputRequest(params)); }
  openSession(params: SessionParams) { return this.#plane().then((plane) => plane.openSession(params)); }
  resumeSession(params: Parameters<BridgeCodexPlane["resumeSession"]>[0]) { return this.#plane().then((plane) => plane.resumeSession(params)); }
  sendPrompt(params: PromptSendParams, emit: (event: BridgeEvent) => void) { return this.#plane().then((plane) => plane.sendPrompt(params, emit)); }
  compactThread(params: ThreadCompactParams) { return this.#plane().then((plane) => plane.compactThread(params)); }
  steerTurn(params: Parameters<BridgeCodexPlane["steerTurn"]>[0]) { return this.#plane().then((plane) => plane.steerTurn(params)); }
  interruptTurn(params: Parameters<BridgeCodexPlane["interruptTurn"]>[0]) { return this.#plane().then((plane) => plane.interruptTurn(params)); }
}

export class SwitchingRoutePlane implements BridgeRoutePlane {
  readonly #runtime: ActiveBackendRuntime;
  readonly #codex: BridgeRoutePlane;
  readonly #copilot: BridgeRoutePlane;

  constructor(options: {
    runtime: ActiveBackendRuntime;
    codex: BridgeRoutePlane;
    copilot: BridgeRoutePlane;
  }) {
    this.#runtime = options.runtime;
    this.#codex = options.codex;
    this.#copilot = options.copilot;
  }

  async plan(params: Parameters<BridgeRoutePlane["plan"]>[0], emit: Parameters<BridgeRoutePlane["plan"]>[1]) {
    const plane = (await this.#runtime.inspect()).backendKind === "copilot" ? this.#copilot : this.#codex;
    return plane.plan(params, emit);
  }
}

export class SwitchingBrowserActionPlane implements BridgeBrowserActionPlane {
  readonly #runtime: ActiveBackendRuntime;
  readonly #codex: BridgeBrowserActionPlane;
  readonly #copilot: BridgeBrowserActionPlane;

  constructor(options: {
    runtime: ActiveBackendRuntime;
    codex: BridgeBrowserActionPlane;
    copilot: BridgeBrowserActionPlane;
  }) {
    this.#runtime = options.runtime;
    this.#codex = options.codex;
    this.#copilot = options.copilot;
  }

  async plan(params: Parameters<BridgeBrowserActionPlane["plan"]>[0], emit: Parameters<BridgeBrowserActionPlane["plan"]>[1]) {
    const plane = (await this.#runtime.inspect()).backendKind === "copilot" ? this.#copilot : this.#codex;
    return plane.plan(params, emit);
  }
}

export class SwitchingVoicePlane implements BridgeVoicePlane {
  readonly #runtime: ActiveBackendRuntime;
  readonly #codex: BridgeVoicePlane;

  constructor(options: { runtime: ActiveBackendRuntime; codex: BridgeVoicePlane }) {
    this.#runtime = options.runtime;
    this.#codex = options.codex;
  }

  async #requireCodex(): Promise<BridgeVoicePlane> {
    if ((await this.#runtime.inspect()).backendKind === "copilot") {
      throw new Error("Voice sessions are not supported on the Copilot backend.");
    }
    return this.#codex;
  }

  start(params?: VoiceStartParams, emit?: (event: BridgeEvent) => void): Promise<VoiceSessionState> { return this.#requireCodex().then((plane) => plane.start(params, emit)); }
  appendText(params: VoiceAppendTextParams) { return this.#requireCodex().then((plane) => plane.appendText(params)); }
  appendAudio(params: VoiceAppendAudioParams) { return this.#requireCodex().then((plane) => plane.appendAudio(params)); }
  stop(params?: VoiceStopParams) { return this.#requireCodex().then((plane) => plane.stop(params)); }
}

export class SwitchingImagePlane implements BridgeImagePlane {
  readonly #runtime: ActiveBackendRuntime;
  readonly #codex: BridgeImagePlane;

  constructor(options: { runtime: ActiveBackendRuntime; codex: BridgeImagePlane }) {
    this.#runtime = options.runtime;
    this.#codex = options.codex;
  }

  async #requireCodex(): Promise<BridgeImagePlane> {
    if ((await this.#runtime.inspect()).backendKind === "copilot") {
      throw new Error("Image generation and editing are not supported on the Copilot backend.");
    }
    return this.#codex;
  }

  startEdit(params: ImageEditParams) { return this.#requireCodex().then((plane) => plane.startEdit(params)); }
  startGenerate(params: ImageGenerateParams, emit?: (event: BridgeEvent) => void) { return this.#requireCodex().then((plane) => plane.startGenerate(params, emit)); }
  previewEdit(params: ImagePreviewParams) { return this.#requireCodex().then((plane) => plane.previewEdit(params)); }
  readAsset(params: ImageAssetReadParams) { return this.#requireCodex().then((plane) => plane.readAsset(params)); }
  deleteAsset(params: ImageAssetDeleteParams) { return this.#requireCodex().then((plane) => plane.deleteAsset(params)); }
  describeAssetFolder() { return this.#requireCodex().then((plane) => plane.describeAssetFolder()); }
  openAssetFolder(params?: { folder?: string | null }) { return this.#requireCodex().then((plane) => plane.openAssetFolder(params)); }
}

export function emitThrough(
  emit: ((event: BridgeEvent) => void) | undefined,
  fallback: ((event: BridgeEvent) => void) | undefined,
): (event: BridgeEvent) => void {
  return emit ?? fallback ?? (() => undefined);
}
