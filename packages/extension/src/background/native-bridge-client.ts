type BridgeMessage = {
  id?: string;
  result?: unknown;
  error?: { message: string };
  event?: unknown;
};

type BridgeRequestOptions = {
  timeoutMs?: number;
  timeoutMessage?: string;
};

type PendingBridgeRequest = {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
  timer?: ReturnType<typeof setTimeout>;
};

import { toFriendlyNativeHostErrorMessage } from "./native-host-errors.js";
import { getBridgeConfig } from "./bridge-config.js";

export class NativeBridgeClient {
  #baseUrl: string | null = null;
  #authToken: string | null = null;
  #pending = new Map<string, PendingBridgeRequest>();
  #listeners = new Set<(event: unknown) => void>();
  #initialized = false;
  #initPromise: Promise<void> | null = null;

  subscribe(listener: (event: unknown) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  async request<TResult = unknown>(
    method: string,
    params: Record<string, unknown> = {},
    options: BridgeRequestOptions = {},
  ): Promise<TResult> {
    await this.#ensureInitialized();
    const id = crypto.randomUUID();
    
    const response = new Promise<TResult>((resolve, reject) => {
      const pending: PendingBridgeRequest = {
        resolve: (value: unknown) => resolve(value as TResult),
        reject: (error: Error) => reject(error),
      };
      this.#pending.set(id, pending);
      
      if (options.timeoutMs && options.timeoutMs > 0) {
        pending.timer = setTimeout(() => {
          if (!this.#pending.delete(id)) {
            return;
          }
          reject(new Error(options.timeoutMessage ?? `${method} did not respond in time.`));
        }, options.timeoutMs);
      }
    });

    try {
      const result = await fetch(`${this.#baseUrl}/rpc`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.#authToken}`,
        },
        body: JSON.stringify({ id, method, params }),
      });

      if (!result.ok) {
        throw new Error(`HTTP ${result.status}: ${result.statusText}`);
      }

      const data = (await result.json()) as { id: string; result?: unknown; error?: { message: string } };
      const pending = this.#pending.get(data.id);
      if (pending) {
        this.#pending.delete(data.id);
        if (pending.timer) {
          clearTimeout(pending.timer);
        }
        if (data.error) {
          pending.reject(new Error(data.error.message));
        } else {
          pending.resolve(data.result);
        }
      }
    } catch (error) {
      const pending = this.#pending.get(id);
      if (pending) {
        this.#pending.delete(id);
        if (pending.timer) {
          clearTimeout(pending.timer);
        }
        pending.reject(
          error instanceof Error
            ? error
            : new Error(String(error)),
        );
      }
    }

    return response;
  }

  async #ensureInitialized(): Promise<void> {
    if (this.#initialized) {
      return;
    }

    if (this.#initPromise) {
      return this.#initPromise;
    }

    this.#initPromise = this.#initialize();
    await this.#initPromise;
  }

  async #initialize(): Promise<void> {
    try {
      const config = await getBridgeConfig();
      
      if (config && config.port && config.authToken) {
        this.#baseUrl = `http://127.0.0.1:${config.port}`;
        this.#authToken = config.authToken;
        this.#initialized = true;
        return;
      }
    } catch {
      // Config not available, will throw error below
    }

    throw new Error(
      toFriendlyNativeHostErrorMessage("Bridge is not running. Please check the connection."),
    );
  }
}
