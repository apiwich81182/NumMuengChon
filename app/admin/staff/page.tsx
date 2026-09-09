import { prisma } from "@/lib/prisma";
import StaffManagementClient from "./StaffManagementClient";

export const revalidate = 0;

export default async function StaffAdminPage() {
  const users = await prisma.user.findMany({
    include: {
      _count: {
        select: {
          jobsAsDriver1: true,
          jobsAsDriver2: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-800">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">👥 จัดการพนักงานและผู้ใช้งาน</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            เพิ่มพนักงานขับรถ, ผู้ช่วย หรือเพิ่มผู้ดูแลระบบ (Admin)
          </p>
        </div>

        <StaffManagementClient initialUsers={users} />
      </div>
    </main>
  );
}