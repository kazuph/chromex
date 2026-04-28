import { describe, expect, test } from "vitest";

import { createBridgeProcessEnv } from "../src/index.js";

describe("createBridgeProcessEnv", () => {
  test("forwards only the allowlisted environment values needed by the bridge", () => {
    const env = createBridgeProcessEnv(
      {
        PATH: "/usr/bin",
        HOME: "/Users/example",
        HTTPS_PROXY: "http://proxy.internal:8080",
        OPENAI_API_KEY: "test-openai-key",
        AWS_SECRET_ACCESS_KEY: "should-not-leak",
      },
      { codexBinPath: "/opt/codex/bin/codex" },
    );

    expect(env.PATH).toBe("/usr/bin");
    expect(env.HOME).toBe("/Users/example");
    expect(env.HTTPS_PROXY).toBe("http://proxy.internal:8080");
    expect(env.OPENAI_API_KEY).toBe("test-openai-key");
    expect(env.CODEX_BIN).toBe("/opt/codex/bin/codex");
    expect(env.AWS_SECRET_ACCESS_KEY).toBeUndefined();
  });
});
