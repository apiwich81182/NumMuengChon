import type { ExpenseCategory, PaymentMethod } from "@prisma/client";

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  FUEL: "ค่าน้ำมัน",
  MAINTENANCE: "ค่าซ่อมบำรุง",
  DISPOSAL_FEE: "ค่าจุดทิ้งของเสีย",
  SALARY: "ค่าแรง / เงินเดือน",
  MARKETING: "ค่าการตลาด",
  OTHER: "อื่นๆ",
};

export function getExpenseCategoryLabel(category: ExpenseCategory | string): string {
  return EXPENSE_CATEGORY_LABELS[category as ExpenseCategory] || category;
}

export function getPaymentMethodLabel(paymentMethod: PaymentMethod | string): string {
  return paymentMethod === "CASH" ? "เงินสด" : "โอนผ่านบัญชี";
}
