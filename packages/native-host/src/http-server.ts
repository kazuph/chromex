import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomBytes } from "node:crypto";
import type { NativeHostRelay } from "./relay.js";

type HttpRequestMessage = {
  id: string;
  method: string;
  params: Record<string, unknown>;
};

type HttpResponseMessage = {
  id: string;
  result?: unknown;
  error?: { message: string };
};

export class HttpBridgeServer {
  #relay: NativeHostRelay;
  #port: number;
  #authToken: string;
  #pendingResponses = new Map<string, (msg: HttpResponseMessage) => void>();

  constructor(relay: NativeHostRelay, port: number = 0) {
    this.#relay = relay;
    this.#port = port;
    this.#authToken = randomBytes(32).toString("hex");
  }

  async start(): Promise<{ port: number; authToken: string }> {
    return new Promise((resolve, reject) => {
      const server = createServer((req, res) => {
        this.#handleRequest(req, res);
      });

      server.listen(this.#port, "127.0.0.1", () => {
        const addr = server.address();
        if (addr && typeof addr !== "string") {
          this.#port = addr.port;
          console.error(
            JSON.stringify({
              event: "http_server_started",
              port: this.#port,
              authToken: this.#authToken,
            }),
          );
          resolve({ port: this.#port, authToken: this.#authToken });
        }
      });

      server.on("error", reject);
    });
  }

  setResponseHandler(handler: (msg: HttpResponseMessage) => void): void {
    // For now, responses are sent directly to waiting requests
    // This is a placeholder for future extension
  }

  async sendRequest(method: string, params: Record<string, unknown>): Promise<unknown> {
    const id = randomBytes(16).toString("hex");
    return this.#relay.sendToBridge({ id, method, params });
  }

  #handleRequest(req: IncomingMessage, res: ServerResponse): void {
    if (req.method !== "POST" || req.url !== "/rpc") {
      res.writeHead(404);
      res.end();
      return;
    }

    const auth = req.headers.authorization?.replace("Bearer ", "");
    if (auth !== this.#authToken) {
      res.writeHead(401);
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", async () => {
      try {
        const message = JSON.parse(body) as HttpRequestMessage;
        const result = await this.#relay.sendToBridge(message);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ id: message.id, result }));
      } catch (error) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: {
              message: error instanceof Error ? error.message : "Unknown error",
            },
          }),
        );
      }
    });
  }
}
