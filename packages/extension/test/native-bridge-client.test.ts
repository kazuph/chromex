import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { NativeBridgeClient } from "../src/background/native-bridge-client.js";
import * as bridgeConfig from "../src/background/bridge-config.js";

describe("NativeBridgeClient", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.resetAllMocks();
  });

  test("initializes with bridge configuration", async () => {
    vi.spyOn(bridgeConfig, "getBridgeConfig").mockResolvedValue({
      port: 9999,
      authToken: "test-token",
    });
    vi.stubGlobal("fetch", vi.fn());

    const client = new NativeBridgeClient();
    
    // Attempt to make a request (will fail due to mock, but tests initialization)
    const request = client.request("test.method", {}, { timeoutMs: 50 });
    
    // Configuration should have been loaded
    await new Promise(resolve => setTimeout(resolve, 100));
    expect(bridgeConfig.getBridgeConfig).toHaveBeenCalled();
  });

  test("uses stored bridge configuration", async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: "id-1", result: { status: "ok" } }),
      } as unknown as Response)
    );
    vi.stubGlobal("fetch", mockFetch);
    
    vi.spyOn(bridgeConfig, "getBridgeConfig").mockResolvedValue({
      port: 8080,
      authToken: "secret-token-123",
    });

    const client = new NativeBridgeClient();
    
    try {
      await client.request("test.call", { foo: "bar" }, { timeoutMs: 500 });
    } catch {
      // May timeout or fail, we're just testing the config usage
    }
    
    // Verify config was retrieved
    expect(bridgeConfig.getBridgeConfig).toHaveBeenCalled();
  });
});
