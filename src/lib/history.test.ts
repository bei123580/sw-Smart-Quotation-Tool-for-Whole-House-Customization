import { beforeEach, describe, expect, it, vi } from "vitest";

import { calculateAccurate, calculateQuick, type AccurateInput, type QuickInput } from "./calc";
import {
  HISTORY_KEY,
  LEGACY_HISTORY_KEY,
  clearHistory,
  getHistory,
  isHistoryAvailable,
  pushHistory,
} from "./history";

const accurateInput: AccurateInput = {
  W: 400,
  D: 300,
  H: 600,
  boardThickness: 18,
  shelfHCount: 0,
  shelfVCount: 0,
  hasDoor: false,
  isNonStd: false,
  hardwareFee: 0,
  unitPrice: 80,
};

const quickInput: QuickInput = {
  W: 580,
  H: 750,
  projectionUnitPrice: 1500,
};

describe("history storage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("stores newest records first, supports both modes, and caps the list at five", () => {
    const accurateResult = calculateAccurate(accurateInput);
    const quickResult = calculateQuick(quickInput);

    pushHistory({
      mode: "quick",
      input: quickInput,
      result: quickResult,
    });

    for (let index = 0; index < 5; index += 1) {
      pushHistory({
        mode: "accurate",
        input: { ...accurateInput, W: accurateInput.W + index },
        result: accurateResult,
      });
    }

    const store = getHistory();

    expect(store.version).toBe("1.3");
    expect(store.records).toHaveLength(5);
    expect(store.records[0].mode).toBe("accurate");
    expect(store.records[0].input.W).toBe(404);
    expect(store.records[4].input.W).toBe(400);
  });

  it("warns and resets to an empty store when persisted JSON is malformed", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    localStorage.setItem(HISTORY_KEY, "{broken");

    expect(getHistory()).toEqual({ version: "1.3", records: [] });
    expect(warn).toHaveBeenCalled();
  });

  it("drops legacy v1 history during migration and clears the old key", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    localStorage.setItem(
      LEGACY_HISTORY_KEY,
      JSON.stringify({
        version: "1.0",
        records: [{ id: "legacy", createdAt: "2026-04-22T00:00:00.000Z" }],
      }),
    );

    expect(getHistory()).toEqual({ version: "1.3", records: [] });
    expect(localStorage.getItem(LEGACY_HISTORY_KEY)).toBeNull();
    expect(info).toHaveBeenCalledWith("历史记录已随 v1.3 版本升级清空");
  });

  it("warns and degrades when localStorage is unavailable", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(isHistoryAvailable()).toBe(false);
    expect(getHistory()).toEqual({ version: "1.3", records: [] });
    pushHistory({
      mode: "quick",
      input: quickInput,
      result: calculateQuick(quickInput),
    });
    clearHistory();
    expect(warn).toHaveBeenCalled();
  });

});
