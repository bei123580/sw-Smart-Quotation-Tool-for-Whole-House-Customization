import { beforeEach, describe, expect, it, vi } from "vitest";

import { calculateAccurate, calculateQuick, type AccurateInput, type QuickInput } from "./calc";
import {
  clearHistory,
  getHistory,
  isHistoryStorageAvailable,
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

    expect(store.version).toBe("1.0");
    expect(store.records).toHaveLength(5);
    expect(store.records[0].mode).toBe("accurate");
    expect(store.records[0].input.W).toBe(404);
    expect(store.records[4].input.W).toBe(400);
  });

  it("resets to an empty store when persisted JSON is malformed", () => {
    localStorage.setItem("quotation-history-v1", "{broken");

    expect(getHistory()).toEqual({ version: "1.0", records: [] });
  });

  it("silently degrades when localStorage is unavailable", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });

    expect(isHistoryStorageAvailable()).toBe(false);
    expect(getHistory()).toEqual({ version: "1.0", records: [] });
  });

  it("clears stored history", () => {
    pushHistory({
      mode: "accurate",
      input: accurateInput,
      result: calculateAccurate(accurateInput),
    });

    clearHistory();

    expect(getHistory().records).toHaveLength(0);
  });
});
