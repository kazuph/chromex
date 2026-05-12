import { randomBytes } from "node:crypto";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

import type { NativeHostRelay } from "./relay.js";

type HttpRequestMessage = {
  id: string;
  method: string;
  params: Record<string, unknown>;
};

type BootstrapResponse = {
  authToken: string;
  rpcUrl: string;
  eventsUrl: string;
};

type HttpBridgeServerOptions = {
  port?: number;
  allowedOrigins?: string[];
};

type EventClient = {
  response: ServerResponse;
};

const DEFAULT_PORT = 8765;

export class HttpBridgeServer {
  readonly #relay: NativeHostRelay;
  readonly #port: number;
  readonly #authToken: string;
  readonly #allowedOrigins: Set<string>;
  readonly #eventClients = new Set<EventClient>();
  #server: Server | null = null;
  #unsubscribeRelay: (() => void) | null = null;

  constructor(relay: NativeHostRelay, options: HttpBridgeServerOptions = {}) {
    this.#relay = relay;
    this.#port = options.port ?? DEFAULT_PORT;
    this.#authToken = randomBytes(32).toString("hex");
    this.#allowedOrigins = new Set((options.allowedOrigins ?? []).filter(Boolean));
  }

  async start(): Promise<{ port: number; authToken: string }> {
    if (this.#server) {
      return { port: this.#port, authToken: this.#authToken };
    }

    this.#unsubscribeRelay = this.#relay.subscribe((event) => {
      this.#broadcastEvent(event);
    });

    this.#server = createServer((req, res) => {
      void this.#handleRequest(req, res);
    });

    await new Promise<void>((resolve, reject) => {
      this.#server?.once("error", reject);
      this.#server?.listen(this.#port, "127.0.0.1", () => {
        resolve();
      });
    });

    return { port: this.#port, authToken: this.#authToken };
  }

  async stop(): Promise<void> {
    this.#unsubscribeRelay?.();
    this.#unsubscribeRelay = null;
    for (const client of this.#eventClients) {
      client.response.end();
    }
    this.#eventClients.clear();
    await new Promise<void>((resolve, reject) => {
      if (!this.#server) {
        resolve();
        return;
      }
      this.#server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    this.#server = null;
  }

  async #handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const origin = this.#resolveAllowedOrigin(req);
    if (req.method === "OPTIONS") {
      this.#writeCors(res, origin);
      res.writeHead(origin === false ? 403 : 204);
      res.end();
      return;
    }

    if (req.url === "/bootstrap" && req.method === "GET") {
      if (origin === false) {
        res.writeHead(403);
        res.end(JSON.stringify({ error: "Forbidden origin" }));
        return;
      }
      this.#writeCors(res, origin);
      this.#writeJson(res, 200, {
        authToken: this.#authToken,
        rpcUrl: `http://127.0.0.1:${this.#port}/rpc`,
        eventsUrl: `http://127.0.0.1:${this.#port}/events`,
      } satisfies BootstrapResponse);
      return;
    }

    if (origin === false) {
      res.writeHead(403);
      res.end(JSON.stringify({ error: "Forbidden origin" }));
      return;
    }

    this.#writeCors(res, origin);

    if (!this.#isAuthorized(req)) {
      this.#writeJson(res, 401, { error: "Unauthorized" });
      return;
    }

    if (req.url === "/events" && req.method === "GET") {
      res.writeHead(200, {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      });
      const client = { response: res };
      this.#eventClients.add(client);
      res.write(`${JSON.stringify({ ready: true })}\n`);
      req.on("close", () => {
        this.#eventClients.delete(client);
      });
      return;
    }

    if (req.url === "/rpc" && req.method === "POST") {
      const body = await this.#readBody(req);
      try {
        const message = JSON.parse(body) as HttpRequestMessage;
        const result = await this.#relay.sendToBridge(message);
        this.#writeJson(res, 200, { id: message.id, result });
      } catch (error) {
        this.#writeJson(res, 500, {
          error: {
            message: error instanceof Error ? error.message : "Unknown error",
          },
        });
      }
      return;
    }

    this.#writeJson(res, 404, { error: "Not found" });
  }

  #broadcastEvent(event: unknown): void {
    const payload = `${JSON.stringify({ event })}\n`;
    for (const client of this.#eventClients) {
      if (client.response.writableEnded || client.response.destroyed) {
        this.#eventClients.delete(client);
        continue;
      }
      client.response.write(payload);
    }
  }

  #resolveAllowedOrigin(req: IncomingMessage): string | null | false {
    const origin = req.headers.origin;
    if (typeof origin !== "string" || !origin) {
      return null;
    }
    return this.#allowedOrigins.has(origin) ? origin : false;
  }

  #isAuthorized(req: IncomingMessage): boolean {
    const auth = req.headers.authorization;
    return typeof auth === "string" && auth === `Bearer ${this.#authToken}`;
  }

  #writeCors(res: ServerResponse, origin: string | null | false): void {
    if (!origin) {
      return;
    }
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Authorization,Content-Type");
  }

  #writeJson(res: ServerResponse, status: number, payload: unknown): void {
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(payload));
  }

  async #readBody(req: IncomingMessage): Promise<string> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks).toString("utf8");
  }
}

export const DEFAULT_HTTP_BRIDGE_PORT = DEFAULT_PORT;
