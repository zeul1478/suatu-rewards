/**
 * CSV for spreadsheets (RFC 4180, CRLF line ends). Cells that a spreadsheet would run as a
 * formula (starting with = + - @, tab or carriage return) get a leading apostrophe, so a name
 * like "=HYPERLINK(…)" stays text when the owner opens the file (CSV injection).
 */

export type CsvCell = string | number | boolean | null;

export function toCsv(rows: readonly (readonly CsvCell[])[]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

function csvCell(value: CsvCell): string {
  if (value === null) return "";
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}
