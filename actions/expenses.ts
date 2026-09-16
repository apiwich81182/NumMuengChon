"use server";

import { requireUserAction } from "@/lib/auth"; 
import { uploadImageToStorage } from "@/lib/upload";
import { createExpense as createExpenseService } from "@/lib/expense-service";
import { ExpenseCategory } from "@prisma/client";
import { normalizeAmount, normalizeBoolean } from "@/lib/expense-input";
import { revalidateExpenses } from "@/lib/revalidation";

export async function createExpense(formData: FormData) {
  try {
    const auth = await requireUserAction();
    if (!auth.success) return auth;
    const currentUser = auth.user;

    const vehicleId = (formData.get("vehicleId") as string) || null;
    const category = formData.get("category") as string;
    const amount = normalizeAmount(formData.get("amount"));
    const note = (formData.get("note") as string) || null;
    const receiptPhoto = (formData.get("receiptPhoto") || formData.get("slipPhoto") || formData.get("file")) as File | null;
    const directSlipUrl = formData.get("slipPhotoUrl") as string | null;

    if (!amount || !category) {
      return { success: false, error: "กรุณาระบุจำนวนเงินและหมวดหมู่รายจ่าย" };
    }
    
    // 💡 รองรับทั้งกรณีส่งจาก HTML Form ("on") และส่งผ่าน JS ("true", true)
    const rawAdminOnly = formData.get("isAdminOnly");
    const isAdminOnly = normalizeBoolean(rawAdminOnly);

    let receiptUrl: string | null = directSlipUrl || null;
    if (receiptPhoto && receiptPhoto.size > 0) {
      receiptUrl = await uploadImageToStorage(receiptPhoto, "expenses");
    }

    // 1. บันทึกข้อมูลลงฐานข้อมูล
    await createExpenseService({
      userId: currentUser.id,
      vehicleId,
      category: category as ExpenseCategory,
      amount,
      note,
      slipPhotoUrl: receiptUrl,
      isAdminOnly,
    });

    // 3. รีเฟรช Cache ให้หน้าเว็บอัปเดตข้อมูลทันที
    revalidateExpenses();
    
    return { success: true };
  } catch (error) {
    console.error("Error createExpense:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "บันทึกค่าใช้จ่ายไม่สำเร็จ",
    };
  }
}