import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as XLSX from "xlsx";
import { calculateAccurate, type AccurateInput } from "./calc";
import { buildAccurateWorkbook, exportAccurateToExcel } from "./exporter";

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

describe("buildAccurateWorkbook", () => {
  it("builds cabinet rows, door rows, summary rows, and receipt rows for door mode", () => {
    const result = calculateAccurate(input);
    const workbook = buildAccurateWorkbook(input, result, new Date(2026, 3, 20, 13, 5, 9));

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
    expect(rows[6]).toEqual([
      "部件名称",
      "尺寸(mm)",
      "数量",
      "面积(m²)",
      "单价(元/m²)",
      "金额(元)",
    ]);
    expect(rows[7]).toEqual(["门板", "580×750", 1, "0.435", "180.00", "78.30"]);
    expect(rows[9]).toEqual(["柜体展开面积(m²)", "1.882"]);
    expect(rows[10]).toEqual(["门板展开面积(m²)", "0.435"]);
    expect(rows[11]).toEqual(["柜体材价(元)", "188.20"]);
    expect(rows[12]).toEqual(["门板材价(元)", "78.30"]);
    expect(rows[15]).toEqual(["最终报价(元)", "616.50"]);
    expect(rows[17]).toEqual(["宽度W(mm)", 580]);
    expect(rows[23]).toEqual(["是否含门", "是"]);
    expect(rows[24]).toEqual(["门板宽度(mm)", 580]);
    expect(rows[25]).toEqual(["门板高度(mm)", 750]);
    expect(rows[26]).toEqual(["门板数量", 1]);
    expect(rows[27]).toEqual(["门板单价(元/m²)", 180]);
    expect(rows[30]).toEqual(["特殊五金加价(元)", "350.00"]);

    expect(sheet["A1"].s.font.bold).toBe(true);
    expect(sheet["A16"].s.font.bold).toBe(true);
    expect(sheet["A16"].s.font.sz).toBe(14);
    expect(sheet["A16"].s.fill.fgColor.rgb).toBe("FFFEF3C7");
    expect(sheet["!cols"]).toEqual([
      { wch: 20 },
      { wch: 20 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
    ]);
  });
});

describe("exportAccurateToExcel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 3, 20, 13, 5, 9));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("downloads a browser-safe local-time filename with persisted styles", async () => {
    const result = calculateAccurate(input);
    const decoder = new TextDecoder();
    const createObjectURL = vi
      .spyOn(URL, "createObjectURL")
      .mockReturnValue("blob:quotation-export");
    const revokeObjectURL = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    const click = vi.fn();
    const anchor = document.createElement("a");
    const appendChild = vi.spyOn(document.body, "appendChild");
    const removeChild = vi.spyOn(document.body, "removeChild");
    const createElement = vi.spyOn(document, "createElement").mockImplementation((tagName) => {
      if (tagName.toLowerCase() === "a") {
        Object.defineProperty(anchor, "click", {
          configurable: true,
          value: click,
        });

        return anchor;
      }

      return document.createElement(tagName);
    });

    exportAccurateToExcel(input, result);

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const blob = createObjectURL.mock.calls[0]?.[0];
    expect(blob).toBeInstanceOf(Blob);
    expect(anchor.download).toBe("报价单_20260420_130509.xlsx");
    expect(anchor.href).toBe("blob:quotation-export");
    expect(appendChild).toHaveBeenCalledWith(anchor);
    expect(click).toHaveBeenCalledTimes(1);
    expect(removeChild).toHaveBeenCalledWith(anchor);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:quotation-export");

    const archive = new Uint8Array(await blob.arrayBuffer());
    const cfb = XLSX.CFB.read(archive, { type: "array" });
    const stylesXml = decoder.decode(
      XLSX.CFB.find(cfb, "/xl/styles.xml")?.content as Uint8Array,
    );
    const sheetXml = decoder.decode(
      XLSX.CFB.find(cfb, "/xl/worksheets/sheet1.xml")?.content as Uint8Array,
    );

    expect(stylesXml).toContain(`<fgColor rgb="FFF3F4F6"/>`);
    expect(stylesXml).toContain(`<fgColor rgb="FFFEF3C7"/>`);
    expect(sheetXml).toContain(`<c s="1" r="A1"`);
    expect(sheetXml).toContain(`<c s="1" r="A7"`);
    expect(sheetXml).toContain(`<c s="2" r="A16"`);
    expect(sheetXml).toContain(`<c s="2" r="B16"`);
    expect(createElement).toHaveBeenCalledWith("a");
  });
});
