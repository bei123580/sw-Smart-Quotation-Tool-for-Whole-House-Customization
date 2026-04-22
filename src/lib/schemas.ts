import { z } from "zod";

import { LIMITS } from "./config";

const hasAtMostTwoDecimals = (value: number) =>
  Math.abs(value * 100 - Math.round(value * 100)) < 1e-8;

const integerField = (label: string, min: number, max?: number) => {
  let schema = z
    .number({ message: `${label}为必填项` })
    .int(`${label}须为整数`)
    .min(min, `${label}须不小于 ${min}`);

  if (typeof max === "number") {
    schema = schema.max(max, `${label}须不大于 ${max}`);
  }

  return schema;
};

const moneyField = (label: string, min: number, max: number) =>
  z
    .number({ message: `${label}为必填项` })
    .min(min, `${label}须不小于 ${min}`)
    .max(max, `${label}须不大于 ${max}`)
    .refine(hasAtMostTwoDecimals, `${label}最多 2 位小数`);

const addDoorIssue = (
  ctx: z.RefinementCtx,
  path: "doorW" | "doorH" | "doorCount" | "doorUnitPrice",
  message: string,
) => {
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path: [path],
    message,
  });
};

export const accurateSchema = z
  .object({
    W: integerField("宽度", LIMITS.W[0]),
    D: integerField("进深", LIMITS.D[0]),
    H: integerField("高度", LIMITS.H[0]),
    boardThickness: integerField(
      "板材厚度",
      LIMITS.boardThickness[0],
      LIMITS.boardThickness[1],
    ),
    shelfHCount: integerField(
      "横层板数量",
      LIMITS.shelfHCount[0],
      LIMITS.shelfHCount[1],
    ),
    shelfVCount: integerField(
      "中竖板数量",
      LIMITS.shelfVCount[0],
      LIMITS.shelfVCount[1],
    ),
    hasDoor: z.boolean(),
    doorW: z.number().optional(),
    doorH: z.number().optional(),
    doorCount: z.number().optional(),
    doorUnitPrice: z.number().optional(),
    isNonStd: z.boolean(),
    hardwareFee: moneyField(
      "特殊五金加价",
      LIMITS.hardwareFee[0],
      LIMITS.hardwareFee[1],
    ),
    unitPrice: moneyField("柜体板材单价", LIMITS.unitPrice[0], LIMITS.unitPrice[1]),
  })
  .superRefine((values, ctx) => {
    if (values.hasDoor) {
      if (typeof values.doorW !== "number") {
        addDoorIssue(ctx, "doorW", "门板宽度须为 1 ~ 2400 的整数");
      } else if (
        !Number.isInteger(values.doorW) ||
        values.doorW < LIMITS.doorW[0] ||
        values.doorW > LIMITS.doorW[1]
      ) {
        addDoorIssue(ctx, "doorW", "门板宽度须为 1 ~ 2400 的整数");
      }

      if (typeof values.doorH !== "number") {
        addDoorIssue(ctx, "doorH", "门板高度须为 1 ~ 2400 的整数");
      } else if (
        !Number.isInteger(values.doorH) ||
        values.doorH < LIMITS.doorH[0] ||
        values.doorH > LIMITS.doorH[1]
      ) {
        addDoorIssue(ctx, "doorH", "门板高度须为 1 ~ 2400 的整数");
      }

      if (typeof values.doorCount !== "number") {
        addDoorIssue(ctx, "doorCount", "门板数量须为 1 ~ 6 的整数");
      } else if (
        !Number.isInteger(values.doorCount) ||
        values.doorCount < LIMITS.doorCount[0] ||
        values.doorCount > LIMITS.doorCount[1]
      ) {
        addDoorIssue(ctx, "doorCount", "门板数量须为 1 ~ 6 的整数");
      }

      if (typeof values.doorUnitPrice !== "number") {
        addDoorIssue(ctx, "doorUnitPrice", "门板单价须为 1 ~ 10000 且最多 2 位小数");
      } else if (
        values.doorUnitPrice < LIMITS.doorUnitPrice[0] ||
        values.doorUnitPrice > LIMITS.doorUnitPrice[1] ||
        !hasAtMostTwoDecimals(values.doorUnitPrice)
      ) {
        addDoorIssue(ctx, "doorUnitPrice", "门板单价须为 1 ~ 10000 且最多 2 位小数");
      }
    }

    if (values.hasDoor && values.D <= 20) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["D"],
        message: "含门时进深须大于 20mm",
      });
    }

    if (values.W <= 2 * values.boardThickness) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["W"],
        message: "宽度须大于 2 倍板材厚度",
      });
    }

    if (values.H <= 2 * values.boardThickness) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["H"],
        message: "高度须大于 2 倍板材厚度",
      });
    }
  });

export const quickSchema = z.object({
  W: integerField("宽度", LIMITS.W[0], LIMITS.W[1]),
  H: integerField("高度", LIMITS.H[0], LIMITS.H[1]),
  projectionUnitPrice: moneyField(
    "投影单价",
    LIMITS.projectionUnitPrice[0],
    LIMITS.projectionUnitPrice[1],
  ),
});

export type AccurateFormValues = z.infer<typeof accurateSchema>;
export type QuickFormValues = z.infer<typeof quickSchema>;
