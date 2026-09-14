import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { sendLineExpenseAlert } from "@/lib/line";

export async function POST(req: Request) {
  try {
    // 1. ตรวจสอบผู้ใช้งานที่ล็อกอิน
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. รับข้อมูลจาก Request Body
    const body = await req.json();
    const {
      amount,
      category,
      vehicleId,
      note,
      slipUrl,
      slipPhotoUrl,
      receiptUrl,
      imageUrl,
      isAdminOnly,
      isPrivate,
    } = body;

    if (!amount || !category) {
      return NextResponse.json(
        { error: "กรุณาระบุจำนวนเงินและหมวดหมู่รายจ่าย" },
        { status: 400 }
      );
    }

    // รวม URL รูปสลิป
    const finalSlipUrl = slipPhotoUrl || slipUrl || receiptUrl || imageUrl || null;

    // แปลงค่า Checkbox ให้เป็น Boolean (รองรับทั้ง boolean true และสตริง "true"/"on")
    const adminOnlyValue =
      isAdminOnly === true ||
      isAdminOnly === "true" ||
      isAdminOnly === "on" ||
      isPrivate === true ||
      isPrivate === "true" ||
      isPrivate === "on";

    // 3. บันทึกข้อมูลลงฐานข้อมูล Prisma
    const newExpense = await prisma.expense.create({
      data: {
        amount: Number(amount),
        category,
        vehicleId: vehicleId || null,
        note: note || null,
        userId: currentUser.id,
        // เก็บสถานะเฉพาะแอดมิน
        isAdminOnly: adminOnlyValue,
        // เก็บ URL สลิป (กำหนดชื่อฟิลด์ตามที่โมเดล Prisma รองรับ)
        ...(finalSlipUrl ? { slipPhotoUrl: finalSlipUrl } : {}),
      } as any,
      include: {
        user: true,
        vehicle: true,
      },
    });

    // 4. ส่งแจ้งเตือนผ่าน LINE
    try {
      await sendLineExpenseAlert({
        category: newExpense.category,
        amount: Number(newExpense.amount),
        userName: newExpense.user?.name || currentUser.name || "ไม่ระบุชื่อ",
        plateNumber: newExpense.vehicle?.plateNumber || null,
        note: newExpense.note,
        slipUrl: finalSlipUrl,
        createdAt: newExpense.createdAt,
      });
    } catch (lineErr) {
      console.error("ส่ง LINE แจ้งเตือนรายจ่ายไม่สำเร็จ:", lineErr);
    }

    return NextResponse.json({ success: true, data: newExpense });
  } catch (error: any) {
    console.error("Error creating expense:", error);
    return NextResponse.json(
      { error: error.message || "เกิดข้อผิดพลาดในการบันทึกรายจ่าย" },
      { status: 500 }
    );
  }
}