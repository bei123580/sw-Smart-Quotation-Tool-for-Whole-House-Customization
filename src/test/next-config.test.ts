import { describe, expect, it } from "vitest";

describe("next.config.mjs", () => {
  it("enables static export output", async () => {
    const nextConfigModule = await import("../../next.config.mjs");

    expect(nextConfigModule.default.output).toBe("export");
  });
});
