import * as XLSX from "xlsx";

import type { AccurateInput, AccurateResult, PartRow } from "./calc";
import { fmtArea, fmtCoeff, fmtMoney } from "./format";

const HEADER_FILL = "FFF3F4F6";
const FINAL_FILL = "FFFEF3C7";

const pad = (n: number) => String(n).padStart(2, "0");

const formatStamp = (date: Date) =>
  `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}_${pad(
    date.getHours(),
  )}${pad(date.getMinutes())}${pad(date.getSeconds())}`;

const headerStyle: XLSX.CellObject["s"] = {
  font: { bold: true },
  fill: { fgColor: { rgb: HEADER_FILL } },
};

const finalStyle: XLSX.CellObject["s"] = {
  font: { bold: true, sz: 14 },
  fill: { fgColor: { rgb: FINAL_FILL } },
};

const detailHeader = ["部件名称", "尺寸(mm)", "数量", "面积(m²)", "单价(元/m²)", "金额(元)"];

const toPartRows = (parts: PartRow[]) =>
  parts.map((row) => [
    row.name,
    `${row.sizeW}×${row.sizeH}`,
    row.qty,
    fmtArea(row.areaM2),
    fmtMoney(row.unitPrice),
    fmtMoney(row.subtotal),
  ]);

const styleRow = (
  worksheet: XLSX.WorkSheet,
  rowIndex: number,
  columnCount: number,
  style: XLSX.CellObject["s"],
) => {
  for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
    const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
    const cell = worksheet[address];

    if (cell) {
      cell.s = style;
    }
  }
};

const encodeXml = (value: string) =>
  typeof TextEncoder !== "undefined"
    ? new TextEncoder().encode(value)
    : Buffer.from(value, "utf8");

const decodeXml = (value: Uint8Array | string) => {
  if (typeof value === "string") {
    return value;
  }

  return typeof TextDecoder !== "undefined"
    ? new TextDecoder().decode(value)
    : Buffer.from(value).toString("utf8");
};

const toUint8Array = (value: ArrayBuffer | Uint8Array | number[]) => {
  if (value instanceof Uint8Array) {
    return value;
  }

  if (value instanceof ArrayBuffer) {
    return new Uint8Array(value);
  }

  return Uint8Array.from(value);
};

const toArrayBuffer = (value: Uint8Array) =>
  value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength) as ArrayBuffer;

