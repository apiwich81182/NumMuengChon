import { prisma } from "@/lib/prisma";
import { sendLineExpenseAlert } from "@/lib/line";
import type { ExpenseCategory } from "@prisma/client";

type CreateExpenseInput = {
  userId: string;
  vehicleId?: string | null;
  category: ExpenseCategory;
  amount: number;
  note?: string | null;
  slipPhotoUrl?: string | null;
  isAdminOnly?: boolean;
};

export async function createExpense(input: CreateExpenseInput) {
  const expense = await prisma.expense.create({
    data: {
      userId: input.userId,
      vehicleId: input.vehicleId || null,
      category: input.category,
      amount: input.amount,
      note: input.note || null,
      slipPhotoUrl: input.slipPhotoUrl || null,
      isAdminOnly: input.isAdminOnly ?? false,
    },
    include: {
      user: true,
      vehicle: true,
    },
  });

  try {
    await sendLineExpenseAlert({
      category: expense.category,
      amount: Number(expense.amount),
      userName: expense.user?.name || "ไม่ระบุชื่อ",
      plateNumber: expense.vehicle?.plateNumber || null,
      note: expense.note,
      slipUrl: expense.slipPhotoUrl,
      createdAt: expense.createdAt,
    });
  } catch (error) {
    console.error("ส่งแจ้งเตือน LINE ล้มเหลว:", error);
  }

  return expense;
}
