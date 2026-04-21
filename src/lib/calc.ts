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

export interface QuickInput {
  W: number;
  H: number;
  projectionUnitPrice: number;
}

export interface QuotationPart {
  name: string;
  sizeW: number;
  sizeH: number;
  qty: number;
  areaM2: number;
  subtotal: number;
  unitPrice: number;
}

export interface AccurateResult {
  cabinetParts: QuotationPart[];
  doorParts: QuotationPart[];
  parts: QuotationPart[];
  cabinetAreaM2: number;
  doorAreaM2: number;
  areaM2: number;
  cabinetCost: number;
  doorCost: number;
  materialCost: number;
  coeff: number;
  hardwareFee: number;
  finalPrice: number;
}

export interface QuickResult {
  projectionAreaM2: number;
  projectionEstimate: number;
}

export interface QuotationInput {
  W: number;
  D: number;
  H: number;
  boardThickness?: number;
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

export type QuotationResult = AccurateResult;

const createPart = (
  name: string,
  sizeW: number,
  sizeH: number,
  qty: number,
  unitPrice: number,
): QuotationPart | null => {
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
    subtotal: areaM2 * unitPrice,
    unitPrice,
  };
};

const isPart = (part: QuotationPart | null): part is QuotationPart => part !== null;

export function calculateAccurate(input: AccurateInput): AccurateResult {
  const t = input.boardThickness;
  const compensatedD = input.hasDoor ? input.D - DOOR_DEPTH_OFFSET : input.D;

  const sideW = compensatedD;
  const sideH = input.H;
  const topBottomW = input.W - 2 * t;
  const topBottomH = compensatedD - t;
  const backW = input.W - 2 * t;
  const backH = input.H;
  const shelfHW = input.W - 2 * t;
  const shelfHH = compensatedD - t;
  const shelfVW = compensatedD - t;
  const shelfVH = input.H - 2 * t;

  const areaSide = sideW * sideH * 2;
  const areaTopBottom = topBottomW * topBottomH * 2;
  const areaBack = backW * backH;
  const areaShelfH = shelfHW * shelfHH * input.shelfHCount;
  const areaShelfV = shelfVW * shelfVH * input.shelfVCount;
  const areaCabinetMm2 = areaSide + areaTopBottom + areaBack + areaShelfH + areaShelfV;
  const cabinetAreaM2 = areaCabinetMm2 / 1_000_000;

  const resolvedDoorW = input.doorW ?? 0;
  const resolvedDoorH = input.doorH ?? 0;
  const resolvedDoorCount = input.doorCount ?? 0;
  const resolvedDoorUnitPrice = input.doorUnitPrice ?? 0;
  const areaDoorMm2 = input.hasDoor ? resolvedDoorW * resolvedDoorH * resolvedDoorCount : 0;
  const doorAreaM2 = areaDoorMm2 / 1_000_000;

  const cabinetCost = cabinetAreaM2 * input.unitPrice;
  const doorCost = doorAreaM2 * resolvedDoorUnitPrice;
  const coeff = input.isNonStd ? NON_STD_COEFF : STD_COEFF;
  const finalPrice = (cabinetCost + doorCost) * coeff + input.hardwareFee;

  const cabinetParts = [
    createPart("侧板", sideW, sideH, 2, input.unitPrice),
    createPart("顶底板", topBottomW, topBottomH, 2, input.unitPrice),
    createPart("背板", backW, backH, 1, input.unitPrice),
    createPart("横层板", shelfHW, shelfHH, input.shelfHCount, input.unitPrice),
    createPart("中竖板", shelfVW, shelfVH, input.shelfVCount, input.unitPrice),
  ].filter(isPart);
  const doorParts = input.hasDoor
    ? [createPart("门板", resolvedDoorW, resolvedDoorH, resolvedDoorCount, resolvedDoorUnitPrice)].filter(isPart)
    : [];

  return {
    cabinetParts,
    doorParts,
    parts: [...cabinetParts, ...doorParts],
    cabinetAreaM2,
    doorAreaM2,
    areaM2: cabinetAreaM2 + doorAreaM2,
    cabinetCost,
    doorCost,
    materialCost: cabinetCost + doorCost,
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

export function calculateQuotation(input: QuotationInput): QuotationResult {
  const accurateInput: AccurateInput = {
    ...input,
    boardThickness: input.boardThickness ?? 18,
    doorCount: input.doorCount ?? 1,
    doorH: input.doorH ?? input.H,
    doorUnitPrice: input.doorUnitPrice ?? input.unitPrice,
    doorW: input.doorW ?? input.W,
  };

  return calculateAccurate(accurateInput);
}
