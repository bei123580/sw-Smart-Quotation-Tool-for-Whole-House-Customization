import type {
  AccurateInput,
  AccurateResult,
  QuickInput,
  QuickResult,
  QuotationPart,
} from "@/lib/calc";
import { exportQuotationToExcel } from "@/lib/exporter";
import { fmtArea, fmtCoeff, fmtMoney } from "@/lib/format";

type ResultCardProps =
  | {
      input: AccurateInput;
      mode: "accurate";
      onBack: () => void;
      result: AccurateResult;
    }
  | {
      input: QuickInput;
      mode: "quick";
      onBack: () => void;
      onSwitchToAccurate: () => void;
      result: QuickResult;
    };

function PartTable({ parts, title }: { parts: QuotationPart[]; title: string }) {
  if (!parts.length) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-white/[0.04]">
      <h3 className="border-b border-white/10 px-4 py-3 text-sm font-semibold text-white">
        {title}
      </h3>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm text-slate-200">
          <thead className="bg-white/[0.06] text-xs uppercase tracking-[0.18em] text-slate-400">
            <tr>
              <th className="px-4 py-3 font-medium">部件</th>
              <th className="px-4 py-3 font-medium">尺寸(mm)</th>
              <th className="px-4 py-3 font-medium">数量</th>
              <th className="px-4 py-3 font-medium">面积(m²)</th>
              <th className="px-4 py-3 font-medium">单价</th>
              <th className="px-4 py-3 font-medium">合计</th>
            </tr>
          </thead>
          <tbody>
            {parts.map((part) => (
              <tr key={part.name} className="border-t border-white/10">
                <td className="px-4 py-3">{part.name}</td>
                <td className="px-4 py-3">
                  {part.sizeW}×{part.sizeH}
                </td>
                <td className="px-4 py-3">{part.qty}</td>
                <td className="px-4 py-3">{fmtArea(part.areaM2)}</td>
                <td className="px-4 py-3">{fmtMoney(part.unitPrice)}</td>
                <td className="px-4 py-3">{fmtMoney(part.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-400">{label}</span>
      <span>{value}</span>
    </div>
  );
}

export function ResultCard(props: ResultCardProps) {
  if (props.mode === "quick") {
    return (
      <div className="flex h-full flex-col gap-6">
        <div className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-400">
            Estimate
          </p>
          <h2 className="text-4xl font-semibold tracking-tight text-white">
            ¥ {fmtMoney(props.result.projectionEstimate)} （估算）
          </h2>
          <p className="max-w-md text-sm leading-6 text-slate-300">
            投影面积 {fmtArea(props.result.projectionAreaM2)} m² × 投影单价 ¥
            {fmtMoney(props.input.projectionUnitPrice)}
          </p>
        </div>

        <div className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5 text-sm leading-6 text-amber-100">
          估算值 · 仅供图纸未出时粗估参考。精算请切换至「精确报价」Tab。
        </div>

        <div className="mt-auto grid gap-3 sm:grid-cols-2">
          <button
            className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 text-sm font-medium text-slate-300 transition hover:bg-white/10"
            onClick={props.onSwitchToAccurate}
            type="button"
          >
            切换到精确报价
          </button>
          <button
            className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-medium text-slate-950"
            onClick={props.onBack}
            type="button"
          >
            返回修改
          </button>
        </div>
      </div>
    );
  }

  const { input, onBack, result } = props;
  const handleExport = () => {
    try {
      exportQuotationToExcel(input, result);
    } catch {
      window.alert("导出失败，请检查浏览器下载权限");
    }
  };

  return (
    <div className="flex h-full flex-col gap-6">
      <div className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-400">
          Result
        </p>
        <h2 className="text-4xl font-semibold tracking-tight text-white">
          ¥ {fmtMoney(result.finalPrice)}
        </h2>
        <p className="max-w-md text-sm leading-6 text-slate-300">
          柜体 ¥{fmtMoney(result.cabinetCost)} + 门板 ¥{fmtMoney(result.doorCost)}
        </p>
        <p className="max-w-md text-sm leading-6 text-slate-300">
          × 非标系数 {fmtCoeff(result.coeff)} + 特殊五金 ¥{fmtMoney(result.hardwareFee)}
        </p>
      </div>

      <PartTable parts={result.cabinetParts} title="柜体明细" />
      <PartTable parts={result.doorParts} title="门板明细" />

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
        <h3 className="mb-4 text-sm font-semibold text-white">中间量</h3>
        <div className="grid gap-3 text-sm text-slate-200">
          <MetricRow label="柜体展开面积：" value={`${fmtArea(result.cabinetAreaM2)} m²`} />
          <MetricRow label="门板展开面积：" value={`${fmtArea(result.doorAreaM2)} m²`} />
          <MetricRow label="柜体材价：" value={`¥${fmtMoney(result.cabinetCost)}`} />
          <MetricRow label="门板材价：" value={`¥${fmtMoney(result.doorCost)}`} />
          <MetricRow label="非标系数：" value={`×${fmtCoeff(result.coeff)}`} />
          <MetricRow label="特殊五金：" value={`+¥${fmtMoney(result.hardwareFee)}`} />
        </div>
      </section>

      <div className="mt-auto grid gap-3 sm:grid-cols-2">
        <button
          className="inline-flex h-11 items-center justify-center rounded-full border border-white/15 bg-white/5 px-5 text-sm font-medium text-slate-300 transition hover:bg-white/10"
          onClick={handleExport}
          type="button"
        >
          导出 Excel
        </button>
        <button
          className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-medium text-slate-950"
          onClick={onBack}
          type="button"
        >
          返回修改
        </button>
      </div>
    </div>
  );
}
