import { toFriendlyNativeHostErrorMessage } from "./native-host-errors.js";

type BridgeEventEnvelope = {
  event?: unknown;
  ready?: boolean;
};

type BridgeRequestOptions = {
  timeoutMs?: number;
  timeoutMessage?: string;
};

type BootstrapPayload = {
  authToken: string;
  rpcUrl: string;
  eventsUrl: string;
};

const DEFAULT_HTTP_BRIDGE_PORT = 8765;
const BOOTSTRAP_URL = `http://127.0.0.1:${DEFAULT_HTTP_BRIDGE_PORT}/bootstrap`;
const EVENT_RECONNECT_DELAY_MS = 1_000;

export class NativeBridgeClient {
  #authToken: string | null = null;
  #rpcUrl: string | null = null;
  #eventsUrl: string | null = null;
  #listeners = new Set<(event: unknown) => void>();
  #initialized = false;
  #initPromise: Promise<void> | null = null;
  #eventStreamPromise: Promise<void> | null = null;
  #eventAbortController: AbortController | null = null;
  #bridgeRestarted = false;

  subscribe(listener: (event: unknown) => void): () => void {
    this.#listeners.add(listener);
    void this.#ensureEventStream();
    return () => {
      this.#listeners.delete(listener);
      if (!this.#listeners.size) {
        this.#stopEventStream();
      }
    };
  }

  async request<TResult = unknown>(
    method: string,
    params: Record<string, unknown> = {},
    options: BridgeRequestOptions = {},
  ): Promise<TResult> {
    await this.#ensureInitialized();
    this.#ensureEventStream();

    const timeoutMs = options.timeoutMs && options.timeoutMs > 0 ? options.timeoutMs : 0;
    const abortController = timeoutMs > 0 ? new AbortController() : null;
    let timedOut = false;
    const timeout =
      timeoutMs > 0
        ? setTimeout(() => {
            timedOut = true;
            abortController?.abort();
          }, timeoutMs)
        : null;

    try {
      const response = await fetch(this.#rpcUrl!, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.#authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          method,
          params,
        }),
        ...(abortController ? { signal: abortController.signal } : {}),
      });
      if (!response.ok) {
        if (response.status === 401) {
          this.#resetBootstrap();
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      const payload = (await response.json()) as { result?: TResult; error?: { message: string } };
      if (payload.error) {
        throw new Error(payload.error.message);
      }
      return payload.result as TResult;
    } catch (error) {
      if (timedOut) {
        throw new Error(options.timeoutMessage ?? `${method} did not respond in time.`);
      }
      throw new Error(
        toFriendlyNativeHostErrorMessage(error instanceof Error ? error.message : String(error)),
      );
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }

  async #ensureInitialized(): Promise<void> {
    if (this.#initialized) {
      return;
    }
    if (!this.#initPromise) {
      this.#initPromise = this.#bootstrap();
    }
    try {
      await this.#initPromise;
    } catch (error) {
      this.#initPromise = null;
      throw error;
    }
  }

  async #bootstrap(): Promise<void> {
    let response: Response;
    try {
      response = await fetch(BOOTSTRAP_URL, {
        method: "GET",
      });
    } catch (error) {
      throw new Error(
        toFriendlyNativeHostErrorMessage(error instanceof Error ? error.message : String(error)),
      );
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const payload = (await response.json()) as BootstrapPayload;
    this.#authToken = payload.authToken;
    this.#rpcUrl = payload.rpcUrl;
    this.#eventsUrl = payload.eventsUrl;
    this.#initialized = true;
    await this.#restartBridgeIfNeeded();
  }

  #ensureEventStream(): void {
    if (!this.#listeners.size) {
      return;
    }
    if (!this.#eventStreamPromise) {
      this.#eventStreamPromise = this.#runEventStream().catch(() => undefined).finally(() => {
        this.#eventStreamPromise = null;
      });
    }
  }

  async #runEventStream(): Promise<void> {
    while (this.#listeners.size) {
      this.#eventAbortController = new AbortController();
      try {
        await this.#ensureInitialized();
        const response = await fetch(this.#eventsUrl!, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.#authToken}`,
          },
          signal: this.#eventAbortController.signal,
        });
        if (!response.ok) {
          if (response.status === 401) {
            this.#resetBootstrap();
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("Bridge event stream is unavailable.");
        }
        const decoder = new TextDecoder();
        let buffered = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            break;
          }
          buffered += decoder.decode(value, { stream: true });
          buffered = this.#flushBufferedEvents(buffered);
        }
      } catch {
        if (!this.#listeners.size) {
          break;
        }
        await delay(EVENT_RECONNECT_DELAY_MS);
      } finally {
        this.#eventAbortController = null;
      }
    }
  }

  #flushBufferedEvents(buffered: string): string {
    const lines = buffered.split("\n");
    const remainder = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      const payload = JSON.parse(trimmed) as BridgeEventEnvelope;
      if (payload.ready || typeof payload.event === "undefined") {
        continue;
      }
      for (const listener of this.#listeners) {
        listener(payload.event);
      }
    }
    return remainder;
  }

  #stopEventStream(): void {
    this.#eventAbortController?.abort();
    this.#eventAbortController = null;
    this.#eventStreamPromise = null;
  }

  #resetBootstrap(): void {
    this.#initialized = false;
    this.#initPromise = null;
    this.#authToken = null;
    this.#rpcUrl = null;
    this.#eventsUrl = null;
    this.#bridgeRestarted = false;
    this.#stopEventStream();
  }

  async #restartBridgeIfNeeded(): Promise<void> {
    if (this.#bridgeRestarted || !this.#rpcUrl || !this.#authToken) {
      return;
    }
    const restartUrl = this.#rpcUrl.replace(/\/rpc$/u, "/bridge/restart");
    try {
      const response = await fetch(restartUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.#authToken}`,
          "Content-Type": "application/json",
        },
      });
      if (response.status === 404) {
        this.#bridgeRestarted = true;
        return;
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      this.#bridgeRestarted = true;
    } catch (error) {
      throw new Error(
        toFriendlyNativeHostErrorMessage(error instanceof Error ? error.message : String(error)),
      );
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
