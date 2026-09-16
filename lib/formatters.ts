export const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];

export const THAI_MONTHS_FULL = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

/**
 * แปลงจำนวนเงินเป็นรูปแบบสกุลเงินบาท เช่น ฿1,500 หรือ ฿1,500.50
 */
export function formatCurrency(amount: unknown, showSymbol = true): string {
  const num = Number(amount || 0);
  const formatted = num.toLocaleString("th-TH", {
    minimumFractionDigits: Number.isInteger(num) ? 0 : 2,
    maximumFractionDigits: 2,
  });
  return showSymbol ? `฿${formatted}` : formatted;
}

/**
 * แปลงวันที่เป็นรูปแบบไทย เช่น "16/09/2569" หรือ "16 ก.ย. 69"
 */
export function formatDateTh(
  dateInput: Date | string | number,
  options?: {
    format?: "slash" | "short" | "full";
  }
): string {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "-";

  const mode = options?.format || "slash";

  if (mode === "slash") {
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear() + 543;
    return `${day}/${month}/${year}`;
  }

  if (mode === "short") {
    return date.toLocaleDateString("th-TH", {
      day: "numeric",
      month: "short",
      year: "2-digit",
      timeZone: "Asia/Bangkok",
    });
  }

  return date.toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Bangkok",
  });
}

/**
 * แปลงเวลาเป็นรูปแบบไทย เช่น "14:30"
 */
export function formatTimeTh(dateInput: Date | string | number): string {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return "-";

  return date.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Bangkok",
  });
}

/**
 * แปลงเบอร์โทรให้แสดงผลเป็นรูปแบบ 08x-xxx-xxxx
 */
export function formatPhoneDisplay(phone: string | null | undefined): string {
  if (!phone) return "-";
  const clean = phone.trim().replace(/[-\s]/g, "");
  if (clean.length === 10) {
    return `${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6)}`;
  }
  if (clean.length === 9) {
    return `0${clean.slice(0, 2)}-${clean.slice(2, 5)}-${clean.slice(5)}`;
  }
  return phone;
}

