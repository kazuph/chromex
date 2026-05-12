import { afterEach, describe, expect, test } from "vitest";

import { HttpBridgeServer } from "../src/http-server.js";

const servers: HttpBridgeServer[] = [];

afterEach(async () => {
  while (servers.length) {
    const server = servers.pop();
    if (server) {
      await server.stop();
    }
  }
});

function createTestServer() {
  const relay = {
    subscribe: () => () => undefined,
    sendToBridge: async (message: { method: string }) => ({ ok: true, method: message.method }),
    restartBridge: async () => undefined,
  };
  const port = 19000 + Math.floor(Math.random() * 1000);
  const server = new HttpBridgeServer(relay as never, {
    port,
    allowedOrigins: ["chrome-extension://menmlhahmendmkiicbjihgjhppkgaeom"],
  });
  servers.push(server);
  return { server, port };
}

describe("http bridge server", () => {
  test("accepts bootstrap requests without an Origin header", async () => {
    const { server, port } = createTestServer();
    await server.start();

    const response = await fetch(`http://127.0.0.1:${port}/bootstrap`);
    const payload = (await response.json()) as { authToken: string; rpcUrl: string; eventsUrl: string };

    expect(response.status).toBe(200);
    expect(payload.authToken).toBeTruthy();
    expect(payload.rpcUrl).toContain(`/rpc`);
    expect(payload.eventsUrl).toContain(`/events`);
  });

  test("rejects bootstrap requests from disallowed web origins", async () => {
    const { server, port } = createTestServer();
    await server.start();

    const response = await fetch(`http://127.0.0.1:${port}/bootstrap`, {
      headers: {
        Origin: "http://evil.example",
      },
    });

    expect(response.status).toBe(403);
  });

  test("accepts authenticated rpc requests without an Origin header", async () => {
    const { server, port } = createTestServer();
    const started = await server.start();

    const response = await fetch(`http://127.0.0.1:${port}/rpc`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${started.authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: "1",
        method: "account.status",
        params: {},
      }),
    });
    const payload = (await response.json()) as { result: { ok: boolean; method: string } };

    expect(response.status).toBe(200);
    expect(payload.result).toEqual({ ok: true, method: "account.status" });
  });

  test("restarts the bridge subprocess through an authenticated control endpoint", async () => {
    let restarted = false;
    const relay = {
      subscribe: () => () => undefined,
      sendToBridge: async (message: { method: string }) => ({ ok: true, method: message.method }),
      restartBridge: async () => {
        restarted = true;
      },
    };
    const port = 20000 + Math.floor(Math.random() * 1000);
    const server = new HttpBridgeServer(relay as never, {
      port,
      allowedOrigins: ["chrome-extension://menmlhahmendmkiicbjihgjhppkgaeom"],
    });
    servers.push(server);
    const started = await server.start();

    const response = await fetch(`http://127.0.0.1:${port}/bridge/restart`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${started.authToken}`,
        "Content-Type": "application/json",
      },
    });
    const payload = (await response.json()) as { restarted: boolean };

    expect(response.status).toBe(200);
    expect(payload).toEqual({ restarted: true });
    expect(restarted).toBe(true);
  });
});
