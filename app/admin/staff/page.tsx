import { requireAdminPage } from "@/lib/auth";
import StaffManagementClient from "./StaffManagementClient";
import { getAllStaffWithJobCounts } from "@/lib/user-service";
import { User, UserCog } from "lucide-react";

export const revalidate = 0;

export default async function StaffAdminPage() {
  await requireAdminPage("/jobs");

  const users = await getAllStaffWithJobCounts();

  return (
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 xl:p-10 text-slate-800">
      <div className="w-full max-w-[1600px] mx-auto space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <UserCog className="w-7 h-7 text-blue-600" />
            <span>จัดการพนักงานและผู้ใช้งาน</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            เพิ่มพนักงานขับรถ, ผู้ช่วย หรือเพิ่มผู้ดูแลระบบ (Admin)
          </p>
        </div>

        <StaffManagementClient initialUsers={users} />

      </div>
    </main>
  );
}