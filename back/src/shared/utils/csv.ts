// Excel en configuración regional de Colombia separa columnas con ";" y usa coma decimal; el BOM hace que lea UTF-8.
const SEPARATOR = ";";
const LINE_BREAK = "\r\n";
const UTF8_BOM = "﻿";
const NEEDS_QUOTES = /[";\r\n]/;

export type CsvCell = string | number | null;

function formatCell(cell: CsvCell): string {
  if (cell === null) return "";
  if (typeof cell === "number") return String(cell).replace(".", ",");
  return NEEDS_QUOTES.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell;
}

export function toCsv(rows: CsvCell[][]): string {
  return UTF8_BOM + rows.map((row) => row.map(formatCell).join(SEPARATOR)).join(LINE_BREAK) + LINE_BREAK;
}
