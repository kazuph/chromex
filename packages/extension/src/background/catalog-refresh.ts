export interface CatalogRefreshDecisionInput {
  inFlight: boolean;
  lastRequestedWorkspaceRoot: string | null;
  workspaceRoot: string | undefined;
  force: boolean | undefined;
}

export function normalizeCatalogWorkspaceRoot(workspaceRoot?: string): string {
  return workspaceRoot?.trim() ?? "";
}

export function shouldTriggerCatalogRefresh(input: CatalogRefreshDecisionInput): boolean {
  if (input.inFlight) {
    return false;
  }

  if (input.force) {
    return true;
  }

  return normalizeCatalogWorkspaceRoot(input.workspaceRoot) !== input.lastRequestedWorkspaceRoot;
}

export function resolveCatalogModelState(input: {
  modelRequestFailed: boolean;
  models: unknown[];
}): "loading" | "ready" | "empty" | "error" {
  if (input.modelRequestFailed) {
    return "error";
  }

  return input.models.length ? "ready" : "empty";
}

export function resolveSelectedCatalogModel(input: {
  selectedModel: string | null | undefined;
  models: Array<{ id: string; isDefault?: boolean }>;
}): string {
  const selectedModel = input.selectedModel?.trim() ?? "";
  if (selectedModel && input.models.some((model) => model.id === selectedModel)) {
    return selectedModel;
  }

  return input.models.find((model) => model.isDefault)?.id ?? input.models[0]?.id ?? "";
}
