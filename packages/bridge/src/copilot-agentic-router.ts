import { createFallbackAgenticRoutePlan, normalizeAgenticRoutePlan, type AgenticRouteInput, type AgenticRoutePlan } from "@codex-sidepanel/shared";

import { CopilotAcpRunner } from "./copilot-acp.js";
import { createAgenticRoutePrompt, extractJsonObject } from "./agentic-router.js";
import type { BridgeHarnessRuntime } from "./harness.js";
import type { BridgeEvent, BridgeRoutePlane } from "./types.js";

type RuntimeResolver = () => Promise<{
  resolvedCommand: string;
}>;

export class CopilotAgenticRouterPlane implements BridgeRoutePlane {
  readonly #resolveRuntime: RuntimeResolver;
  readonly #harness: BridgeHarnessRuntime;

  constructor(options: { resolveRuntime: RuntimeResolver; harness: BridgeHarnessRuntime }) {
    this.#resolveRuntime = options.resolveRuntime;
    this.#harness = options.harness;
  }

  async plan(params: AgenticRouteInput, emit: (event: BridgeEvent) => void): Promise<AgenticRoutePlan> {
    emit({ type: "route.started", clientRequestId: null });
    try {
      const runtime = await this.#resolveRuntime();
      const command = runtime.resolvedCommand.trim();
      if (!command) {
        throw new Error("No Copilot CLI binary was detected.");
      }
      const runner = new CopilotAcpRunner(command);
      const result = await runner.runPrompt({
        cwd: await this.#harness.getWorkspaceRoot(),
        model: params.selectedModel,
        prompt: createAgenticRoutePrompt(params),
      });
      const plan = normalizeAgenticRoutePlan({ ...(extractJsonObject(result.text) as Record<string, unknown>), source: "llm" }, params);
      emit({ type: "route.plan.created", plan });
      return plan;
    } catch (error) {
      const plan = createFallbackAgenticRoutePlan(params, error instanceof Error ? error.message : String(error));
      emit({ type: "route.plan.created", plan });
      return plan;
    }
  }
}
