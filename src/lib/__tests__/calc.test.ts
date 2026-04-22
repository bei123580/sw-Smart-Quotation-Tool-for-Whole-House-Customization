import { describe, expect, it } from "vitest";

import { calculateAccurate, calculateQuick, type QuickInput } from "../calc";

describe("calculateAccurate", () => {
  it("Case 1: v1.3 accurate benchmark", () => {
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
    expect(result.doorCost).toBe(78.3);
    expect(result.coeff).toBe(1.0);
    expect(result.finalPrice).toBeCloseTo(616.4984, 3);
    expect(Number(result.finalPrice.toFixed(2))).toBe(616.5);
    expect(result.cabinetParts.length).toBe(4);
    expect(result.doorParts.length).toBe(1);
  });

  it("Case 2: no door keeps full depth and ignores door fields", () => {
    const result = calculateAccurate({
      W: 580,
      D: 500,
      H: 750,
      boardThickness: 18,
      shelfHCount: 1,
      shelfVCount: 0,
      hasDoor: false,
      isNonStd: false,
      hardwareFee: 0,
      unitPrice: 100,
    });

    expect(result.doorParts.length).toBe(0);
    expect(result.doorCost).toBe(0);
    expect(result.doorAreaM2).toBe(0);
    expect(result.cabinetAreaM2).toBeCloseTo(1.944624, 5);
    expect(result.finalPrice).toBeCloseTo(194.4624, 3);
  });

  it("Case 3: door depth compensation also affects center vertical panels", () => {
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
    expect(result.finalPrice).toBeCloseTo(682.472, 3);
    expect(result.cabinetParts.length).toBe(5);
  });

  it("Case 4: non-standard coefficient applies to cabinet and door together", () => {
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

    expect(result.finalPrice).toBeCloseTo(1642.378, 2);
    expect(result.finalPrice).not.toBe(1482.377984);
    expect(result.cabinetParts.length).toBe(3);
    expect(result.doorParts.length).toBe(1);
  });

  it("Case 5: hardware stays outside the non-standard coefficient", () => {
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

    expect(result.finalPrice).toBeCloseTo(1347.19552, 3);
    expect(result.finalPrice).not.toBe(1547.19552);
  });
});

describe("calculateQuick", () => {
  it("Case 6: quick estimate benchmark", () => {
    const result = calculateQuick({ W: 580, H: 750, projectionUnitPrice: 1500 });

    expect(result.projectionAreaM2).toBe(0.435);
    expect(result.projectionEstimate).toBe(652.5);
  });

  it("Case 7: quick estimate type isolation", () => {
    const quickInput: QuickInput = { W: 100, H: 100, projectionUnitPrice: 1000 };

    expect(quickInput).toEqual({ W: 100, H: 100, projectionUnitPrice: 1000 });

    // @ts-expect-error D 不应在 QuickInput 中
    const q1: QuickInput = { W: 100, H: 100, projectionUnitPrice: 1000, D: 500 };
    // @ts-expect-error boardThickness 不应在 QuickInput 中
    const q2: QuickInput = { W: 100, H: 100, projectionUnitPrice: 1000, boardThickness: 18 };
    // @ts-expect-error shelfHCount 不应在 QuickInput 中
    const q3: QuickInput = { W: 100, H: 100, projectionUnitPrice: 1000, shelfHCount: 1 };
    // @ts-expect-error shelfVCount 不应在 QuickInput 中
    const q4: QuickInput = { W: 100, H: 100, projectionUnitPrice: 1000, shelfVCount: 1 };
    // @ts-expect-error hasDoor 不应在 QuickInput 中
    const q5: QuickInput = { W: 100, H: 100, projectionUnitPrice: 1000, hasDoor: true };
    // @ts-expect-error doorW 不应在 QuickInput 中
    const q6: QuickInput = { W: 100, H: 100, projectionUnitPrice: 1000, doorW: 500 };
    // @ts-expect-error doorH 不应在 QuickInput 中
    const q7: QuickInput = { W: 100, H: 100, projectionUnitPrice: 1000, doorH: 500 };
    // @ts-expect-error doorCount 不应在 QuickInput 中
    const q8: QuickInput = { W: 100, H: 100, projectionUnitPrice: 1000, doorCount: 2 };
    // @ts-expect-error doorUnitPrice 不应在 QuickInput 中
    const q9: QuickInput = { W: 100, H: 100, projectionUnitPrice: 1000, doorUnitPrice: 300 };
    // @ts-expect-error isNonStd 不应在 QuickInput 中
    const q10: QuickInput = { W: 100, H: 100, projectionUnitPrice: 1000, isNonStd: true };
    // @ts-expect-error hardwareFee 不应在 QuickInput 中
    const q11: QuickInput = { W: 100, H: 100, projectionUnitPrice: 1000, hardwareFee: 100 };
    // @ts-expect-error unitPrice 不应在 QuickInput 中
    const q12: QuickInput = { W: 100, H: 100, projectionUnitPrice: 1000, unitPrice: 100 };

    expect([
      q1, q2, q3, q4, q5, q6, q7, q8, q9, q10, q11, q12,
    ]).toHaveLength(12);
  });
});
