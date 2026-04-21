import { HISTORY_MAX } from "./config";
import type { AccurateInput, AccurateResult, QuickInput, QuickResult } from "./calc";

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
  version: "1.0";
  records: HistoryEntry[];
}

type HistoryEntryPayload =
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

export const HISTORY_KEY = "quotation-history-v1";

const emptyStore = (): HistoryStore => ({ version: "1.0", records: [] });

const canUseLocalStorage = () => {
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

export const isHistoryStorageAvailable = canUseLocalStorage;

export function getHistory(): HistoryStore {
  if (!canUseLocalStorage()) {
    return emptyStore();
  }

  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);

    if (!raw) {
      return emptyStore();
    }

    const parsed = JSON.parse(raw) as HistoryStore;

    if (parsed.version !== "1.0" || !Array.isArray(parsed.records)) {
      return emptyStore();
    }

    return {
      version: "1.0",
      records: parsed.records.slice(0, HISTORY_MAX),
    };
  } catch {
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(emptyStore()));
    } catch {
      return emptyStore();
    }

    return emptyStore();
  }
}

export function pushHistory(entry: HistoryEntryPayload): void {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    const store = getHistory();
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
    const record: HistoryEntry =
      entry.mode === "accurate"
        ? {
            id,
            createdAt: new Date().toISOString(),
            mode: "accurate",
            input: entry.input,
            result: entry.result,
          }
        : {
            id,
            createdAt: new Date().toISOString(),
            mode: "quick",
            input: entry.input,
            result: entry.result,
          };
    const nextStore: HistoryStore = {
      version: "1.0",
      records: [record, ...store.records].slice(0, HISTORY_MAX),
    };

    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(nextStore));
  } catch {
    return;
  }
}

export function clearHistory(): void {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(emptyStore()));
  } catch {
    return;
  }
}
