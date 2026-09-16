import { prisma } from "@/lib/prisma";
import { requireUserPage } from "@/lib/auth";
import AttendanceClient from "./AttendanceClient";
import { getTodayRange } from "@/lib/date-range";

export const revalidate = 0;

export default async function AttendancePage() {
  const currentUser = await requireUserPage("/login");

  const { start: todayStart } = getTodayRange();

  // ดึงรายการบันทึกเวลาของคนที่ล็อกอินในวันนี้
  const todayRecord = await prisma.attendance.findFirst({
    where: {
      userId: currentUser.id,
      createdAt: { gte: todayStart },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-slate-100 py-8 px-4">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-800">⏱️ บันทึกเวลาเข้า-ออกงาน</h1>
          <p className="text-sm text-slate-500">
            ผู้ใช้งาน: <span className="font-semibold text-slate-700">{currentUser.name}</span>{" "}
            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
              {currentUser.role === "ADMIN" ? "ผู้ดูแลระบบ" : "พนักงาน"}
            </span>
          </p>
        </div>

        <AttendanceClient todayRecord={todayRecord} />
      </div>
    </main>
  );
}