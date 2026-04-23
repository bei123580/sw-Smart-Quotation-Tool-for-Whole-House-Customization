"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEventHandler, type ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useForm,
  useWatch,
  type FieldErrors,
  type FieldValues,
  type Path,
  type UseFormRegister,
} from "react-hook-form";

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
import { DEFAULTS } from "@/lib/config";
import { exportAccurateToExcel } from "@/lib/exporter";
import { fmtArea, fmtMoney } from "@/lib/format";
import {
  clearHistory,
  getHistory,
  isHistoryAvailable,
  pushHistory,
  type HistoryEntry,
  type HistoryStore,
} from "@/lib/history";
import {
  accurateSchema,
  quickSchema,
  type AccurateFormValues,
  type QuickFormValues,
} from "@/lib/schemas";

type ActiveTab = "accurate" | "quick";
type ViewMode = "form" | "result";
type ResultState =
  | {
      mode: "accurate";
      input: AccurateInput;
      result: AccurateResult;
    }
  | {
      mode: "quick";
      input: QuickInput;
      result: QuickResult;
    }
  | null;

const STANDARD_BOARD_WARNING = "超出标准板材 1200×2400，建议分柜";
const DOOR_WARNING = "门板尺寸明显大于柜体开口";

const accurateDefaults: AccurateFormValues = {
  W: undefined as never,
  D: undefined as never,
  H: undefined as never,
  boardThickness: DEFAULTS.boardThickness,
  shelfHCount: DEFAULTS.shelfHCount,
  shelfVCount: DEFAULTS.shelfVCount,
  hasDoor: DEFAULTS.hasDoor,
  doorW: undefined,
  doorH: undefined,
  doorCount: DEFAULTS.doorCount,
  doorUnitPrice: undefined,
  isNonStd: DEFAULTS.isNonStd,
  hardwareFee: DEFAULTS.hardwareFee,
  unitPrice: undefined as never,
};

const quickDefaults: QuickFormValues = {
  W: undefined as never,
  H: undefined as never,
  projectionUnitPrice: undefined as never,
};

const emptyHistoryStore: HistoryStore = {
  version: "1.3",
  records: [],
};

const parseInteger = (value: unknown) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  return parsed;
};

