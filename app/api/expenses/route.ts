import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { sendLineExpenseAlert } from "@/lib/line";

export async function POST(req: Request) {
  try {
    // 1. ตรวจสอบสิทธิ์ผู้ใช้
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. รับข้อมูลจาก Body
    const body = await req.json();
    const { amount, category, vehicleId, note, slipUrl, receiptUrl, slipPhotoUrl } = body;

    if (!amount || !category) {
      return NextResponse.json(
        { error: "กรุณาระบุจำนวนเงินและหมวดหมู่รายจ่าย" },
        { status: 400 }
      );
    }

    const finalSlipUrl = slipUrl || receiptUrl || slipPhotoUrl || null;

    // 3. บันทึกข้อมูลลงฐานข้อมูล
    const newExpense = await prisma.expense.create({
      data: {
        amount: Number(amount),
        category,
        vehicleId: vehicleId || null,
        note: note || null,
        userId: currentUser.id,
      },
      include: {
        user: true,
        vehicle: true,
      },
    });

    // 4. ส่งแจ้งเตือนเข้า LINE ทันที
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