import { afterEach, describe, expect, test, vi } from "vitest";

import { NativeBridgeClient } from "../src/background/native-bridge-client.js";

describe("NativeBridgeClient", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  test("bootstraps over localhost and sends rpc requests", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            authToken: "token-123",
            rpcUrl: "http://127.0.0.1:8765/rpc",
            eventsUrl: "http://127.0.0.1:8765/events",
          }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('{"ready":true}\n'));
          },
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ result: { ok: true } }),
      } as Response);

    vi.stubGlobal("fetch", fetchMock);

    const client = new NativeBridgeClient();
    const unsubscribe = client.subscribe(() => undefined);
    await expect(client.request<{ ok: true }>("model.list")).resolves.toEqual({ ok: true });
    unsubscribe();

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "http://127.0.0.1:8765/bootstrap",
      expect.objectContaining({ method: "GET" }),
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "http://127.0.0.1:8765/rpc",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer token-123",
          "Content-Type": "application/json",
        }),
      }),
    );
  });

  test("forwards streamed bridge events to subscribers", async () => {
    const received: unknown[] = [];
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"ready":true}\n{"event":{"type":"turn.started"}}\n'));
      },
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            authToken: "token-123",
            rpcUrl: "http://127.0.0.1:8765/rpc",
            eventsUrl: "http://127.0.0.1:8765/events",
          }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        body: stream,
      } as Response);
    vi.stubGlobal("fetch", fetchMock);

    const client = new NativeBridgeClient();
    const unsubscribe = client.subscribe((event) => {
      received.push(event);
    });

    await vi.waitFor(() => {
      expect(received).toEqual([{ type: "turn.started" }]);
    });

    unsubscribe();
  });
});