const buildStylesXml = () =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
  `<fonts count="3">` +
  `<font><sz val="12"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>` +
  `<font><b/><sz val="12"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>` +
  `<font><b/><sz val="14"/><color theme="1"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>` +
  `</fonts>` +
  `<fills count="4">` +
  `<fill><patternFill patternType="none"/></fill>` +
  `<fill><patternFill patternType="gray125"/></fill>` +
  `<fill><patternFill patternType="solid"><fgColor rgb="${HEADER_FILL}"/><bgColor indexed="64"/></patternFill></fill>` +
  `<fill><patternFill patternType="solid"><fgColor rgb="${FINAL_FILL}"/><bgColor indexed="64"/></patternFill></fill>` +
  `</fills>` +
  `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
  `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
  `<cellXfs count="3">` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
  `<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>` +
  `<xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/>` +
  `</cellXfs>` +
  `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
  `<dxfs count="0"/>` +
  `<tableStyles count="0" defaultTableStyle="TableStyleMedium9" defaultPivotStyle="PivotStyleMedium4"/>` +
  `</styleSheet>`;

const applyStyleToRowXml = (sheetXml: string, rowNumber: number, styleIndex: number) =>
  sheetXml.replace(
    new RegExp(`(<row r="${rowNumber}"[^>]*>)([\\s\\S]*?)(</row>)`),
    (_match, start, content, end) =>
      `${start}${(content as string).replace(/<c /g, `<c s="${styleIndex}" `)}${end}`,
  );

const buildStyledWorkbookBinary = (
  workbook: XLSX.WorkBook,
  headerRows: number[],
  finalRow: number,
) => {
  const archive = XLSX.write(workbook, {
    bookType: "xlsx",
    cellStyles: true,
    type: "array",
  });
  const cfb = XLSX.CFB.read(toUint8Array(archive), { type: "array" });
  const stylesEntry = XLSX.CFB.find(cfb, "/xl/styles.xml");
  const sheetEntry = XLSX.CFB.find(cfb, "/xl/worksheets/sheet1.xml");

  if (!stylesEntry || !sheetEntry) {
    return toUint8Array(archive);
  }

  stylesEntry.content = encodeXml(buildStylesXml());

  let sheetXml = decodeXml(sheetEntry.content as Uint8Array);

  headerRows.forEach((rowNumber) => {
    sheetXml = applyStyleToRowXml(sheetXml, rowNumber, 1);
  });
  sheetXml = applyStyleToRowXml(sheetXml, finalRow, 2);
  sheetEntry.content = encodeXml(sheetXml);

  return toUint8Array(
    XLSX.CFB.write(cfb, {
      fileType: "zip",
      type: "array",
    }),
  );
};

export function buildAccurateWorkbook(
  input: AccurateInput,
  result: AccurateResult,
  now = new Date(),
): XLSX.WorkBook {
  const stamp = formatStamp(now);
  const sheetName = `报价_${stamp}`;
  const cabinetRows = toPartRows(result.cabinetParts);
  const doorRows = toPartRows(result.doorParts);
  const rows: (string | number)[][] = [];

  rows.push(detailHeader);
  rows.push(...cabinetRows);
  rows.push([]);

  const headerRowIndexes = [0];

  if (doorRows.length > 0) {
    headerRowIndexes.push(rows.length);
    rows.push(detailHeader);
    rows.push(...doorRows);
    rows.push([]);
  }

  rows.push(["柜体展开面积(m²)", fmtArea(result.cabinetAreaM2)]);
  rows.push(["门板展开面积(m²)", fmtArea(result.doorAreaM2)]);
  rows.push(["柜体材价(元)", fmtMoney(result.cabinetCost)]);
  rows.push(["门板材价(元)", fmtMoney(result.doorCost)]);
  rows.push(["非标系数", `×${fmtCoeff(result.coeff)}`]);
  rows.push(["特殊五金(元)", fmtMoney(result.hardwareFee)]);
  const finalRowIndex = rows.length;
  rows.push(["最终报价(元)", fmtMoney(result.finalPrice)]);
  rows.push([]);

  rows.push(["宽度W(mm)", input.W]);
  rows.push(["进深D(mm)", input.D]);
  rows.push(["高度H(mm)", input.H]);
  rows.push(["板材厚度(mm)", input.boardThickness]);
  rows.push(["横层板数量", input.shelfHCount]);
  rows.push(["中竖板数量", input.shelfVCount]);
  rows.push(["是否含门", input.hasDoor ? "是" : "否"]);

  if (input.hasDoor) {
    rows.push(["门板宽度(mm)", input.doorW ?? ""]);
    rows.push(["门板高度(mm)", input.doorH ?? ""]);
    rows.push(["门板数量", input.doorCount ?? ""]);
    rows.push(["门板单价(元/m²)", input.doorUnitPrice ?? ""]);
  }

  rows.push(["是否非标件", input.isNonStd ? "是" : "否"]);
  rows.push(["板材单价(元/m²)", input.unitPrice]);
  rows.push(["特殊五金加价(元)", fmtMoney(input.hardwareFee)]);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet["!cols"] = [
    { wch: 20 },
    { wch: 20 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
  ];

  headerRowIndexes.forEach((rowIndex) => {
    styleRow(worksheet, rowIndex, detailHeader.length, headerStyle);
  });
  styleRow(worksheet, finalRowIndex, 2, finalStyle);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  return workbook;
}

export function exportAccurateToExcel(input: AccurateInput, result: AccurateResult): void {
  const now = new Date();
  const stamp = formatStamp(now);
  const workbook = buildAccurateWorkbook(input, result, now);
  const fileName = `报价单_${stamp}.xlsx`;
  const headerRows = [1];

  if (result.doorParts.length > 0) {
    headerRows.push(result.cabinetParts.length + 3);
  }

  const summaryStartRow =
    result.cabinetParts.length +
    3 +
    (result.doorParts.length > 0 ? result.doorParts.length + 2 : 0);
  const finalRow = summaryStartRow + 6;
  const styledBinary = buildStyledWorkbookBinary(workbook, headerRows, finalRow);
  const blob = new Blob([toArrayBuffer(styledBinary)], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
