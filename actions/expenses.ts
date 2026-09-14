"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth"; 
import { revalidatePath } from "next/cache";
import { uploadImageToStorage } from "@/lib/upload";
import { sendLineExpenseAlert } from "@/lib/line";

export async function createExpense(formData: FormData) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" };
    }

    const vehicleId = (formData.get("vehicleId") as string) || null;
    const category = formData.get("category") as string;
    const amount = Number(formData.get("amount") || 0);
    const note = (formData.get("note") as string) || null;
    const receiptPhoto = formData.get("receiptPhoto") as File | null;
    
    // 💡 รองรับทั้งกรณีส่งจาก HTML Form ("on") และส่งผ่าน JS ("true", true)
    const rawAdminOnly = formData.get("isAdminOnly");
    const isAdminOnly = rawAdminOnly === "on" || rawAdminOnly === "true";

    let receiptUrl: string | null = null;
    if (receiptPhoto && receiptPhoto.size > 0) {
      receiptUrl = await uploadImageToStorage(receiptPhoto, "expenses");
    }

    // 1. บันทึกข้อมูลลงฐานข้อมูล
    const newExpense = await prisma.expense.create({
      data: {
        userId: currentUser.id,
        vehicleId: vehicleId || null,
        category: category as any,
        amount,
        note,
        slipPhotoUrl: receiptUrl,
        isAdminOnly,
      },
      include: {
        user: true,
        vehicle: true,
      },
    });

    // 2. ส่งแจ้งเตือน LINE
    try {
      await sendLineExpenseAlert({
        category: newExpense.category,
        amount: Number(newExpense.amount),
        userName: newExpense.user?.name || currentUser.name || "ไม่ระบุชื่อ",
        plateNumber: newExpense.vehicle?.plateNumber || null,
        note: newExpense.note,
        slipUrl: receiptUrl,
        createdAt: newExpense.createdAt,
      });
    } catch (lineErr) {
      console.error("ส่งแจ้งเตือน LINE ล้มเหลว:", lineErr);
    }

    // 3. รีเฟรช Cache ให้หน้าเว็บอัปเดตข้อมูลทันที
    revalidatePath("/expenses");
    revalidatePath("/admin/dashboard");
    
    return { success: true };
  } catch (error: any) {
    console.error("Error createExpense:", error);
    return { success: false, error: error.message || "บันทึกค่าใช้จ่ายไม่สำเร็จ" };
  }
}