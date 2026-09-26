import { getThaiDateParts } from "./date-range";

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
    const { year, month, day } = getThaiDateParts(date);
    return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year + 543}`;
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

/**
 * แปลงข้อความ Error ทางเทคนิค (เช่น "Failed to fetch") ให้เป็นภาษาไทยที่ผู้ใช้ทั่วไปอ่านเข้าใจง่าย และแนะนำสิ่งที่ต้องทำ
 */
export function formatUserErrorMessage(
  error: unknown,
  fallbackMessage = "เกิดข้อผิดพลาดในการทำรายการ กรุณาลองใหม่อีกครั้ง"
): string {
  if (!error) return fallbackMessage;

  const raw =
    typeof error === "string"
      ? error
      : error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error);

  const lower = raw.trim().toLowerCase();

  // 1. สัญญาณอินเทอร์เน็ตหลุด / เซิร์ฟเวอร์ไม่ตอบสนอง (Failed to fetch)
  if (
    lower.includes("failed to fetch") ||
    lower.includes("networkerror") ||
    lower.includes("load failed") ||
    lower.includes("network request failed") ||
    lower.includes("fetch failed") ||
    lower.includes("connection refused") ||
    lower.includes("econnrefused")
  ) {
    return "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ (สัญญาณเน็ตขัดข้อง หรือเซิร์ฟเวอร์กำลังรีสตาร์ท) กรุณาตรวจสอบอินเทอร์เน็ตแล้วกดลองใหม่อีกครั้ง";
  }

  // 2. หมดเวลาเชื่อมต่อ (Timeout)
  if (
    lower.includes("timeout") ||
    lower.includes("timed out") ||
    lower.includes("abort") ||
    lower.includes("signal is aborted")
  ) {
    return "การเชื่อมต่อหมดเวลา (สัญญาณเน็ตช้า) กรุณากดลองใหม่อีกครั้ง";
  }

  // 3. ปัญหาขนาดไฟล์รูปภาพเกินกำหนด
  if (
    lower.includes("payload too large") ||
    lower.includes("file too large") ||
    lower.includes("body too large") ||
    lower.includes("413")
  ) {
    return "ขนาดรูปภาพใหญ่เกินกำหนด กรุณาลองถ่ายใหม่หรือลดขนาดรูปภาพ";
  }

  // 4. เซสชันหมดอายุ / ไม่ได้รับอนุญาต
  if (
    lower.includes("unauthorized") ||
    lower.includes("session expired") ||
    lower.includes("jwt") ||
    lower.includes("authentication") ||
    lower.includes("กรุณาเข้าสู่ระบบ")
  ) {
    return "เซสชันหมดอายุหรือไม่พบสิทธิ์ กรุณารีเฟรชหน้าเว็บหรือเข้าสู่ระบบใหม่";
  }

  // 5. ปัญหาข้อมูลซ้ำซ้อนในฐานข้อมูล
  if (lower.includes("unique constraint") || lower.includes("already exists")) {
    return "ข้อมูลนี้มีอยู่ในระบบแล้ว กรุณาตรวจสอบข้อมูลซ้ำซ้อน";
  }

  // หากเป็นข้อความภาษาไทยอยู่แล้ว ให้ส่งกลับได้เลย
  const hasThai = /[\u0E00-\u0E7F]/.test(raw);
  if (hasThai) {
    return raw;
  }

  return `${fallbackMessage} (${raw})`;
}

