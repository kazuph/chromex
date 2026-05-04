export interface CatalogRefreshDecisionInput {
  inFlight: boolean;
  lastRequestedWorkspaceRoot: string | null;
  workspaceRoot: string | undefined;
  force: boolean | undefined;
}

export interface CatalogAffectingSettingsInput {
  previousWorkspaceRoot: string | undefined;
  nextWorkspaceRoot: string | undefined;
  previousCodexBinPath: string | undefined;
  nextCodexBinPath: string | undefined;
}

export function normalizeCatalogWorkspaceRoot(workspaceRoot?: string): string {
  return workspaceRoot?.trim() ?? "";
}

export function normalizeCatalogSettingsPath(value?: string): string {
  let normalized = value?.trim() ?? "";
  while (
    normalized.length >= 2 &&
    ((normalized.startsWith("\"") && normalized.endsWith("\"")) ||
      (normalized.startsWith("'") && normalized.endsWith("'")))
  ) {
    normalized = normalized.slice(1, -1).trim();
  }
  return normalized;
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

export function shouldRefreshCatalogAfterSettingsUpdate(input: CatalogAffectingSettingsInput): boolean {
  return (
    normalizeCatalogSettingsPath(input.previousWorkspaceRoot) !== normalizeCatalogSettingsPath(input.nextWorkspaceRoot) ||
    normalizeCatalogSettingsPath(input.previousCodexBinPath) !== normalizeCatalogSettingsPath(input.nextCodexBinPath)
  );
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
