import { describe, expect, test } from "vitest";

import {
  resolveCatalogModelState,
  normalizeCatalogWorkspaceRoot,
  resolveSelectedCatalogModel,
  shouldTriggerCatalogRefresh,
} from "../src/background/catalog-refresh.js";

describe("catalog refresh decisions", () => {
  test("normalizes missing workspace roots", () => {
    expect(normalizeCatalogWorkspaceRoot()).toBe("");
    expect(normalizeCatalogWorkspaceRoot("  /tmp/workspace  ")).toBe("/tmp/workspace");
  });

  test("refreshes before the first request", () => {
    expect(
      shouldTriggerCatalogRefresh({
        inFlight: false,
        lastRequestedWorkspaceRoot: null,
      }),
    ).toBe(true);
  });

  test("does not refresh again for the same workspace root", () => {
    expect(
      shouldTriggerCatalogRefresh({
        inFlight: false,
        lastRequestedWorkspaceRoot: "/tmp/workspace",
        workspaceRoot: "/tmp/workspace",
      }),
    ).toBe(false);
  });

  test("refreshes when the workspace root changes", () => {
    expect(
      shouldTriggerCatalogRefresh({
        inFlight: false,
        lastRequestedWorkspaceRoot: "",
        workspaceRoot: "/tmp/workspace",
      }),
    ).toBe(true);
  });

  test("does not start a second refresh while one is already running", () => {
    expect(
      shouldTriggerCatalogRefresh({
        inFlight: true,
        lastRequestedWorkspaceRoot: "",
        workspaceRoot: "/tmp/workspace",
      }),
    ).toBe(false);
  });

  test("can force a refresh even when the workspace root is unchanged", () => {
    expect(
      shouldTriggerCatalogRefresh({
        inFlight: false,
        lastRequestedWorkspaceRoot: "/tmp/workspace",
        workspaceRoot: "/tmp/workspace",
        force: true,
      }),
    ).toBe(true);
  });

  test("reports a model catalog error when model loading failed", () => {
    expect(resolveCatalogModelState({ modelRequestFailed: true, models: [] })).toBe("error");
  });

  test("reports an empty model catalog only when loading succeeded with no models", () => {
    expect(resolveCatalogModelState({ modelRequestFailed: false, models: [] })).toBe("empty");
  });

  test("reports a ready model catalog when models were loaded", () => {
    expect(resolveCatalogModelState({ modelRequestFailed: false, models: [{ id: "gpt-5.4" }] })).toBe("ready");
  });

  test("keeps a stored model when the app-server catalog still supports it", () => {
    expect(
      resolveSelectedCatalogModel({
        selectedModel: "gpt-5.4",
        models: [
          { id: "gpt-5.5", isDefault: true },
          { id: "gpt-5.4", isDefault: false },
        ],
      }),
    ).toBe("gpt-5.4");
  });

  test("falls back to the app-server default model when the stored model is unsupported", () => {
    expect(
      resolveSelectedCatalogModel({
        selectedModel: "gpt-4.9-retired",
        models: [
          { id: "gpt-5.5", isDefault: true },
          { id: "gpt-5.4", isDefault: false },
        ],
      }),
    ).toBe("gpt-5.5");
  });

  test("falls back to the first catalog model when no default is marked", () => {
    expect(
      resolveSelectedCatalogModel({
        selectedModel: "",
        models: [
          { id: "crest-alpha", isDefault: false },
          { id: "gpt-5.4", isDefault: false },
        ],
      }),
    ).toBe("crest-alpha");
  });
});
