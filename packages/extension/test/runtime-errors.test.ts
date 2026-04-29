import { describe, expect, test } from "vitest";

import { classifyRuntimeMessageError, isRetryableRuntimeMessageError } from "../src/runtime-errors.js";

describe("runtime message error helpers", () => {
  test("classifies closed message channels as transient disconnects", () => {
    const error = new Error(
      "A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received",
    );

    expect(classifyRuntimeMessageError(error)).toBe("transient-disconnect");
    expect(isRetryableRuntimeMessageError(error)).toBe(true);
  });

  test("classifies missing receivers as transient disconnects", () => {
    const error = new Error("Could not establish connection. Receiving end does not exist.");

    expect(classifyRuntimeMessageError(error)).toBe("transient-disconnect");
    expect(isRetryableRuntimeMessageError(error)).toBe(true);
  });

  test("classifies removed frames during tab navigation as transient disconnects", () => {
    const error = new Error("Frame with ID 0 was removed.");

    expect(classifyRuntimeMessageError(error)).toBe("transient-disconnect");
    expect(isRetryableRuntimeMessageError(error)).toBe(true);
  });

  test("classifies raw host-access failures separately", () => {
    const error = new Error(
      "Cannot access contents of url \"https://x.com/home\". Extension manifest must request permission to access this host.",
    );

    expect(classifyRuntimeMessageError(error)).toBe("host-access");
    expect(isRetryableRuntimeMessageError(error)).toBe(false);
  });

  test("leaves unknown failures untouched", () => {
    const error = new Error("server overloaded");

    expect(classifyRuntimeMessageError(error)).toBe("unknown");
    expect(isRetryableRuntimeMessageError(error)).toBe(false);
  });
});
