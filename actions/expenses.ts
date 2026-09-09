"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth"; // <-- เพิ่มบรรทัดนี้
import { revalidatePath } from "next/cache";
import { uploadImageToStorage } from "@/lib/upload";
import { createClient } from "@supabase/supabase-js";

export async function createExpense(formData: FormData) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" };
    }

    const vehicleId = formData.get("vehicleId") as string;
    const category = formData.get("category") as string;
    const amount = Number(formData.get("amount") || 0);
    const note = formData.get("note") as string;
    const receiptPhoto = formData.get("receiptPhoto") as File | null;

    let receiptUrl: string | null = null;
    if (receiptPhoto && receiptPhoto.size > 0) {
      receiptUrl = await uploadImageToStorage(receiptPhoto, "expenses");
    }

    await prisma.expense.create({
      data: {
        userId: currentUser.id,
        vehicleId: vehicleId || null,
        category: category as any,
        amount,
        note,
        slipPhotoUrl: receiptUrl, // ✅ ใช้ชื่อ slipPhotoUrl ตาม Schema
      },
    });

    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || "บันทึกค่าใช้จ่ายไม่สำเร็จ" };
  }
}