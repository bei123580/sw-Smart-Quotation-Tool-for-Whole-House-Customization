import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { calculateAccurate, calculateQuick, type AccurateInput, type QuickInput } from "@/lib/calc";

import { ResultCard } from "./ResultCard";

const accurateInput: AccurateInput = {
  W: 580,
  D: 500,
  H: 750,
  boardThickness: 18,
  shelfHCount: 1,
  shelfVCount: 0,
  hasDoor: true,
  doorW: 580,
  doorH: 750,
  doorCount: 1,
  doorUnitPrice: 180,
  isNonStd: false,
  hardwareFee: 350,
  unitPrice: 100,
};

const quickInput: QuickInput = {
  W: 580,
  H: 750,
  projectionUnitPrice: 1500,
};

describe("ResultCard", () => {
  it("renders accurate and quick modes with the correct controls", () => {
    const accurateResult = calculateAccurate(accurateInput);
    const quickResult = calculateQuick(quickInput);
    const onBack = vi.fn();
    const onExport = vi.fn();
    const onSwitchToAccurate = vi.fn();
    const { rerender } = render(
      <ResultCard
        input={accurateInput}
        mode="accurate"
        onBack={onBack}
        onExport={onExport}
        result={accurateResult}
      />,
    );

    expect(screen.getByText("¥ 616.50")).toBeInTheDocument();
    expect(
      screen.getByText("柜体 ¥188.20 + 门板 ¥78.30 × 非标系数 1.0 + 特殊五金 ¥350.00"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "导出 Excel" })).toBeInTheDocument();
    expect(screen.getByText("门板明细表")).toBeInTheDocument();

    rerender(
      <ResultCard
        input={quickInput}
        mode="quick"
        onBack={onBack}
        onSwitchToAccurate={onSwitchToAccurate}
        result={quickResult}
      />,
    );

    expect(screen.getByText("¥ 652.50 （估算）")).toBeInTheDocument();
    expect(screen.getByText("⚠ 估算值 · 不含五金/非标/门板独立计价")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "切换到精确报价" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "导出 Excel" })).not.toBeInTheDocument();
  });
});
