import { z } from "zod";
import { LIMITS } from "./config";

export const STANDARD_BOARD_WARNING = "超出标准板材 1200×2400，建议分柜";
const STANDARD_BOARD = { shortSide: 1200, longSide: 2400 };

const INTEGER_PATTERN = /^\d+$/;
const MONEY_PATTERN = /^\d+(?:\.\d{1,2})?$/;

const integerField = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .min(1, `请输入${label}`)
    .refine((value) => INTEGER_PATTERN.test(value), {
      message: `${label}需为 ${min} ~ ${max} 的整数`,
    })
    .refine((value) => {
      const parsedValue = Number(value);
      return parsedValue >= min && parsedValue <= max;
    }, `${label}需为 ${min} ~ ${max} 的整数`);

const moneyField = (label: string, min: number, max: number, required = true) => {
  const field = z
    .string()
    .trim()
    .refine((value) => {
      if (!required && value.length === 0) {
        return true;
      }

      return value.length > 0;
    }, `请输入${label}`)
    .refine((value) => {
      if (!required && value.length === 0) {
        return true;
      }

      return MONEY_PATTERN.test(value);
    }, `${label}最多 2 位小数，且需为 ${min} ~ ${max}`)
    .refine((value) => {
      if (!required && value.length === 0) {
        return true;
      }

      const parsedValue = Number(value);
      return parsedValue >= min && parsedValue <= max;
    }, `${label}需为 ${min} ~ ${max}`);

  return field;
};

export const quoteFormSchema = z.object({
  W: integerField("宽度", LIMITS.W[0], LIMITS.W[1]),
  D: integerField("进深", LIMITS.D[0], LIMITS.D[1]),
  H: integerField("高度", LIMITS.H[0], LIMITS.H[1]),
  shelfHCount: integerField("横层板数量", LIMITS.shelfHCount[0], LIMITS.shelfHCount[1]),
  shelfVCount: integerField("中竖板数量", LIMITS.shelfVCount[0], LIMITS.shelfVCount[1]),
  unitPrice: moneyField("板材单价", LIMITS.unitPrice[0], LIMITS.unitPrice[1]),
  hardwareFee: moneyField("特殊五金加价", LIMITS.hardwareFee[0], LIMITS.hardwareFee[1]),
  hasDoor: z.boolean(),
  isNonStd: z.boolean(),
});

export const quoteFormDefaults = {
  W: "",
  D: "",
  H: "",
  shelfHCount: "0",
  shelfVCount: "0",
  unitPrice: "",
  hardwareFee: "0",
  hasDoor: false,
  isNonStd: false,
} satisfies z.input<typeof quoteFormSchema>;

export type QuoteFormValues = z.input<typeof quoteFormSchema>;

const parseRawNumber = (value: string) => {
  if (value.trim().length === 0) {
    return null;
  }

  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : null;
};

export const getStandardBoardWarning = (values: Pick<QuoteFormValues, "W" | "D" | "H">) => {
  const width = parseRawNumber(values.W);
  const depth = parseRawNumber(values.D);
  const height = parseRawNumber(values.H);

  if (width === null || depth === null || height === null) {
    return null;
  }

  if (
    Math.max(width, height) > STANDARD_BOARD.longSide ||
    depth > STANDARD_BOARD.shortSide
  ) {
    return STANDARD_BOARD_WARNING;
  }

  return null;
};

export const getStandardBoardWarningFlags = (
  values: Pick<QuoteFormValues, "W" | "D" | "H">,
) => {
  const width = parseRawNumber(values.W);
  const depth = parseRawNumber(values.D);
  const height = parseRawNumber(values.H);

  return {
    W: width !== null && width > STANDARD_BOARD.longSide,
    D: depth !== null && depth > STANDARD_BOARD.shortSide,
    H: height !== null && height > STANDARD_BOARD.longSide,
  };
};
