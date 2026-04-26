import { describe, expect, test } from "vitest";

import { isRecoverableTurnSteerError } from "../src/background/turn-steer-recovery.js";

describe("turn steer recovery", () => {
  test("treats stale active-turn errors as recoverable", () => {
    expect(isRecoverableTurnSteerError(new Error("no active turn to steer"))).toBe(true);
  });

  test("does not hide unrelated app-server errors", () => {
    expect(isRecoverableTurnSteerError(new Error("model not available"))).toBe(false);
  });
});
