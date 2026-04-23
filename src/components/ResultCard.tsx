import type { AccurateInput, AccurateResult, QuickInput, QuickResult } from "@/lib/calc";
import { fmtArea, fmtCoeff, fmtMoney } from "@/lib/format";

export type ResultCardProps =
  | {
      mode: "accurate";
      input: AccurateInput;
      result: AccurateResult;
      onBack: () => void;
      onExport: () => void;
    }
  | {
      mode: "quick";
      input: QuickInput;
      result: QuickResult;
      onBack: () => void;
      onSwitchToAccurate: () => void;
    };

function TableSection({
  rows,
  title,
}: {
  rows: AccurateResult["cabinetParts"] | AccurateResult["doorParts"];
  title: string;
}) {
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm text-slate-700">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-5 py-3 font-medium">部件</th>
              <th className="px-5 py-3 font-medium">尺寸(mm)</th>
              <th className="px-5 py-3 font-medium">数量</th>
              <th className="px-5 py-3 font-medium">面积(m²)</th>
              <th className="px-5 py-3 font-medium">单价(元/m²)</th>
              <th className="px-5 py-3 font-medium">合计(元)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr className="border-t border-slate-100" key={`${title}-${row.name}`}>
                <td className="px-5 py-3">{row.name}</td>
                <td className="px-5 py-3">
                  {row.sizeW}×{row.sizeH}
                </td>
                <td className="px-5 py-3">{row.qty}</td>
                <td className="px-5 py-3">{fmtArea(row.areaM2)}</td>
                <td className="px-5 py-3">{fmtMoney(row.unitPrice)}</td>
                <td className="px-5 py-3">{fmtMoney(row.subtotal)}</td>
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
    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-slate-100 py-3 first:border-t-0 first:pt-0 last:pb-0">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-900">{value}</span>
    </div>
  );
}

export function ResultCard(props: ResultCardProps) {
  if (props.mode === "quick") {
    return (
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-4xl font-semibold tracking-tight text-slate-950">
              ¥ {fmtMoney(props.result.projectionEstimate)} （估算）
            </p>
            <p className="text-sm leading-6 text-slate-500">
              投影面积 {fmtArea(props.result.projectionAreaM2)} m² × 投影单价 ¥
              {fmtMoney(props.input.projectionUnitPrice)}
            </p>
          </div>

          <div className="rounded-2xl border border-yellow-300 bg-yellow-50 p-4 text-sm leading-7 text-yellow-900">
            <p>⚠ 估算值 · 不含五金/非标/门板独立计价</p>
            <p>仅供图纸未出时粗估参考</p>
            <p>精算请切换至「精确报价」Tab</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
              onClick={props.onSwitchToAccurate}
              type="button"
            >
              切换到精确报价
            </button>
            <button
              className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-medium text-white"
              onClick={props.onBack}
              type="button"
            >
              返回修改
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_60px_rgba(15,23,42,0.08)] sm:p-8">
      <div className="space-y-6">
        <div className="space-y-2">
          <p className="text-4xl font-semibold tracking-tight text-slate-950">
            ¥ {fmtMoney(props.result.finalPrice)}
          </p>
          <p className="text-sm leading-6 text-slate-500">
            柜体 ¥{fmtMoney(props.result.cabinetCost)} + 门板 ¥{fmtMoney(props.result.doorCost)}
            {" "}× 非标系数 {fmtCoeff(props.result.coeff)} + 特殊五金 ¥
            {fmtMoney(props.result.hardwareFee)}
          </p>
        </div>

        <TableSection rows={props.result.cabinetParts} title="柜体明细表" />

        {props.result.doorParts.length > 0 ? (
          <TableSection rows={props.result.doorParts} title="门板明细表" />
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div className="grid gap-0 text-sm">
            <MetricRow label="柜体展开面积" value={`${fmtArea(props.result.cabinetAreaM2)} m²`} />
            <MetricRow label="门板展开面积" value={`${fmtArea(props.result.doorAreaM2)} m²`} />
            <MetricRow label="柜体材价" value={`¥${fmtMoney(props.result.cabinetCost)}`} />
            <MetricRow label="门板材价" value={`¥${fmtMoney(props.result.doorCost)}`} />
            <MetricRow label="非标系数" value={`×${fmtCoeff(props.result.coeff)}`} />
            <MetricRow label="特殊五金" value={`+¥${fmtMoney(props.result.hardwareFee)}`} />
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            className="inline-flex h-11 items-center justify-center rounded-full border border-slate-200 bg-slate-50 px-5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
            onClick={props.onExport}
            type="button"
          >
            导出 Excel
          </button>
          <button
            className="inline-flex h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-medium text-white"
            onClick={props.onBack}
            type="button"
          >
            返回修改
          </button>
        </div>
      </div>
    </section>
  );
}
