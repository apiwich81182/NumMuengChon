import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import ExpenseForm from "./ExpenseForm";
import { redirect } from "next/navigation";

export const revalidate = 0;

export default async function NewExpensePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  // หารถที่กำลังใช้งาน และหางานล่าสุดที่พนักงานคนนี้ทำ เพื่อดูว่าใช้รถคันไหนอยู่
  const [vehicles, lastJob] = await Promise.all([
    prisma.vehicle.findMany({
      where: { isActive: true },
      orderBy: { plateNumber: "asc" },
    }),
    prisma.job.findFirst({
      where: {
        OR: [{ userId: currentUser.id }, { driver2Id: currentUser.id }],
      },
      orderBy: { completedAt: "desc" },
      select: { vehicleId: true },
    }),
  ]);

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-md bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <ExpenseForm
          vehicles={vehicles}
          currentUser={currentUser}
          defaultVehicleId={lastJob?.vehicleId || vehicles[0]?.id || ""}
        />
      </div>
    </main>
  );
}