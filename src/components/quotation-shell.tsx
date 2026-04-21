"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  type FieldValues,
  type Path,
  type UseFormRegister,
  useForm,
} from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { HistoryPanel } from "@/components/HistoryPanel";
import { ResultCard } from "@/components/ResultCard";
import {
  calculateAccurate,
  calculateQuick,
  type AccurateInput,
  type AccurateResult,
  type QuickInput,
  type QuickResult,
} from "@/lib/calc";
import { fmtArea, fmtMoney } from "@/lib/format";
import {
  clearHistory,
  getHistory,
  isHistoryStorageAvailable,
  pushHistory,
  type HistoryEntry,
} from "@/lib/history";

type ActiveTab = "accurate" | "quick";
type ActiveResult =
  | { mode: "accurate"; input: AccurateInput; result: AccurateResult }
  | { mode: "quick"; input: QuickInput; result: QuickResult };

type AccurateFormValues = {
  W: string;
  D: string;
  H: string;
  boardThickness: string;
  shelfHCount: string;
  shelfVCount: string;
  unitPrice: string;
  hardwareFee: string;
  hasDoor: boolean;
  isNonStd: boolean;
  doorW: string;
  doorH: string;
  doorCount: string;
  doorUnitPrice: string;
};

type QuickFormValues = {
  W: string;
  H: string;
  projectionUnitPrice: string;
};

const STANDARD_BOARD_WARNING = "超出标准板材 1200×2400，建议分柜";
const DOOR_SIZE_WARNING = "门板尺寸明显大于柜体开口";

const accurateDefaults: AccurateFormValues = {
  W: "",
  D: "",
  H: "",
  boardThickness: "18",
  shelfHCount: "0",
  shelfVCount: "0",
  unitPrice: "",
  hardwareFee: "0",
  hasDoor: false,
  isNonStd: false,
  doorW: "",
  doorH: "",
  doorCount: "1",
  doorUnitPrice: "",
};

const quickDefaults: QuickFormValues = {
  W: "",
  H: "",
  projectionUnitPrice: "",
};

const isInteger = (value: string) => /^\d+$/.test(value);
const isMoney = (value: string) => /^\d+(\.\d{1,2})?$/.test(value);
const toNumber = (value: string) => Number(value);

const intField = (label: string, min: number, max?: number) =>
  z.string().refine(
    (value) => {
      if (!isInteger(value)) {
        return false;
      }

      const n = toNumber(value);
      return n >= min && (max === undefined || n <= max);
    },
    { message: max === undefined ? `${label}须为不小于 ${min} 的整数` : `${label}须为 ${min} ~ ${max} 的整数` },
  );

const moneyField = (label: string, min: number, max: number) =>
  z.string().refine(
    (value) => {
      if (!isMoney(value)) {
        return false;
      }

      const n = toNumber(value);
      return n >= min && n <= max;
    },
    { message: `${label}须为 ${min} ~ ${max} 且最多 2 位小数` },
  );

