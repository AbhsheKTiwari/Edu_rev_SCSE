// CSV export with protection against spreadsheet formula injection.

export function csvCell(value: unknown): string {
  let s = value === null || value === undefined ? "" : Array.isArray(value) ? value.join("; ") : String(value);
  // Cells starting with = + - @ (or tab/CR) can execute as formulas in Excel/Sheets.
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  if (/[",\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
  return s;
}

export function toCsv<T extends Record<string, unknown>>(rows: T[], columns: { key: keyof T; header: string }[]): string {
  const head = columns.map((c) => csvCell(c.header)).join(",");
  const body = rows.map((r) => columns.map((c) => csvCell(r[c.key])).join(","));
  return [head, ...body].join("\r\n") + "\r\n";
}
