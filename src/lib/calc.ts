// formula-version: v1.3 (2026-04-21)

import { DOOR_DEPTH_OFFSET, NON_STD_COEFF, STD_COEFF } from "./config";

export interface AccurateInput {
  W: number;
  D: number;
  H: number;
  boardThickness: number;
  shelfHCount: number;
  shelfVCount: number;
  hasDoor: boolean;
  doorW?: number;
  doorH?: number;
  doorCount?: number;
  doorUnitPrice?: number;
  isNonStd: boolean;
  hardwareFee: number;
  unitPrice: number;
}

export interface PartRow {
  name: string;
  sizeW: number;
  sizeH: number;
  qty: number;
  areaM2: number;
  unitPrice: number;
  subtotal: number;
}

export interface AccurateResult {
  cabinetParts: PartRow[];
  doorParts: PartRow[];
  cabinetAreaM2: number;
  doorAreaM2: number;
  cabinetCost: number;
  doorCost: number;
  coeff: number;
  hardwareFee: number;
  finalPrice: number;
}

export interface QuickInput {
  W: number;
  H: number;
  projectionUnitPrice: number;
}

export interface QuickResult {
  projectionAreaM2: number;
  projectionEstimate: number;
}

export type QuotationPart = PartRow;

const createPartRow = (
  name: string,
  sizeW: number,
  sizeH: number,
  qty: number,
  unitPrice: number,
): PartRow | null => {
  if (qty === 0) {
    return null;
  }

  const areaM2 = (sizeW * sizeH * qty) / 1_000_000;

  return {
    name,
    sizeW,
    sizeH,
    qty,
    areaM2,
    unitPrice,
    subtotal: areaM2 * unitPrice,
  };
};

const isPartRow = (part: PartRow | null): part is PartRow => part !== null;

export function calculateAccurate(input: AccurateInput): AccurateResult {
  const t = input.boardThickness;
  const D0 = input.hasDoor ? input.D - DOOR_DEPTH_OFFSET : input.D;

  const area_side = D0 * input.H * 2;
  const area_top_bottom = (input.W - 2 * t) * (D0 - t) * 2;
  const area_back = (input.W - 2 * t) * input.H;
  const area_shelf_h = (input.W - 2 * t) * (D0 - t) * input.shelfHCount;
  const area_shelf_v = (D0 - t) * (input.H - 2 * t) * input.shelfVCount;

  const cabinet_mm2 =
    area_side + area_top_bottom + area_back + area_shelf_h + area_shelf_v;
  const cabinetAreaM2 = cabinet_mm2 / 1_000_000;
  const cabinetCost = cabinetAreaM2 * input.unitPrice;

  let doorAreaM2 = 0;
  let doorCost = 0;

  if (input.hasDoor) {
    const door_mm2 = input.doorW! * input.doorH! * input.doorCount!;
    doorAreaM2 = door_mm2 / 1_000_000;
    doorCost = doorAreaM2 * input.doorUnitPrice!;
  }

  const coeff = input.isNonStd ? NON_STD_COEFF : STD_COEFF;
  const finalPrice = (cabinetCost + doorCost) * coeff + input.hardwareFee;

  const cabinetParts = [
    createPartRow("侧板", D0, input.H, 2, input.unitPrice),
    createPartRow("顶底板", input.W - 2 * t, D0 - t, 2, input.unitPrice),
    createPartRow("背板", input.W - 2 * t, input.H, 1, input.unitPrice),
    createPartRow("横层板", input.W - 2 * t, D0 - t, input.shelfHCount, input.unitPrice),
    createPartRow("中竖板", D0 - t, input.H - 2 * t, input.shelfVCount, input.unitPrice),
  ].filter(isPartRow);

  const doorParts = input.hasDoor
    ? [
        {
          name: "门板",
          sizeW: input.doorW!,
          sizeH: input.doorH!,
          qty: input.doorCount!,
          areaM2: doorAreaM2,
          unitPrice: input.doorUnitPrice!,
          subtotal: doorCost,
        },
      ]
    : [];

  return {
    cabinetParts,
    doorParts,
    cabinetAreaM2,
    doorAreaM2,
    cabinetCost,
    doorCost,
    coeff,
    hardwareFee: input.hardwareFee,
    finalPrice,
  };
}

export function calculateQuick(input: QuickInput): QuickResult {
  const projectionAreaM2 = (input.W * input.H) / 1_000_000;
  const projectionEstimate = projectionAreaM2 * input.projectionUnitPrice;

  return {
    projectionAreaM2,
    projectionEstimate,
  };
}