const parseMoney = (value: unknown) => {
  if (value === "" || value === null || value === undefined) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const getErrorMessage = <T extends FieldValues>(errors: FieldErrors<T>, name: Path<T>) => {
  const error = errors[name] as { message?: unknown } | undefined;
  return typeof error?.message === "string" ? error.message : undefined;
};

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-selected={active}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        active
          ? "bg-slate-950 text-white shadow-sm"
          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
      }`}
      onClick={onClick}
      role="tab"
      type="button"
    >
      {label}
    </button>
  );
}

function FieldSet({ children, title }: { children: ReactNode; title: string }) {
  return (
    <fieldset className="rounded-3xl border border-slate-200 bg-white/80 p-5">
      <legend className="px-1 text-sm font-semibold text-slate-900">{title}</legend>
      <div className="mt-4 grid gap-4">{children}</div>
    </fieldset>
  );
}

function FormField<T extends FieldValues>({
  description,
  error,
  hint,
  inputMode,
  label,
  min,
  onChange,
  placeholder,
  register,
  step,
  type = "number",
  unit,
}: {
  description?: string;
  error?: string;
  hint?: string;
  inputMode: "decimal" | "numeric";
  label: string;
  min?: number;
  onChange?: ChangeEventHandler<HTMLInputElement>;
  placeholder: string;
  register: ReturnType<UseFormRegister<T>>;
  step?: string;
  type?: "number" | "text";
  unit: string;
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="flex items-center justify-between gap-3 text-sm font-medium text-slate-800">
        <span>{label}</span>
        <span className="text-xs font-normal text-slate-400">{unit}</span>
      </span>
      <input
        {...register}
        aria-label={label}
        className={`h-11 rounded-2xl border bg-white px-4 text-sm text-slate-900 outline-none transition ${
          error ? "border-rose-500 ring-2 ring-rose-100" : "border-slate-200 focus:border-slate-500"
        }`}
        inputMode={inputMode}
        min={min}
        onChange={(event) => {
          register.onChange(event);
          onChange?.(event);
        }}
        placeholder={placeholder}
        step={step}
        type={type}
      />
      {description ? <p className="text-xs text-slate-400">{description}</p> : null}
      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}
      {!error && hint ? <p className="text-xs font-medium text-amber-600">{hint}</p> : null}
    </label>
  );
}

function ToggleField<T extends FieldValues>({
  description,
  label,
  register,
}: {
  description: string;
  label: string;
  register: ReturnType<UseFormRegister<T>>;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
      <span className="relative inline-flex items-center">
        <input {...register} aria-label={label} className="peer sr-only" type="checkbox" />
        <span className="h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-slate-950" />
        <span className="absolute left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

function PreviewCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.06] p-5">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-white">{value}</p>
    </div>
  );
}

function AccuratePreview({
  hasDoor,
  result,
}: {
  hasDoor: boolean;
  result: AccurateResult | null;
}) {
  return (
    <aside
      aria-label="精确报价预览"
      className="rounded-[28px] border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_18px_60px_rgba(15,23,42,0.16)] sm:p-8"
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-400">Preview</p>
          <h2 className="text-3xl font-semibold tracking-tight">精确报价预览</h2>
        </div>
        <div className="grid gap-4">
          <PreviewCard
            label="柜体展开面积"
            value={result ? `${fmtArea(result.cabinetAreaM2)} m²` : "—"}
          />
          <PreviewCard
            label="门板展开面积"
            value={result ? (hasDoor ? `${fmtArea(result.doorAreaM2)} m²` : "—") : "—"}
          />
          <PreviewCard
            label="预估最终报价"
            value={result ? `¥${fmtMoney(result.finalPrice)}` : "—"}
          />
        </div>
      </div>
    </aside>
  );
}

function QuickPreview({ result }: { result: QuickResult | null }) {
  return (
    <aside
      aria-label="快速估算预览"
      className="rounded-[28px] border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_18px_60px_rgba(15,23,42,0.16)] sm:p-8"
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-400">Preview</p>
          <h2 className="text-3xl font-semibold tracking-tight">快速估算预览</h2>
        </div>
        <div className="grid gap-4">
          <PreviewCard
            label="投影面积"
            value={result ? `${fmtArea(result.projectionAreaM2)} m²` : "—"}
          />
          <PreviewCard
            label="估算报价"
            value={result ? `¥${fmtMoney(result.projectionEstimate)}` : "—"}
          />
        </div>
      </div>
    </aside>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("accurate");
  const [view, setView] = useState<ViewMode>("form");
  const [resultState, setResultState] = useState<ResultState>(null);
  const [historyStore, setHistoryStore] = useState<HistoryStore>(emptyHistoryStore);
  const [historyAvailable, setHistoryAvailable] = useState(false);

  const accurateForm = useForm<AccurateFormValues>({
    defaultValues: accurateDefaults,
    mode: "onChange",
    resolver: zodResolver(accurateSchema),
    shouldUnregister: false,
  });

  const quickForm = useForm<QuickFormValues>({
    defaultValues: quickDefaults,
    mode: "onChange",
    resolver: zodResolver(quickSchema),
  });

  const accurateValues = useWatch({ control: accurateForm.control });
  const quickValues = useWatch({ control: quickForm.control });
  const hasDoor = Boolean(accurateValues.hasDoor);

  const doorTouchedRef = useRef({ doorWTouched: false, doorHTouched: false });
  const previousHasDoorRef = useRef(hasDoor);

  const syncHistoryState = useCallback(() => {
    setHistoryStore(getHistory());
    setHistoryAvailable(isHistoryAvailable());
  }, []);

  useEffect(() => {
    syncHistoryState();
  }, [syncHistoryState]);

  useEffect(() => {
    if (hasDoor && !previousHasDoorRef.current) {
      const width = accurateForm.getValues("W");
      const height = accurateForm.getValues("H");

      if (!doorTouchedRef.current.doorWTouched && typeof width === "number") {
        accurateForm.setValue("doorW", width, { shouldDirty: true, shouldValidate: true });
      }

      if (!doorTouchedRef.current.doorHTouched && typeof height === "number") {
        accurateForm.setValue("doorH", height, { shouldDirty: true, shouldValidate: true });
      }
    }

    previousHasDoorRef.current = hasDoor;
    void accurateForm.trigger(["D", "doorW", "doorH", "doorCount", "doorUnitPrice"]);
  }, [accurateForm, hasDoor]);

  const accurateParsed = useMemo(() => accurateSchema.safeParse(accurateValues), [accurateValues]);
  const quickParsed = useMemo(() => quickSchema.safeParse(quickValues), [quickValues]);

  const accuratePreviewResult = useMemo(() => {
    if (!accurateParsed.success) {
      return null;
    }

    return calculateAccurate(accurateParsed.data);
  }, [accurateParsed]);

  const quickPreviewResult = useMemo(() => {
    if (!quickParsed.success) {
      return null;
    }

    return calculateQuick(quickParsed.data);
  }, [quickParsed]);

  const standardWarningFlags = {
    W: typeof accurateValues.W === "number" && accurateValues.W > 2400,
    D: typeof accurateValues.D === "number" && accurateValues.D > 1200,
    H: typeof accurateValues.H === "number" && accurateValues.H > 2400,
  };

  const hardBlockers = {
    W:
      typeof accurateValues.W === "number" &&
      typeof accurateValues.boardThickness === "number" &&
      accurateValues.W <= 2 * accurateValues.boardThickness
        ? "宽度须大于 2 倍板材厚度"
        : undefined,
    D:
      hasDoor && typeof accurateValues.D === "number" && accurateValues.D <= 20
        ? "含门时进深须大于 20mm"
        : undefined,
    H:
      typeof accurateValues.H === "number" &&
      typeof accurateValues.boardThickness === "number" &&
      accurateValues.H <= 2 * accurateValues.boardThickness
        ? "高度须大于 2 倍板材厚度"
        : undefined,
  };

  const doorWarningFlags = {
    doorW:
      hasDoor &&
      typeof accurateValues.W === "number" &&
      typeof accurateValues.doorW === "number" &&
      accurateValues.doorW > accurateValues.W + 20,
    doorH:
      hasDoor &&
      typeof accurateValues.H === "number" &&
      typeof accurateValues.doorH === "number" &&
      accurateValues.doorH > accurateValues.H + 20,
  };

  const accurateDisabled = !accurateForm.formState.isValid;
  const quickDisabled = !quickForm.formState.isValid;

  const fillAccurateForm = useCallback(
    async (input: AccurateInput) => {
      doorTouchedRef.current = {
        doorWTouched: typeof input.doorW === "number",
        doorHTouched: typeof input.doorH === "number",
      };

      accurateForm.setValue("W", input.W);
      accurateForm.setValue("D", input.D);
      accurateForm.setValue("H", input.H);
      accurateForm.setValue("boardThickness", input.boardThickness);
      accurateForm.setValue("shelfHCount", input.shelfHCount);
      accurateForm.setValue("shelfVCount", input.shelfVCount);
      accurateForm.setValue("hasDoor", input.hasDoor);
      accurateForm.setValue("doorW", input.doorW);
      accurateForm.setValue("doorH", input.doorH);
      accurateForm.setValue("doorCount", input.doorCount);
      accurateForm.setValue("doorUnitPrice", input.doorUnitPrice);
      accurateForm.setValue("isNonStd", input.isNonStd);
      accurateForm.setValue("hardwareFee", input.hardwareFee);
      accurateForm.setValue("unitPrice", input.unitPrice);
      await accurateForm.trigger();
    },
    [accurateForm],
  );

  const fillQuickForm = useCallback(
    async (input: QuickInput) => {
      quickForm.setValue("W", input.W);
      quickForm.setValue("H", input.H);
      quickForm.setValue("projectionUnitPrice", input.projectionUnitPrice);
      await quickForm.trigger();
    },
    [quickForm],
  );

  const handleTabChange = (tab: ActiveTab) => {
    setActiveTab(tab);
    setView("form");
    setResultState(null);
  };

  const handleAccurateGenerate = async () => {
    const isValid = await accurateForm.trigger();

    if (!isValid) {
      return;
    }

    const parsed = accurateSchema.safeParse(accurateForm.getValues());

    if (!parsed.success) {
      return;
    }

    const result = calculateAccurate(parsed.data);
    pushHistory({
      mode: "accurate",
      input: parsed.data,
      result,
    });
    syncHistoryState();
    setResultState({
      mode: "accurate",
      input: parsed.data,
      result,
    });
    setView("result");
  };

  const handleQuickGenerate = async () => {
    const isValid = await quickForm.trigger();

    if (!isValid) {
      return;
    }

    const parsed = quickSchema.safeParse(quickForm.getValues());

    if (!parsed.success) {
      return;
    }

    const result = calculateQuick(parsed.data);
    pushHistory({
      mode: "quick",
      input: parsed.data,
      result,
    });
    syncHistoryState();
    setResultState({
      mode: "quick",
      input: parsed.data,
      result,
    });
    setView("result");
  };

  const handleHistoryRefill = async (entry: HistoryEntry) => {
    if (entry.mode === "accurate") {
      setActiveTab("accurate");
      await fillAccurateForm(entry.input);
    } else {
      setActiveTab("quick");
      await fillQuickForm(entry.input);
    }

    setView("form");
    setResultState(null);
  };

  const handleHistoryView = async (entry: HistoryEntry) => {
    if (entry.mode === "accurate") {
      setActiveTab("accurate");
      await fillAccurateForm(entry.input);
      setResultState({
        mode: "accurate",
        input: entry.input,
        result: entry.result,
      });
    } else {
      setActiveTab("quick");
      await fillQuickForm(entry.input);
      setResultState({
        mode: "quick",
        input: entry.input,
        result: entry.result,
      });
    }

    setView("result");
  };

  const doorWRegister = accurateForm.register("doorW", {
    setValueAs: parseInteger,
    onChange: () => {
      doorTouchedRef.current.doorWTouched = true;
    },
  });

  const doorHRegister = accurateForm.register("doorH", {
    setValueAs: parseInteger,
    onChange: () => {
      doorTouchedRef.current.doorHTouched = true;
    },
  });

  const accurateResultCard =
    view === "result" && resultState?.mode === "accurate" ? (
      <ResultCard
        input={resultState.input}
        mode="accurate"
        onBack={() => setView("form")}
        onExport={() => exportAccurateToExcel(resultState.input, resultState.result)}
        result={resultState.result}
      />
    ) : (
      <AccuratePreview hasDoor={hasDoor} result={accuratePreviewResult} />
    );

  const quickResultCard =
    view === "result" && resultState?.mode === "quick" ? (
      <ResultCard
        input={resultState.input}
        mode="quick"
        onBack={() => setView("form")}
        onSwitchToAccurate={() => {
          setActiveTab("accurate");
          setView("form");
          setResultState(null);
        }}
        result={resultState.result}
      />
    ) : (
      <QuickPreview result={quickPreviewResult} />
    );

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(148,163,184,0.18),_transparent_48%),linear-gradient(180deg,_#f8fafc_0%,_#e2e8f0_100%)] px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="sticky top-0 z-20 mb-6 rounded-[32px] border border-slate-200 bg-white/85 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-5">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="space-y-2">
              <span className="inline-flex rounded-full bg-slate-950 px-3 py-1 text-xs font-medium text-white">
                全屋定制智能报价器 v1.3
              </span>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950">报价表单</h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-500">
                两个 Tab 的表单状态完全独立。切换不会触发 reset，也不会触发计算提交。
              </p>
            </div>

            <div
              aria-label="报价模式"
              className="inline-flex rounded-full border border-slate-200 bg-slate-50 p-1"
              role="tablist"
            >
              <TabButton
                active={activeTab === "accurate"}
                label="精确报价"
                onClick={() => handleTabChange("accurate")}
              />
              <TabButton
                active={activeTab === "quick"}
                label="快速估算"
                onClick={() => handleTabChange("quick")}
              />
            </div>
          </div>
        </section>

        <HistoryPanel
          isStorageAvailable={historyAvailable}
          onClear={() => {
            clearHistory();
            syncHistoryState();
          }}
          onRefill={handleHistoryRefill}
          onView={handleHistoryView}
          records={historyStore.records}
        />

        {activeTab === "accurate" ? (
          <div className="grid gap-6 md:grid-cols-2">
            <section className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-8">
              <form
                className="space-y-6"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleAccurateGenerate();
                }}
              >
                <FieldSet title="基础尺寸">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      description="1 以上整数"
                      error={getErrorMessage(accurateForm.formState.errors, "W") ?? hardBlockers.W}
                      hint={standardWarningFlags.W ? STANDARD_BOARD_WARNING : undefined}
                      inputMode="numeric"
                      label="宽度"
                      min={1}
                      placeholder="例如 580"
                      register={accurateForm.register("W", { setValueAs: parseInteger })}
                      unit="mm"
                    />
                    <FormField
                      description="1 以上整数"
                      error={getErrorMessage(accurateForm.formState.errors, "D") ?? hardBlockers.D}
                      hint={standardWarningFlags.D ? STANDARD_BOARD_WARNING : undefined}
                      inputMode="numeric"
                      label="进深"
                      min={1}
                      placeholder="例如 500"
                      register={accurateForm.register("D", { setValueAs: parseInteger })}
                      unit="mm"
                    />
                    <FormField
                      description="1 以上整数"
                      error={getErrorMessage(accurateForm.formState.errors, "H") ?? hardBlockers.H}
                      hint={standardWarningFlags.H ? STANDARD_BOARD_WARNING : undefined}
                      inputMode="numeric"
                      label="高度"
                      min={1}
                      placeholder="例如 750"
                      register={accurateForm.register("H", { setValueAs: parseInteger })}
                      unit="mm"
                    />
                    <FormField
                      description="默认 18"
                      error={getErrorMessage(accurateForm.formState.errors, "boardThickness")}
                      inputMode="numeric"
                      label="板材厚度"
                      min={9}
                      placeholder="例如 18"
                      register={accurateForm.register("boardThickness", { setValueAs: parseInteger })}
                      unit="mm"
                    />
                  </div>
                </FieldSet>

                <FieldSet title="内部配置">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      description="默认 0"
                      error={getErrorMessage(accurateForm.formState.errors, "shelfHCount")}
                      inputMode="numeric"
                      label="横层板数量"
                      min={0}
                      placeholder="例如 1"
                      register={accurateForm.register("shelfHCount", { setValueAs: parseInteger })}
                      unit="片"
                    />
                    <FormField
                      description="默认 0"
                      error={getErrorMessage(accurateForm.formState.errors, "shelfVCount")}
                      inputMode="numeric"
                      label="中竖板数量"
                      min={0}
                      placeholder="例如 0"
                      register={accurateForm.register("shelfVCount", { setValueAs: parseInteger })}
                      unit="片"
                    />
                  </div>
                  <ToggleField
                    description="开启后柜体与门板材价统一乘以 1.2"
                    label="是否非标件"
                    register={accurateForm.register("isNonStd")}
                  />
                </FieldSet>

                <FieldSet title="门板">
                  <ToggleField
                    description="开启后显示门板独立尺寸、数量与单价"
                    label="是否含门"
                    register={accurateForm.register("hasDoor")}
                  />

                  {hasDoor ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        error={getErrorMessage(accurateForm.formState.errors, "doorW")}
                        hint={doorWarningFlags.doorW ? DOOR_WARNING : undefined}
                        inputMode="numeric"
                        label="门板宽度"
                        min={1}
                        placeholder="首次开启自动带入宽度"
                        register={doorWRegister}
                        unit="mm"
                      />
                      <FormField
                        error={getErrorMessage(accurateForm.formState.errors, "doorH")}
                        hint={doorWarningFlags.doorH ? DOOR_WARNING : undefined}
                        inputMode="numeric"
                        label="门板高度"
                        min={1}
                        placeholder="首次开启自动带入高度"
                        register={doorHRegister}
                        unit="mm"
                      />
                      <FormField
                        error={getErrorMessage(accurateForm.formState.errors, "doorCount")}
                        inputMode="numeric"
                        label="门板数量"
                        min={1}
                        placeholder="例如 1"
                        register={accurateForm.register("doorCount", { setValueAs: parseInteger })}
                        unit="扇"
                      />
                      <FormField
                        error={getErrorMessage(accurateForm.formState.errors, "doorUnitPrice")}
                        inputMode="decimal"
                        label="门板单价"
                        min={1}
                        placeholder="例如 180"
                        register={accurateForm.register("doorUnitPrice", { setValueAs: parseMoney })}
                        step="0.01"
                        unit="元/m²"
                      />
                    </div>
                  ) : null}
                </FieldSet>

                <FieldSet title="单价与五金">
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      error={getErrorMessage(accurateForm.formState.errors, "unitPrice")}
                      inputMode="decimal"
                      label="柜体板材单价"
                      min={1}
                      placeholder="例如 100"
                      register={accurateForm.register("unitPrice", { setValueAs: parseMoney })}
                      step="0.01"
                      unit="元/m²"
                    />
                    <FormField
                      error={getErrorMessage(accurateForm.formState.errors, "hardwareFee")}
                      inputMode="decimal"
                      label="特殊五金加价"
                      min={0}
                      placeholder="例如 350"
                      register={accurateForm.register("hardwareFee", { setValueAs: parseMoney })}
                      step="0.01"
                      unit="元"
                    />
                  </div>
                </FieldSet>

                <div className="flex items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white px-5 py-4">
                  <p className="text-sm text-slate-500">任一必填字段非法或缺失时，生成报价按钮会置灰。</p>
                  <button
                    className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:bg-slate-300"
                    disabled={accurateDisabled}
                    type="submit"
                  >
                    生成报价
                  </button>
                </div>
              </form>
            </section>

            {accurateResultCard}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            <section className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-8">
              <form
                className="space-y-6"
                onSubmit={(event) => {
                  event.preventDefault();
                  void handleQuickGenerate();
                }}
              >
                <div className="grid gap-4">
                  <FormField
                    error={getErrorMessage(quickForm.formState.errors, "W")}
                    inputMode="numeric"
                    label="宽度"
                    min={1}
                    placeholder="例如 580"
                    register={quickForm.register("W", { setValueAs: parseInteger })}
                    unit="mm"
                  />
                  <FormField
                    error={getErrorMessage(quickForm.formState.errors, "H")}
                    inputMode="numeric"
                    label="高度"
                    min={1}
                    placeholder="例如 750"
                    register={quickForm.register("H", { setValueAs: parseInteger })}
                    unit="mm"
                  />
                  <FormField
                    error={getErrorMessage(quickForm.formState.errors, "projectionUnitPrice")}
                    inputMode="decimal"
                    label="投影单价"
                    min={1}
                    placeholder="例如 1500"
                    register={quickForm.register("projectionUnitPrice", { setValueAs: parseMoney })}
                    step="0.01"
                    unit="元/m²"
                  />
                </div>

                <div className="flex items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white px-5 py-4">
                  <p className="text-sm text-slate-500">三个字段合法后即可生成快速估算结果。</p>
                  <button
                    className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:bg-slate-300"
                    disabled={quickDisabled}
                    type="submit"
                  >
                    生成估算
                  </button>
                </div>
              </form>
            </section>

            {quickResultCard}
          </div>
        )}
      </div>
    </main>
  );
}
