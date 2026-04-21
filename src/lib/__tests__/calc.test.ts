import { describe, expect, it } from "vitest";

import { calculateAccurate, calculateQuick } from "../calc";
import { fmtMoney } from "../format";

describe("calculateAccurate", () => {
  it("Case 1: matches the v1.3 accurate benchmark", () => {
    const result = calculateAccurate({
      W: 580,
      D: 500,
      H: 750,
      boardThickness: 18,
      shelfHCount: 1,
      shelfVCount: 0,
      hasDoor: true,
      doorW: 580,
      doorH: 750,
      doorCount: 1,
      doorUnitPrice: 180,
      isNonStd: false,
      hardwareFee: 350,
      unitPrice: 100,
    });

    expect(result.cabinetAreaM2).toBeCloseTo(1.881984, 5);
    expect(result.doorAreaM2).toBe(0.435);
    expect(result.cabinetCost).toBeCloseTo(188.1984, 3);
    expect(result.doorCost).toBeCloseTo(78.3, 3);
    expect(result.coeff).toBe(1.0);
    expect(result.finalPrice).toBeCloseTo(616.4984, 3);
    expect(Number(fmtMoney(result.finalPrice))).toBe(616.5);
  });

  it("Case 2: ignores all door fields and keeps full depth when hasDoor is false", () => {
    const result = calculateAccurate({
      W: 580,
      D: 500,
      H: 750,
      boardThickness: 18,
      shelfHCount: 1,
      shelfVCount: 0,
      hasDoor: false,
      doorW: 999,
      doorH: 999,
      doorCount: 6,
      doorUnitPrice: 9999,
      isNonStd: false,
      hardwareFee: 0,
      unitPrice: 100,
    });

    expect(result.cabinetAreaM2).toBeCloseTo(1.944624, 5);
    expect(result.cabinetCost).toBeCloseTo(194.4624, 3);
    expect(result.doorParts.length).toBe(0);
    expect(result.doorCost).toBeCloseTo(0, 3);
    expect(result.finalPrice).toBeCloseTo(194.4624, 3);
    expect(Number(fmtMoney(result.finalPrice))).toBe(194.46);
  });

  it("Case 3: applies door depth compensation to center vertical panels", () => {
    const result = calculateAccurate({
      W: 580,
      D: 500,
      H: 750,
      boardThickness: 18,
      shelfHCount: 1,
      shelfVCount: 2,
      hasDoor: true,
      doorW: 580,
      doorH: 750,
      doorCount: 1,
      doorUnitPrice: 180,
      isNonStd: false,
      hardwareFee: 350,
      unitPrice: 100,
    });

    expect(result.cabinetAreaM2).toBeCloseTo(2.54172, 5);
    expect(result.cabinetCost).toBeCloseTo(254.172, 3);
    expect(result.finalPrice).toBeCloseTo(682.472, 3);
    expect(Number(fmtMoney(result.finalPrice))).toBe(682.47);
  });

  it("Case 4: applies the non-standard coefficient to cabinet and door costs", () => {
    const result = calculateAccurate({
      W: 1000,
      D: 500,
      H: 2000,
      boardThickness: 18,
      shelfHCount: 0,
      shelfVCount: 0,
      hasDoor: true,
      doorW: 1000,
      doorH: 2000,
      doorCount: 2,
      doorUnitPrice: 200,
      isNonStd: true,
      hardwareFee: 0,
      unitPrice: 120,
    });

    expect(result.cabinetCost).toBeCloseTo(568.64832, 3);
    expect(result.doorCost).toBeCloseTo(800, 3);
    expect(result.finalPrice).toBeCloseTo(1642.378, 3);
    expect(result.finalPrice).not.toBeCloseTo(568.64832 * 1.2 + 800, 3);
    expect(Number(fmtMoney(result.finalPrice))).toBe(1642.38);
  });

  it("Case 5: keeps hardware outside the non-standard coefficient", () => {
    const result = calculateAccurate({
      W: 1000,
      D: 500,
      H: 1000,
      boardThickness: 18,
      shelfHCount: 0,
      shelfVCount: 0,
      hasDoor: false,
      isNonStd: true,
      hardwareFee: 1000,
      unitPrice: 100,
    });

    expect(result.cabinetCost).toBeCloseTo(289.3296, 3);
    expect(result.finalPrice).toBeCloseTo(1347.196, 3);
    expect(result.finalPrice).not.toBeCloseTo(1547.196, 3);
    expect(Number(fmtMoney(result.finalPrice))).toBe(1347.2);
  });
});

describe("calculateQuick", () => {
  it("Case 6: matches the quick estimate benchmark", () => {
    const result = calculateQuick({
      W: 580,
      H: 750,
      projectionUnitPrice: 1500,
    });

    expect(result.projectionAreaM2).toBe(0.435);
    expect(result.projectionEstimate).toBeCloseTo(652.5, 3);
    expect(Number(fmtMoney(result.projectionEstimate))).toBe(652.5);
  });

  it("Case 7: only accepts quick-estimate fields", () => {
    calculateQuick({
      W: 580,
      H: 750,
      projectionUnitPrice: 1500,
    });

    calculateQuick({
      W: 580,
      H: 750,
      projectionUnitPrice: 1500,
      // @ts-expect-error calculateQuick input must not include accurate-only fields.
      isNonStd: true,
    });

    calculateQuick({
      W: 580,
      H: 750,
      projectionUnitPrice: 1500,
      // @ts-expect-error calculateQuick input must not include accurate-only fields.
      hardwareFee: 350,
    });

    calculateQuick({
      W: 580,
      H: 750,
      projectionUnitPrice: 1500,
      // @ts-expect-error calculateQuick input must not include accurate-only fields.
      hasDoor: true,
    });

    calculateQuick({
      W: 580,
      H: 750,
      projectionUnitPrice: 1500,
      // @ts-expect-error calculateQuick input must not include accurate-only fields.
      unitPrice: 100,
    });
  });
});
