// app/api/expenses/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    // ใน app/api/expenses/route.ts
    const { amount, category, vehicleId, note, slipPhotoUrl, isAdminOnly } = body;

    // ตรวจสอบความปลอดภัย: อนุญาตให้ตั้งเป็น true ได้เฉพาะผู้ใช้ที่เป็น ADMIN
    const secureIsAdminOnly = user.role === "ADMIN" ? Boolean(isAdminOnly) : false;

    const newExpense = await prisma.expense.create({
    data: {
        amount: Number(amount),
        category: category as any,
        note: note || undefined,
        slipPhotoUrl: slipPhotoUrl || undefined,
        isAdminOnly: secureIsAdminOnly,
        ...(vehicleId ? { vehicle: { connect: { id: vehicleId } } } : {}),
        user: {
        connect: { id: user.id },
        },
    },
    });

    revalidatePath("/expenses");
    revalidatePath("/admin/reports");

    return NextResponse.json({ success: true, data: newExpense }, { status: 201 });
  } catch (error: any) {
    console.error("Expense creation error:", error);
    return NextResponse.json(
      { message: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}