import type { AccurateInput, AccurateResult, QuickInput, QuickResult } from "./calc";
import { HISTORY_MAX } from "./config";

export type HistoryMode = "accurate" | "quick";

export type HistoryEntry =
  | {
      id: string;
      createdAt: string;
      mode: "accurate";
      input: AccurateInput;
      result: AccurateResult;
    }
  | {
      id: string;
      createdAt: string;
      mode: "quick";
      input: QuickInput;
      result: QuickResult;
    };

export interface HistoryStore {
  version: "1.3";
  records: HistoryEntry[];
}

type HistoryEntryDraft =
  | {
      mode: "accurate";
      input: AccurateInput;
      result: AccurateResult;
    }
  | {
      mode: "quick";
      input: QuickInput;
      result: QuickResult;
    };

export const HISTORY_KEY = "quotation-history-v1.3";
export const LEGACY_HISTORY_KEY = "quotation-history-v1";

const emptyStore = (): HistoryStore => ({
  version: "1.3",
  records: [],
});

const hasLocalStorage = () => {
  try {
    if (typeof window === "undefined" || !window.localStorage) {
      return false;
    }

    const probeKey = `${HISTORY_KEY}-probe`;
    window.localStorage.setItem(probeKey, "1");
    window.localStorage.removeItem(probeKey);

    return true;
  } catch {
    return false;
  }
};

const isHistoryEntry = (value: unknown): value is HistoryEntry => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.createdAt === "string" &&
    (candidate.mode === "accurate" || candidate.mode === "quick") &&
    typeof candidate.input === "object" &&
    candidate.input !== null &&
    typeof candidate.result === "object" &&
    candidate.result !== null
  );
};

const normalizeStore = (value: unknown): HistoryStore => {
  if (!value || typeof value !== "object") {
    return emptyStore();
  }

  const candidate = value as Record<string, unknown>;

  if (candidate.version !== "1.3" || !Array.isArray(candidate.records)) {
    return emptyStore();
  }

  return {
    version: "1.3",
    records: candidate.records.filter(isHistoryEntry).slice(0, HISTORY_MAX),
  };
};

export function isHistoryAvailable(): boolean {
  return hasLocalStorage();
}

export function getHistory(): HistoryStore {
  if (!hasLocalStorage()) {
    return emptyStore();
  }

  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);

    if (raw) {
      try {
        return normalizeStore(JSON.parse(raw));
      } catch (error) {
        console.warn("读取 v1.3 历史记录失败，已回退为空历史", error);
        return emptyStore();
      }
    }

    const legacyRaw = window.localStorage.getItem(LEGACY_HISTORY_KEY);

    if (legacyRaw) {
      window.localStorage.removeItem(LEGACY_HISTORY_KEY);
      console.info("历史记录已随 v1.3 版本升级清空");
    }

    return emptyStore();
  } catch (error) {
    console.warn("读取历史记录失败，已回退为空历史", error);
    return emptyStore();
  }
}

export function pushHistory(entry: HistoryEntryDraft): void {
  if (!hasLocalStorage()) {
    console.warn("本地存储不可用，跳过写入历史记录");
    return;
  }

  try {
    const store = getHistory();
    const record: HistoryEntry = (() => {
      if (entry.mode === "accurate") {
        return {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          mode: "accurate",
          input: entry.input,
          result: entry.result,
        };
      }

      return {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        mode: "quick",
        input: entry.input,
        result: entry.result,
      };
    })();

    const nextStore: HistoryStore = {
      version: "1.3",
      records: [record, ...store.records].slice(0, HISTORY_MAX),
    };

    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(nextStore));
  } catch (error) {
    console.warn("写入历史记录失败，已跳过本次持久化", error);
  }
}

export function clearHistory(): void {
  if (!hasLocalStorage()) {
    console.warn("本地存储不可用，无法清空历史记录");
    return;
  }

  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(emptyStore()));
  } catch (error) {
    console.warn("清空历史记录失败", error);
  }
}
