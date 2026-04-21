// formula-version: v1.3 (2026-04-21)
export const NON_STD_COEFF = 1.2;
export const STD_COEFF = 1.0;
export const DOOR_DEPTH_OFFSET = 20; // mm，含门时进深补偿

export const LIMITS = {
  W: [1, 2400],
  D: [1, 1200],
  H: [1, 2400],
  boardThickness: [9, 25],
  shelfHCount: [0, 10],
  shelfVCount: [0, 10],
  doorW: [1, 2400],
  doorH: [1, 2400],
  doorCount: [1, 6],
  doorUnitPrice: [1, 10000],
  unitPrice: [1, 10000],
  hardwareFee: [0, 99999.99],
  projectionUnitPrice: [1, 50000],
} as const;

export const DEFAULTS = {
  boardThickness: 18,
  shelfHCount: 0,
  shelfVCount: 0,
  hasDoor: false,
  isNonStd: false,
  hardwareFee: 0,
  doorCount: 1,
} as const;

export const HISTORY_MAX = 5;
