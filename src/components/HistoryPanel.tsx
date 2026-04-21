"use client";

import { useState } from "react";

import type { HistoryEntry } from "@/lib/history";
import { fmtMoney } from "@/lib/format";

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

export function HistoryPanel({
  isStorageAvailable,
  onClear,
  onRefill,
  onView,
  records,
}: HistoryPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className="mb-6 rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
      <button
        aria-expanded={isOpen}
        className="text-sm font-semibold text-slate-800"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        历史记录
      </button>

      {isOpen ? (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-slate-500">最近 5 条报价记录，最新在前。</p>
            <button
              className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!records.length}
              onClick={onClear}
              type="button"
            >
              清空历史
            </button>
          </div>

          {!isStorageAvailable ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
              本地存储不可用
            </div>
          ) : records.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
              暂无历史记录
            </div>
          ) : (
            <div className="space-y-2">
              {records.map((entry) => (
                <div
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between"
                  key={entry.id}
                >
                  <div className="text-sm text-slate-600">
                    {formatHistoryDate(entry.createdAt)} | {entry.mode === "accurate" ? "[精算]" : "[估算]"} |{" "}
                    {entry.mode === "accurate"
                      ? `${entry.input.W}×${entry.input.D}×${entry.input.H}`
                      : `${entry.input.W}×${entry.input.H}`}
                    {" "} | ¥
                    {fmtMoney(
                      entry.mode === "accurate"
                        ? entry.result.finalPrice
                        : entry.result.projectionEstimate,
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700"
                      onClick={() => onRefill(entry)}
                      type="button"
                    >
                      回填
                    </button>
                    <button
                      className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
                      onClick={() => onView(entry)}
                      type="button"
                    >
                      查看
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
