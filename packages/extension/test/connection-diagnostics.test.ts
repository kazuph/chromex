import { describe, expect, test } from "vitest";

import {
  getCodexBinaryHealth,
  getNativeHostHealth,
} from "../src/sidepanel/connection-diagnostics.js";

const readyRuntime = {
  codexBinSource: "path" as const,
  configuredCodexBinPathInvalid: false,
};

describe("connection diagnostics", () => {
  test("shows setup-needed when the native host is missing", () => {
    expect(
      getNativeHostHealth({
        modelCatalogState: "error",
        modelCatalogErrorMessage:
          "Codex native host is not installed for this browser profile yet. Install the local bridge once.",
      }),
    ).toEqual({
      status: "setup-needed",
      tone: "warn",
      detailSource: "error",
    });
  });

  test("shows reconnect when the native host disconnected", () => {
    expect(
      getNativeHostHealth({
        modelCatalogState: "error",
        modelCatalogErrorMessage: "The Codex native host disconnected.",
      }),
    ).toEqual({
      status: "reconnect",
      tone: "warn",
      detailSource: "error",
    });
  });

  test("shows reconnect when the native host launcher exits immediately", () => {
    expect(
      getNativeHostHealth({
        modelCatalogState: "error",
        modelCatalogErrorMessage: "The Codex native host was found but exited immediately.",
      }),
    ).toEqual({
      status: "reconnect",
      tone: "warn",
      detailSource: "error",
    });
  });

  test("does not blame native host for unrelated model catalog failures", () => {
    expect(
      getNativeHostHealth({
        modelCatalogState: "error",
        modelCatalogErrorMessage: "OpenAI authentication is required.",
      }),
    ).toEqual({
      status: "connected",
      tone: "ok",
      detailSource: "default",
    });
  });

  test("keeps Codex binary pending until the native host is usable", () => {
    expect(
      getCodexBinaryHealth({
        nativeHostStatus: "setup-needed",
        runtimeConfig: readyRuntime,
        modelCatalogState: "ready",
        modelCatalogErrorMessage: "",
        accountStatus: null,
      }),
    ).toEqual({
      status: "pending",
      tone: "neutral",
      detailSource: "waiting-for-host",
    });
  });

  test("warns when Codex cannot be auto-detected after the host is usable", () => {
    expect(
      getCodexBinaryHealth({
        nativeHostStatus: "connected",
        runtimeConfig: {
          codexBinSource: "missing",
          configuredCodexBinPathInvalid: false,
        },
        modelCatalogState: "error",
        modelCatalogErrorMessage: 'Failed to start codex app-server with "codex": spawn codex ENOENT',
        accountStatus: null,
      }),
    ).toEqual({
      status: "not-detected",
      tone: "warn",
      detailSource: "missing",
    });
  });

  test("trusts a successful model catalog even when Codex path detection is missing", () => {
    expect(
      getCodexBinaryHealth({
        nativeHostStatus: "connected",
        runtimeConfig: {
          codexBinSource: "missing",
          configuredCodexBinPathInvalid: false,
        },
        modelCatalogState: "ready",
        modelCatalogErrorMessage: "",
        accountStatus: null,
      }),
    ).toEqual({
      status: "automatic",
      tone: "ok",
      detailSource: "detected",
    });
  });

  test("keeps Codex binary pending while the model catalog is still loading", () => {
    expect(
      getCodexBinaryHealth({
        nativeHostStatus: "connected",
        runtimeConfig: {
          codexBinSource: "missing",
          configuredCodexBinPathInvalid: false,
        },
        modelCatalogState: "loading",
        modelCatalogErrorMessage: "",
        accountStatus: null,
      }),
    ).toEqual({
      status: "pending",
      tone: "neutral",
      detailSource: "waiting-for-host",
    });
  });

  test("trusts an authenticated Codex account even before runtime path diagnostics settle", () => {
    expect(
      getCodexBinaryHealth({
        nativeHostStatus: "connected",
        runtimeConfig: {
          codexBinSource: "missing",
          configuredCodexBinPathInvalid: false,
        },
        modelCatalogState: "loading",
        modelCatalogErrorMessage: "",
        accountStatus: { codexAuthenticated: true },
      }),
    ).toEqual({
      status: "connected",
      tone: "ok",
      detailSource: "detected",
    });
  });

  test("keeps runtime detection pending when the catalog failed for a non-runtime reason", () => {
    expect(
      getCodexBinaryHealth({
        nativeHostStatus: "connected",
        runtimeConfig: {
          codexBinSource: "missing",
          configuredCodexBinPathInvalid: false,
        },
        modelCatalogState: "error",
        modelCatalogErrorMessage: "workspace.harness.read timed out after 4000ms",
        accountStatus: null,
      }),
    ).toEqual({
      status: "pending",
      tone: "neutral",
      detailSource: "waiting-for-host",
    });
  });
});
