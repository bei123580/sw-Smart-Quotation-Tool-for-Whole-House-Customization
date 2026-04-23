"use client";

import { useState } from "react";

import { fmtMoney } from "@/lib/format";
import type { HistoryEntry } from "@/lib/history";

type HistoryPanelProps = {
  isStorageAvailable: boolean;
  onClear: () => void;
  onRefill: (entry: HistoryEntry) => void;
  onView: (entry: HistoryEntry) => void;
  records: HistoryEntry[];
};

const formatHistoryDate = (createdAt: string) => {
  const date = new Date(createdAt);
  const pad = (n: number) => String(n).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
};

const getEntrySummary = (entry: HistoryEntry) => {
  if (entry.mode === "accurate") {
    return `${entry.input.W}×${entry.input.D}×${entry.input.H}${entry.input.hasDoor ? " 含门" : ""}`;
  }

  return `${entry.input.W}×${entry.input.H}`;
};

const getEntryAmount = (entry: HistoryEntry) =>
  entry.mode === "accurate"
    ? fmtMoney(entry.result.finalPrice)
    : fmtMoney(entry.result.projectionEstimate);

export function HistoryPanel({
  isStorageAvailable,
  onClear,
  onRefill,
  onView,
  records,
}: HistoryPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleClear = () => {
    if (!records.length) {
      return;
    }

    if (window.confirm("确认清空历史记录吗？")) {
      onClear();
    }
  };

  return (
    <section className="mb-6 rounded-[28px] border border-slate-200 bg-white/80 p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-900">历史记录 ({records.length}/5)</p>
        <div className="flex gap-2">
          <button
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
            onClick={() => setIsOpen((open) => !open)}
            type="button"
          >
            {isOpen ? "收起" : "展开"}
          </button>
          <button
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={!records.length}
            onClick={handleClear}
            type="button"
          >
            清空历史
          </button>
        </div>
      </div>

      {!isStorageAvailable ? (
        <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          本地存储不可用，历史记录功能已禁用
        </div>
      ) : null}

      {isOpen ? (
        <div className="mt-4 space-y-3">
          {records.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              暂无历史记录
            </div>
          ) : (
            records.map((entry) => (
              <div
                className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 lg:flex-row lg:items-center lg:justify-between"
                key={entry.id}
              >
                <p className="text-sm text-slate-600">
                  {entry.mode === "accurate" ? "[精算]" : "[估算]"} {formatHistoryDate(entry.createdAt)} |{" "}
                  {getEntrySummary(entry)} | ¥{getEntryAmount(entry)}
                </p>
                <div className="flex gap-2">
                  <button
                    className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                    onClick={() => onRefill(entry)}
                    type="button"
                  >
                    回填
                  </button>
                  <button
                    className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-medium text-white"
                    onClick={() => onView(entry)}
                    type="button"
                  >
                    查看
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}
    </section>
  );
}