const accurateSchema = z
  .object({
    W: intField("宽度", 1),
    D: intField("进深", 1),
    H: intField("高度", 1),
    boardThickness: intField("板材厚度", 9, 25),
    shelfHCount: intField("横层板数量", 0, 10),
    shelfVCount: intField("中竖板数量", 0, 10),
    unitPrice: moneyField("柜体板材单价", 1, 10000),
    hardwareFee: moneyField("特殊五金加价", 0, 99999.99),
    hasDoor: z.boolean(),
    isNonStd: z.boolean(),
    doorW: z.string(),
    doorH: z.string(),
    doorCount: z.string(),
    doorUnitPrice: z.string(),
  })
  .superRefine((values, ctx) => {
    const W = toNumber(values.W);
    const D = toNumber(values.D);
    const H = toNumber(values.H);
    const t = toNumber(values.boardThickness);

    if (isInteger(values.W) && isInteger(values.boardThickness) && W <= 2 * t) {
      ctx.addIssue({
        code: "custom",
        message: "宽度须大于 2 倍板材厚度",
        path: ["W"],
      });
    }

    if (isInteger(values.H) && isInteger(values.boardThickness) && H <= 2 * t) {
      ctx.addIssue({
        code: "custom",
        message: "高度须大于 2 倍板材厚度",
        path: ["H"],
      });
    }

    if (values.hasDoor) {
      if (isInteger(values.D) && D <= 20) {
        ctx.addIssue({
          code: "custom",
          message: "含门时进深须 > 20mm",
          path: ["D"],
        });
      }

      if (!isInteger(values.doorW) || toNumber(values.doorW) < 1 || toNumber(values.doorW) > 2400) {
        ctx.addIssue({
          code: "custom",
          message: "门板宽度须为 1 ~ 2400 的整数",
          path: ["doorW"],
        });
      }

      if (!isInteger(values.doorH) || toNumber(values.doorH) < 1 || toNumber(values.doorH) > 2400) {
        ctx.addIssue({
          code: "custom",
          message: "门板高度须为 1 ~ 2400 的整数",
          path: ["doorH"],
        });
      }

      if (!isInteger(values.doorCount) || toNumber(values.doorCount) < 1 || toNumber(values.doorCount) > 6) {
        ctx.addIssue({
          code: "custom",
          message: "门板数量须为 1 ~ 6 的整数",
          path: ["doorCount"],
        });
      }

      if (!isMoney(values.doorUnitPrice) || toNumber(values.doorUnitPrice) < 1 || toNumber(values.doorUnitPrice) > 10000) {
        ctx.addIssue({
          code: "custom",
          message: "门板单价须为 1 ~ 10000 且最多 2 位小数",
          path: ["doorUnitPrice"],
        });
      }
    }
  });

const quickSchema = z.object({
  W: intField("宽度", 1),
  H: intField("高度", 1),
  projectionUnitPrice: moneyField("投影单价", 1, 50000),
});

type NumberFieldProps<TFieldValues extends FieldValues> = {
  description?: string;
  error?: string;
  hint?: string | null;
  inputMode: "decimal" | "numeric";
  label: string;
  placeholder: string;
  register: UseFormRegister<TFieldValues>;
  unit: string;
  fieldKey: Path<TFieldValues>;
};

function NumberField<TFieldValues extends FieldValues>({
  description,
  error,
  hint,
  inputMode,
  label,
  placeholder,
  register,
  unit,
  fieldKey,
}: NumberFieldProps<TFieldValues>) {
  const inputId = `field-${String(fieldKey)}`;

  return (
    <label className="flex flex-col gap-2" htmlFor={inputId}>
      <span className="flex items-center justify-between gap-3 text-sm font-medium text-slate-700">
        <span>{label}</span>
        <span className="text-xs font-normal text-slate-400">{unit}</span>
      </span>
      <input
        {...register(fieldKey)}
        aria-label={label}
        aria-invalid={Boolean(error)}
        className={`h-11 rounded-xl border px-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-300 ${
          error
            ? "border-rose-400 bg-rose-50/70 ring-2 ring-rose-100"
            : "border-slate-200 bg-white focus:border-slate-500"
        }`}
        id={inputId}
        inputMode={inputMode}
        placeholder={placeholder}
        spellCheck={false}
      />
      {description ? <span className="text-xs text-slate-400">{description}</span> : null}
      {error ? <span className="text-xs font-medium text-rose-600">{error}</span> : null}
      {hint ? <span className="text-xs font-medium text-amber-600">{hint}</span> : null}
    </label>
  );
}

type ToggleFieldProps<TFieldValues extends FieldValues> = {
  description: string;
  fieldKey: Path<TFieldValues>;
  label: string;
  register: UseFormRegister<TFieldValues>;
};

function ToggleField<TFieldValues extends FieldValues>({
  description,
  fieldKey,
  label,
  register,
}: ToggleFieldProps<TFieldValues>) {
  const { ref, ...field } = register(fieldKey);

  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="space-y-1">
        <div className="text-sm font-medium text-slate-700">{label}</div>
        <div className="text-xs text-slate-400">{description}</div>
      </div>
      <span className="relative inline-flex items-center">
        <input
          {...field}
          aria-label={label}
          ref={ref}
          className="peer sr-only"
          type="checkbox"
        />
        <span className="h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-slate-950" />
        <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4">
      <div className="text-sm text-slate-400">{label}</div>
      <div className="mt-2 text-3xl font-semibold tracking-tight text-white">{value}</div>
    </div>
  );
}

