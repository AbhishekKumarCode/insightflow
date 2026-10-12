/**
 * One CSV cell. Cells that start with = + - @ (or a tab/CR) run as formulas in Excel and Sheets, and issue names and
 * review text come from imported data, so they get a leading apostrophe before quoting.
 */
export function csvCell(v: string | number): string {
  let t = String(v);
  if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
  return `"${t.replace(/"/g, '""')}"`;
}
export const csvRow = (cells: (string | number)[]) => cells.map(csvCell).join(",");

export function downloadFile(name: string, text: string, type: string) {
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(new Blob([text], { type })), download: name });
  a.click();
  URL.revokeObjectURL(a.href);
}
