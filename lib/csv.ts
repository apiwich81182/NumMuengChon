export function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '""';
  const text = String(value).trim();
  return `"${text.replace(/"/g, '""')}"`;
}

export { formatDateTh, formatTimeTh } from "./formatters";

export function formatPhoneForExcel(phone: string | null | undefined): string {
  if (!phone) return "-";
  const cleanPhone = phone.trim().replace(/[-\s]/g, "");
  if (!cleanPhone) return "-";

  const normalizedPhone =
    cleanPhone.length === 9 && !cleanPhone.startsWith("0")
      ? `0${cleanPhone}`
      : cleanPhone;

  return `="${normalizedPhone}"`;
}

export function createCsvResponse(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number>>,
  extraHeaders: Record<string, string> = {}
): Response {
  const content = "\uFEFF" + [headers.join(","), ...rows.map((row) => row.join(","))].join("\r\n");

  return new Response(content, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      ...extraHeaders,
    },
  });
}
