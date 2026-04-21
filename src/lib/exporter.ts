import * as XLSX from "xlsx";

import type { AccurateInput, AccurateResult, QuotationPart } from "./calc";
import { fmtArea, fmtCoeff, fmtMoney } from "./format";

const pad = (n: number) => String(n).padStart(2, "0");

const formatStamp = (date: Date) =>
  `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(
    date.getHours(),
  )}${pad(date.getMinutes())}${pad(date.getSeconds())}`;

const headerStyle = {
  font: { bold: true },
  fill: { fgColor: { rgb: "F2F4F7" } },
};

const sectionStyle = {
  font: { bold: true },
  fill: { fgColor: { rgb: "EAF2F8" } },
};

const finalStyle = {
  font: { bold: true, sz: 14 },
  fill: { fgColor: { rgb: "FFF2CC" } },
};

const displayWidth = (value: unknown) =>
  String(value ?? "")
    .split("")
    .reduce((width, char) => width + (char.charCodeAt(0) > 255 ? 12 : 8), 0);

const fitColumns = (rows: unknown[][]) => {
  const columnCount = Math.max(...rows.map((row) => row.length));

  return Array.from({ length: columnCount }, (_, columnIndex) => {
    const maxWidth = Math.max(
      ...rows.map((row) => Math.ceil(displayWidth(row[columnIndex]) / 8)),
      10,
    );

    return { wch: Math.min(maxWidth + 2, 28) };
  });
};

const styleRange = (
  worksheet: XLSX.WorkSheet,
  rowIndex: number,
  columnCount: number,
  style: XLSX.CellObject["s"],
) => {
  for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
    const cellAddress = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
    const cell = worksheet[cellAddress];

    if (cell) {
      cell.s = style;
    }
  }
};

const partRows = (parts: QuotationPart[]) =>
  parts.map((part) => [
    part.name,
    `${part.sizeW}×${part.sizeH}`,
    part.qty,
    fmtArea(part.areaM2),
    fmtMoney(part.unitPrice),
    fmtMoney(part.subtotal),
  ]);

export function buildQuotationWorkbook(
  input: AccurateInput,
  result: AccurateResult,
  date = new Date(),
) {
  const stamp = formatStamp(date);
  const sheetName = `报价_${stamp}`;
  const cabinetRows = partRows(result.cabinetParts);
  const doorRows = partRows(result.doorParts);
  const rows = [
    ["部件名称", "尺寸(mm)", "数量", "面积(m²)", "单价(元/m²)", "金额(元)"],
    ...cabinetRows,
    [],
    ["门板明细"],
    ["部件名称", "尺寸(mm)", "数量", "面积(m²)", "单价(元/m²)", "金额(元)"],
    ...doorRows,
    [],
    ["柜体展开面积(m²)", fmtArea(result.cabinetAreaM2)],
    ["门板展开面积(m²)", fmtArea(result.doorAreaM2)],
    ["柜体材价(元)", fmtMoney(result.cabinetCost)],
    ["门板材价(元)", fmtMoney(result.doorCost)],
    ["非标系数", `×${fmtCoeff(result.coeff)}`],
    ["特殊五金(元)", fmtMoney(result.hardwareFee)],
    ["最终报价(元)", fmtMoney(result.finalPrice)],
    [],
    ["宽度W(mm)", input.W],
    ["进深D(mm)", input.D],
    ["高度H(mm)", input.H],
    ["板材厚度(mm)", input.boardThickness],
    ["横层板数量", input.shelfHCount],
    ["中竖板数量", input.shelfVCount],
    ["是否含门", input.hasDoor ? "是" : "否"],
    ["门板尺寸(mm)", input.hasDoor ? `${input.doorW}×${input.doorH}` : "无"],
    ["门板数量", input.hasDoor ? input.doorCount : 0],
    ["门板单价(元/m²)", input.hasDoor ? fmtMoney(input.doorUnitPrice ?? 0) : "0.00"],
    ["是否非标件", input.isNonStd ? "是" : "否"],
    ["柜体板材单价(元/m²)", fmtMoney(input.unitPrice)],
    ["特殊五金加价(元)", fmtMoney(input.hardwareFee)],
  ];

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!cols"] = fitColumns(rows);
  worksheet["!rows"] = rows.map((_, rowIndex) => ({
    hpt: rowIndex === cabinetRows.length + doorRows.length + 11 ? 22 : 18,
  }));

  const doorSectionIndex = cabinetRows.length + 2;
  const doorHeaderIndex = doorSectionIndex + 1;
  const finalRowIndex = cabinetRows.length + doorRows.length + 11;

  styleRange(worksheet, 0, 6, headerStyle);
  styleRange(worksheet, doorSectionIndex, 6, sectionStyle);
  styleRange(worksheet, doorHeaderIndex, 6, headerStyle);
  styleRange(worksheet, finalRowIndex, 2, finalStyle);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  return workbook;
}

export function exportQuotationToExcel(
  input: AccurateInput,
  result: AccurateResult,
): void {
  const date = new Date();
  const stamp = formatStamp(date);
  const workbook = buildQuotationWorkbook(input, result, date);

  XLSX.writeFile(workbook, `报价单_${stamp}.xlsx`);
}
