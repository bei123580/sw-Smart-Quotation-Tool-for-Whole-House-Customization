import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("xlsx", async () => {
  const actual = await vi.importActual<typeof import("xlsx")>("xlsx");

  return {
    ...actual,
    writeFile: vi.fn(),
  };
});

import * as XLSX from "xlsx";
import { calculateAccurate, type AccurateInput } from "./calc";
import { buildQuotationWorkbook, exportQuotationToExcel } from "./exporter";

const input: AccurateInput = {
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

describe("buildQuotationWorkbook", () => {
  it("builds v1.3 cabinet rows, door rows, summary rows, and receipt rows", () => {
    const result = calculateAccurate(input);
    const workbook = buildQuotationWorkbook(input, result, new Date(2026, 3, 20, 13, 5, 9));

    expect(workbook.SheetNames).toEqual(["报价_20260420_130509"]);

    const sheet = workbook.Sheets["报价_20260420_130509"];
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });

    expect(rows[0]).toEqual([
      "部件名称",
      "尺寸(mm)",
      "数量",
      "面积(m²)",
      "单价(元/m²)",
      "金额(元)",
    ]);
    expect(rows[1]).toEqual(["侧板", "480×750", 2, "0.720", "100.00", "72.00"]);
    expect(rows[4]).toEqual(["横层板", "544×462", 1, "0.251", "100.00", "25.13"]);
    expect(rows[5]).toEqual([]);
    expect(rows[6]).toEqual(["门板明细"]);
    expect(rows[8]).toEqual(["门板", "580×750", 1, "0.435", "180.00", "78.30"]);
    expect(rows[10]).toEqual(["柜体展开面积(m²)", "1.882"]);
    expect(rows[11]).toEqual(["门板展开面积(m²)", "0.435"]);
    expect(rows[12]).toEqual(["柜体材价(元)", "188.20"]);
    expect(rows[13]).toEqual(["门板材价(元)", "78.30"]);
    expect(rows[16]).toEqual(["最终报价(元)", "616.50"]);
    expect(rows[18]).toEqual(["宽度W(mm)", 580]);
    expect(rows[27]).toEqual(["门板单价(元/m²)", "180.00"]);

    expect(sheet["A1"].s.font.bold).toBe(true);
    expect(sheet["A17"].s.font.bold).toBe(true);
    expect(sheet["A17"].s.font.sz).toBe(14);
    expect(sheet["!cols"]?.length).toBeGreaterThanOrEqual(6);
  });
});

describe("exportQuotationToExcel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 20, 13, 5, 9));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("writes a browser-safe local-time filename", () => {
    const writeFile = vi.spyOn(XLSX, "writeFile").mockImplementation(() => undefined);
    const result = calculateAccurate(input);

    exportQuotationToExcel(input, result);

    expect(writeFile).toHaveBeenCalledWith(
      expect.any(Object),
      "报价单_20260420_130509.xlsx",
    );
  });
});
