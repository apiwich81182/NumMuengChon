import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import ExpenseFormClient from "./ExpenseFormClient";

export const revalidate = 0;

export default async function NewExpensePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  // ดึงรายการรถจาก Database ฝั่ง Server
  const vehicles = await prisma.vehicle.findMany({
    where: { isActive: true },
    select: {
      id: true,
      plateNumber: true,
    },
    orderBy: { plateNumber: "asc" },
  });

  return (
    <ExpenseFormClient
      vehicles={vehicles}
      isAdmin={currentUser.role === "ADMIN"}
    />
  );
}