import { describe, expect, test } from "vitest";

import { assertApiKeyLoginExplicitlyConfirmed } from "../src/background/api-key-login-guard.js";

describe("API-key login guard", () => {
  test("does not block ChatGPT OAuth login", () => {
    expect(() => assertApiKeyLoginExplicitlyConfirmed({ loginType: "chatgpt" })).not.toThrow();
  });

  test("allows a newly entered API key", () => {
    expect(() =>
      assertApiKeyLoginExplicitlyConfirmed({
        loginType: "apiKey",
        apiKey: "sk-test",
      }),
    ).not.toThrow();
  });

  test("requires explicit confirmation before reusing a stored API key", () => {
    expect(() => assertApiKeyLoginExplicitlyConfirmed({ loginType: "apiKey" })).toThrow(
      /explicit user confirmation/u,
    );
    expect(() =>
      assertApiKeyLoginExplicitlyConfirmed({
        loginType: "apiKey",
        confirmed: true,
      }),
    ).not.toThrow();
  });
});
