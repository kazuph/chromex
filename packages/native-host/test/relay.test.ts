import { describe, expect, test } from "vitest";

import { getBridgeResponseTimeoutMs } from "../src/relay.js";

describe("getBridgeResponseTimeoutMs", () => {
  test("keeps the default timeout for normal bridge methods", () => {
    expect(getBridgeResponseTimeoutMs("account.status")).toBe(30_000);
    expect(getBridgeResponseTimeoutMs("prompt.send")).toBe(30_000);
  });

  test("uses the longer image-edit timeout for edit workflows", () => {
    expect(getBridgeResponseTimeoutMs("image.edit.start")).toBe(20 * 60 * 1000);
  });

  test("uses the longest timeout for image generation workflows", () => {
    expect(getBridgeResponseTimeoutMs("image.generate.start")).toBe(60 * 60 * 1000);
  });
});
