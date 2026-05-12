import type { BrowserDomActionPlan, BrowserDomSnapshot } from "@codex-sidepanel/shared";

import { CopilotAcpRunner } from "./copilot-acp.js";
import { createBrowserDomActionPlanPrompt, normalizeBrowserDomActionPlan } from "./browser-actions.js";
import { extractJsonObject } from "./agentic-router.js";
import type { BridgeHarnessRuntime } from "./harness.js";
import type { BridgeBrowserActionPlane, BridgeEvent } from "./types.js";

type RuntimeResolver = () => Promise<{
  resolvedCommand: string;
}>;

export class CopilotBrowserActionPlane implements BridgeBrowserActionPlane {
  readonly #resolveRuntime: RuntimeResolver;
  readonly #harness: BridgeHarnessRuntime;

  constructor(options: { resolveRuntime: RuntimeResolver; harness: BridgeHarnessRuntime }) {
    this.#resolveRuntime = options.resolveRuntime;
    this.#harness = options.harness;
  }

  async plan(
    params: { message: string; snapshot: BrowserDomSnapshot; locale?: string; generatedText?: string },
    emit: (event: BridgeEvent) => void,
  ): Promise<BrowserDomActionPlan> {
    emit({ type: "browser.action.plan.started", clientRequestId: null });
    try {
      const runtime = await this.#resolveRuntime();
      const command = runtime.resolvedCommand.trim();
      if (!command) {
        throw new Error("No Copilot CLI binary was detected.");
      }
      const runner = new CopilotAcpRunner(command);
      const result = await runner.runPrompt({
        cwd: await this.#harness.getWorkspaceRoot(),
        prompt: createBrowserDomActionPlanPrompt(params),
      });
      const plan = normalizeBrowserDomActionPlan(extractJsonObject(result.text), params.snapshot);
      emit({ type: "browser.action.plan.created", plan });
      return plan;
    } catch (error) {
      const plan: BrowserDomActionPlan = {
        shouldAct: false,
        summary: error instanceof Error ? error.message : String(error),
        steps: [],
        requiresConfirmation: true,
        confidence: 0,
      };
      emit({ type: "browser.action.plan.created", plan });
      return plan;
    }
  }
}
