import { describe, expect, it } from "vitest";

import {
  getStandardBoardWarning,
  quoteFormDefaults,
  quoteFormSchema,
} from "./quote-form";

describe("quoteFormSchema", () => {
  it("rejects empty required numeric fields", () => {
    const result = quoteFormSchema.safeParse(quoteFormDefaults);

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    const issues = result.error.flatten().fieldErrors;

    expect(issues.W?.[0]).toContain("宽度");
    expect(issues.D?.[0]).toContain("进深");
    expect(issues.H?.[0]).toContain("高度");
    expect(issues.unitPrice?.[0]).toContain("板材单价");
  });

  it("rejects invalid characters and out-of-range numbers", () => {
    const result = quoteFormSchema.safeParse({
      ...quoteFormDefaults,
      W: "12a",
      D: "1300",
      H: "0",
      shelfHCount: "11",
      shelfVCount: "-1",
      unitPrice: "18.999",
      hardwareFee: "-8",
    });

    expect(result.success).toBe(false);
    if (result.success) {
      return;
    }

    const issues = result.error.flatten().fieldErrors;

    expect(issues.W?.[0]).toContain("整数");
    expect(issues.D?.[0]).toContain("1 ~ 1200");
    expect(issues.H?.[0]).toContain("1 ~ 2400");
    expect(issues.shelfHCount?.[0]).toContain("0 ~ 10");
    expect(issues.shelfVCount?.[0]).toContain("0 ~ 10");
    expect(issues.unitPrice?.[0]).toContain("最多 2 位小数");
    expect(issues.hardwareFee?.[0]).toContain("0 ~ 99999.99");
  });
});

describe("getStandardBoardWarning", () => {
  it("returns a warning when any dimension exceeds the standard board size", () => {
    expect(
      getStandardBoardWarning({
        ...quoteFormDefaults,
        W: "2500",
        D: "500",
        H: "750",
      }),
    ).toBe("超出标准板材 1200×2400，建议分柜");

    expect(
      getStandardBoardWarning({
        ...quoteFormDefaults,
        W: "580",
        D: "1300",
        H: "750",
      }),
    ).toBe("超出标准板材 1200×2400，建议分柜");
  });

  it("returns null for missing or standard-size dimensions", () => {
    expect(
      getStandardBoardWarning({
        ...quoteFormDefaults,
        W: "",
        D: "500",
        H: "750",
      }),
    ).toBeNull();

    expect(
      getStandardBoardWarning({
        ...quoteFormDefaults,
        W: "580",
        D: "500",
        H: "750",
      }),
    ).toBeNull();
  });
});