function FieldSet({
  children,
  title,
}: {
  children: ReactNode;
  title: string;
}) {
  return (
    <fieldset className="space-y-4 rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
      <legend className="px-1 text-sm font-semibold text-slate-800">{title}</legend>
      {children}
    </fieldset>
  );
}

const buildAccurateInput = (values: AccurateFormValues) => ({
  W: toNumber(values.W),
  D: toNumber(values.D),
  H: toNumber(values.H),
  boardThickness: toNumber(values.boardThickness),
  shelfHCount: toNumber(values.shelfHCount),
  shelfVCount: toNumber(values.shelfVCount),
  hasDoor: values.hasDoor,
  doorW: values.hasDoor ? toNumber(values.doorW) : undefined,
  doorH: values.hasDoor ? toNumber(values.doorH) : undefined,
  doorCount: values.hasDoor ? toNumber(values.doorCount) : undefined,
  doorUnitPrice: values.hasDoor ? toNumber(values.doorUnitPrice) : undefined,
  isNonStd: values.isNonStd,
  hardwareFee: toNumber(values.hardwareFee),
  unitPrice: toNumber(values.unitPrice),
});

const buildQuickInput = (values: QuickFormValues) => ({
  W: toNumber(values.W),
  H: toNumber(values.H),
  projectionUnitPrice: toNumber(values.projectionUnitPrice),
});

const getAccurateSoftWarnings = (values: AccurateFormValues) => {
  const W = isInteger(values.W) ? toNumber(values.W) : null;
  const D = isInteger(values.D) ? toNumber(values.D) : null;
  const H = isInteger(values.H) ? toNumber(values.H) : null;
  const doorW = isInteger(values.doorW) ? toNumber(values.doorW) : null;
  const doorH = isInteger(values.doorH) ? toNumber(values.doorH) : null;

  return {
    standardW: W !== null && W > 2400,
    standardD: D !== null && D > 1200,
    standardH: H !== null && H > 2400,
    doorW:
      values.hasDoor &&
      W !== null &&
      doorW !== null &&
      doorW > W + 20,
    doorH:
      values.hasDoor &&
      H !== null &&
      doorH !== null &&
      doorH > H + 20,
  };
};

const getAccurateHardBlockers = (values: AccurateFormValues) => {
  const W = isInteger(values.W) ? toNumber(values.W) : null;
  const D = isInteger(values.D) ? toNumber(values.D) : null;
  const H = isInteger(values.H) ? toNumber(values.H) : null;
  const t = isInteger(values.boardThickness) ? toNumber(values.boardThickness) : null;

  return {
    W: W !== null && t !== null && W <= 2 * t ? "宽度须大于 2 倍板材厚度" : undefined,
    D: values.hasDoor && D !== null && D <= 20 ? "含门时进深须 > 20mm" : undefined,
    H: H !== null && t !== null && H <= 2 * t ? "高度须大于 2 倍板材厚度" : undefined,
    doorW: values.hasDoor && values.doorW === "" ? "门板宽度须为 1 ~ 2400 的整数" : undefined,
    doorH: values.hasDoor && values.doorH === "" ? "门板高度须为 1 ~ 2400 的整数" : undefined,
    doorCount: values.hasDoor && values.doorCount === "" ? "门板数量须为 1 ~ 6 的整数" : undefined,
    doorUnitPrice:
      values.hasDoor && values.doorUnitPrice === ""
        ? "门板单价须为 1 ~ 10000 且最多 2 位小数"
        : undefined,
  };
};

export function QuotationShell() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("accurate");
  const [activeResult, setActiveResult] = useState<ActiveResult | null>(null);
  const [, setHistoryVersion] = useState(0);
  const wasDoorOpenRef = useRef(false);

  const useFormAccurate = useForm<AccurateFormValues>({
    defaultValues: accurateDefaults,
    mode: "onChange",
    resolver: zodResolver(accurateSchema),
    shouldUnregister: false,
  });
  const useFormQuick = useForm<QuickFormValues>({
    defaultValues: quickDefaults,
    mode: "onChange",
    resolver: zodResolver(quickSchema),
  });

  const accurateValues = useFormAccurate.watch();
  const quickValues = useFormQuick.watch();
  const accurateParse = accurateSchema.safeParse(accurateValues);
  const quickParse = quickSchema.safeParse(quickValues);
  const accurateInput = accurateParse.success ? buildAccurateInput(accurateParse.data) : null;
  const quickInput = quickParse.success ? buildQuickInput(quickParse.data) : null;
  const accurateResult = accurateInput ? calculateAccurate(accurateInput) : null;
  const quickResult = quickInput ? calculateQuick(quickInput) : null;
  const hardBlockers = getAccurateHardBlockers(accurateValues);
  const softWarnings = getAccurateSoftWarnings(accurateValues);
  const historyStore = getHistory();
  const storageAvailable = isHistoryStorageAvailable();

  useEffect(() => {
    if (!accurateValues.hasDoor) {
      wasDoorOpenRef.current = false;
      return;
    }

    if (wasDoorOpenRef.current) {
      return;
    }

    wasDoorOpenRef.current = true;

    if (!useFormAccurate.formState.dirtyFields.doorW && accurateValues.W) {
      useFormAccurate.setValue("doorW", accurateValues.W, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true,
      });
    }

    if (!useFormAccurate.formState.dirtyFields.doorH && accurateValues.H) {
      useFormAccurate.setValue("doorH", accurateValues.H, {
        shouldDirty: false,
        shouldTouch: false,
        shouldValidate: true,
      });
    }
  }, [
    accurateValues.H,
    accurateValues.W,
    accurateValues.hasDoor,
    useFormAccurate,
  ]);

  const switchTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    setActiveResult(null);
  };

  const handleAccurateSubmit = useFormAccurate.handleSubmit((values) => {
    const input = buildAccurateInput(values);
    const result = calculateAccurate(input);
    const entry = { mode: "accurate" as const, input, result };

    pushHistory(entry);
    setHistoryVersion((version) => version + 1);
    setActiveResult(entry);
  });
  const handleQuickSubmit = useFormQuick.handleSubmit((values) => {
    const input = buildQuickInput(values);
    const result = calculateQuick(input);
    const entry = { mode: "quick" as const, input, result };

    pushHistory(entry);
    setHistoryVersion((version) => version + 1);
    setActiveResult(entry);
  });

  const handleBack = () => {
    setActiveResult(null);
  };

  const handleClearHistory = () => {
    if (!window.confirm("确认清空历史记录？")) {
      return;
    }

    clearHistory();
    setHistoryVersion((version) => version + 1);
  };

  const handleRefillHistory = (entry: HistoryEntry) => {
    if (entry.mode === "quick") {
      useFormQuick.setValue("W", String(entry.input.W), { shouldValidate: true });
      useFormQuick.setValue("H", String(entry.input.H), { shouldValidate: true });
      useFormQuick.setValue("projectionUnitPrice", String(entry.input.projectionUnitPrice), {
        shouldValidate: true,
      });
      setActiveTab("quick");
      setActiveResult(null);
      return;
    }

    useFormAccurate.setValue("W", String(entry.input.W), { shouldValidate: true });
    useFormAccurate.setValue("D", String(entry.input.D), { shouldValidate: true });
    useFormAccurate.setValue("H", String(entry.input.H), { shouldValidate: true });
    useFormAccurate.setValue("boardThickness", String(entry.input.boardThickness ?? 18), { shouldValidate: true });
    useFormAccurate.setValue("shelfHCount", String(entry.input.shelfHCount), { shouldValidate: true });
    useFormAccurate.setValue("shelfVCount", String(entry.input.shelfVCount), { shouldValidate: true });
    useFormAccurate.setValue("hasDoor", entry.input.hasDoor, { shouldValidate: true });
    useFormAccurate.setValue("isNonStd", entry.input.isNonStd, { shouldValidate: true });
    useFormAccurate.setValue("unitPrice", String(entry.input.unitPrice), { shouldValidate: true });
    useFormAccurate.setValue("hardwareFee", String(entry.input.hardwareFee), { shouldValidate: true });
    useFormAccurate.setValue("doorW", String(entry.input.doorW ?? entry.input.W), { shouldValidate: true });
    useFormAccurate.setValue("doorH", String(entry.input.doorH ?? entry.input.H), { shouldValidate: true });
    useFormAccurate.setValue("doorCount", String(entry.input.doorCount ?? 1), { shouldValidate: true });
    useFormAccurate.setValue("doorUnitPrice", String(entry.input.doorUnitPrice ?? ""), { shouldValidate: true });
    setActiveTab("accurate");
    setActiveResult(null);
  };

  const handleViewHistory = (entry: HistoryEntry) => {
    setActiveTab(entry.mode);
    setActiveResult(
      entry.mode === "accurate"
        ? { mode: "accurate", input: entry.input, result: entry.result }
        : { mode: "quick", input: entry.input, result: entry.result },
    );
  };

  return (
    <div className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 rounded-[32px] border border-slate-200 bg-white/85 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <span className="inline-flex rounded-full bg-slate-950 px-3 py-1 text-xs font-medium text-white">
              全屋定制智能报价器 V1.3
            </span>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
                单柜报价表单
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-500">
                精确报价与快速估算状态独立保存。切换 Tab 不会重置已填写内容，也不会触发历史记录入库。
              </p>
            </div>
          </div>

          <div
            aria-label="报价模式"
            className="grid rounded-2xl border border-slate-200 bg-slate-100 p-1 sm:grid-cols-2"
            role="tablist"
          >
            <button
              aria-selected={activeTab === "accurate"}
              className={`rounded-xl px-5 py-3 text-sm font-semibold transition ${
                activeTab === "accurate"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              onClick={() => switchTab("accurate")}
              role="tab"
              type="button"
            >
              精确报价
            </button>
            <button
              aria-selected={activeTab === "quick"}
              className={`rounded-xl px-5 py-3 text-sm font-semibold transition ${
                activeTab === "quick"
                  ? "bg-white text-slate-950 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
              onClick={() => switchTab("quick")}
              role="tab"
              type="button"
            >
              快速估算
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-8">
          <HistoryPanel
            isStorageAvailable={storageAvailable}
            onClear={handleClearHistory}
            onRefill={handleRefillHistory}
            onView={handleViewHistory}
            records={historyStore.records}
          />

          {activeTab === "accurate" ? (
            <>
              <form className="space-y-6" onSubmit={handleAccurateSubmit}>
                <FieldSet title="基础尺寸">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <NumberField
                      description="整数，标准板材软提示阈值 2400"
                      error={useFormAccurate.formState.errors.W?.message ?? hardBlockers.W}
                      fieldKey="W"
                      hint={softWarnings.standardW ? STANDARD_BOARD_WARNING : null}
                      inputMode="numeric"
                      label="宽度 W"
                      placeholder="例如 580"
                      register={useFormAccurate.register}
                      unit="mm"
                    />
                    <NumberField
                      description="整数，标准板材软提示阈值 1200"
                      error={useFormAccurate.formState.errors.D?.message ?? hardBlockers.D}
                      fieldKey="D"
                      hint={softWarnings.standardD ? STANDARD_BOARD_WARNING : null}
                      inputMode="numeric"
                      label="进深 D"
                      placeholder="例如 500"
                      register={useFormAccurate.register}
                      unit="mm"
                    />
                    <NumberField
                      description="整数，标准板材软提示阈值 2400"
                      error={useFormAccurate.formState.errors.H?.message ?? hardBlockers.H}
                      fieldKey="H"
                      hint={softWarnings.standardH ? STANDARD_BOARD_WARNING : null}
                      inputMode="numeric"
                      label="高度 H"
                      placeholder="例如 750"
                      register={useFormAccurate.register}
                      unit="mm"
                    />
                    <NumberField
                      description="9 ~ 25 的整数，默认 18"
                      error={useFormAccurate.formState.errors.boardThickness?.message}
                      fieldKey="boardThickness"
                      inputMode="numeric"
                      label="板材厚度"
                      placeholder="18"
                      register={useFormAccurate.register}
                      unit="mm"
                    />
                  </div>
                </FieldSet>

                <FieldSet title="内部配置">
                  <div className="grid gap-4 md:grid-cols-2">
                    <NumberField
                      description="0 ~ 10 的整数，默认 0"
                      error={useFormAccurate.formState.errors.shelfHCount?.message}
                      fieldKey="shelfHCount"
                      inputMode="numeric"
                      label="横层板数量"
                      placeholder="0"
                      register={useFormAccurate.register}
                      unit="片"
                    />
                    <NumberField
                      description="0 ~ 10 的整数，默认 0"
                      error={useFormAccurate.formState.errors.shelfVCount?.message}
                      fieldKey="shelfVCount"
                      inputMode="numeric"
                      label="中竖板数量"
                      placeholder="0"
                      register={useFormAccurate.register}
                      unit="片"
                    />
                  </div>
                  <ToggleField
                    description="非标系数作用于柜体与门板，五金不参与"
                    fieldKey="isNonStd"
                    label="是否非标件"
                    register={useFormAccurate.register}
                  />
                </FieldSet>

                <FieldSet title="门板">
                  <ToggleField
                    description="打开后填写门板独立尺寸、数量与单价"
                    fieldKey="hasDoor"
                    label="是否含门"
                    register={useFormAccurate.register}
                  />

                  {accurateValues.hasDoor ? (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <NumberField
                        description="1 ~ 2400 的整数，首次打开自动填 W"
                        error={useFormAccurate.formState.errors.doorW?.message ?? hardBlockers.doorW}
                        fieldKey="doorW"
                        hint={softWarnings.doorW ? DOOR_SIZE_WARNING : null}
                        inputMode="numeric"
                        label="门板宽度"
                        placeholder="自动填 W"
                        register={useFormAccurate.register}
                        unit="mm"
                      />
                      <NumberField
                        description="1 ~ 2400 的整数，首次打开自动填 H"
                        error={useFormAccurate.formState.errors.doorH?.message ?? hardBlockers.doorH}
                        fieldKey="doorH"
                        hint={softWarnings.doorH ? DOOR_SIZE_WARNING : null}
                        inputMode="numeric"
                        label="门板高度"
                        placeholder="自动填 H"
                        register={useFormAccurate.register}
                        unit="mm"
                      />
                      <NumberField
                        description="1 ~ 6 的整数，默认 1"
                        error={useFormAccurate.formState.errors.doorCount?.message ?? hardBlockers.doorCount}
                        fieldKey="doorCount"
                        inputMode="numeric"
                        label="门板数量"
                        placeholder="1"
                        register={useFormAccurate.register}
                        unit="扇"
                      />
                      <NumberField
                        description="1 ~ 10000，最多 2 位小数"
                        error={
                          useFormAccurate.formState.errors.doorUnitPrice?.message ??
                          hardBlockers.doorUnitPrice
                        }
                        fieldKey="doorUnitPrice"
                        inputMode="decimal"
                        label="门板单价"
                        placeholder="例如 180"
                        register={useFormAccurate.register}
                        unit="元/m²"
                      />
                    </div>
                  ) : null}
                </FieldSet>

                <FieldSet title="单价与五金">
                  <div className="grid gap-4 md:grid-cols-2">
                    <NumberField
                      description="1 ~ 10000，最多 2 位小数"
                      error={useFormAccurate.formState.errors.unitPrice?.message}
                      fieldKey="unitPrice"
                      inputMode="decimal"
                      label="柜体板材单价"
                      placeholder="例如 100"
                      register={useFormAccurate.register}
                      unit="元/m²"
                    />
                    <NumberField
                      description="0 ~ 99999.99，最多 2 位小数，默认 0"
                      error={useFormAccurate.formState.errors.hardwareFee?.message}
                      fieldKey="hardwareFee"
                      inputMode="decimal"
                      label="特殊五金加价"
                      placeholder="0"
                      register={useFormAccurate.register}
                      unit="元"
                    />
                  </div>
                </FieldSet>

                <SubmitBar disabled={!accurateParse.success} />
              </form>
            </>
          ) : (
            <form className="space-y-6" onSubmit={handleQuickSubmit}>
              <div className="space-y-4">
                <NumberField
                  description="整数，标准板材软提示阈值 2400"
                  error={useFormQuick.formState.errors.W?.message}
                  fieldKey="W"
                  inputMode="numeric"
                  label="宽度 W"
                  placeholder="例如 580"
                  register={useFormQuick.register}
                  unit="mm"
                />
                <NumberField
                  description="整数，标准板材软提示阈值 2400"
                  error={useFormQuick.formState.errors.H?.message}
                  fieldKey="H"
                  inputMode="numeric"
                  label="高度 H"
                  placeholder="例如 750"
                  register={useFormQuick.register}
                  unit="mm"
                />
                <NumberField
                  description="1 ~ 50000，最多 2 位小数"
                  error={useFormQuick.formState.errors.projectionUnitPrice?.message}
                  fieldKey="projectionUnitPrice"
                  inputMode="decimal"
                  label="投影单价"
                  placeholder="例如 1500"
                  register={useFormQuick.register}
                  unit="元/m²"
                />
              </div>

              <SubmitBar disabled={!useFormQuick.formState.isValid} />
            </form>
          )}
        </section>

        <aside
          aria-label="实时预览"
          className="rounded-[28px] border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_18px_60px_rgba(15,23,42,0.16)] sm:p-8"
        >
          {!activeResult ? (
            <div className="flex h-full flex-col justify-between gap-8">
              <div className="space-y-3">
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-400">
                  Preview
                </p>
                <h2 className="text-3xl font-semibold tracking-tight">
                  {activeTab === "accurate" ? "精确报价预览" : "快速估算预览"}
                </h2>
                <p className="max-w-md text-sm leading-6 text-slate-300">
                  任一必填字段非法或缺失时显示占位。软提示只提醒尺寸风险，不阻止生成报价。
                </p>
              </div>

              {activeTab === "accurate" ? (
                <div className="grid gap-4">
                  <PreviewMetric
                    label="柜体展开面积"
                    value={accurateResult ? fmtArea(accurateResult.cabinetAreaM2) : "—"}
                  />
                  <PreviewMetric
                    label="门板展开面积"
                    value={accurateResult ? fmtArea(accurateResult.doorAreaM2) : "—"}
                  />
                  <PreviewMetric
                    label="预估最终报价"
                    value={accurateResult ? fmtMoney(accurateResult.finalPrice) : "—"}
                  />
                </div>
              ) : (
                <div className="grid gap-4">
                  <PreviewMetric
                    label="投影面积"
                    value={quickResult ? fmtArea(quickResult.projectionAreaM2) : "—"}
                  />
                  <PreviewMetric
                    label="估算报价"
                    value={quickResult ? fmtMoney(quickResult.projectionEstimate) : "—"}
                  />
                </div>
              )}
            </div>
          ) : (
            activeResult.mode === "accurate" ? (
              <ResultCard
                input={activeResult.input}
                mode="accurate"
                onBack={handleBack}
                result={activeResult.result}
              />
            ) : (
              <ResultCard
                input={activeResult.input}
                mode="quick"
                onBack={handleBack}
                onSwitchToAccurate={() => {
                  setActiveTab("accurate");
                  setActiveResult(null);
                }}
                result={activeResult.result}
              />
            )
          )}
        </aside>
      </div>
    </div>
  );
}

function SubmitBar({ disabled }: { disabled: boolean }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-slate-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">
        任一必填为空或非法时，右侧预览保持占位，生成按钮不可用。
      </p>
      <button
        className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:bg-slate-300"
        disabled={disabled}
        type="submit"
      >
        生成报价
      </button>
    </div>
  );
}
