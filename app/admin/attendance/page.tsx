import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{
    page?: string;
    userId?: string;
    type?: string;
    period?: string; // "weekly" | "monthly" | "yearly" | "all" | "custom"
    startDate?: string;
    endDate?: string;
  }>;
}

const PAGE_SIZE = 15;

const ATTENDANCE_TYPE_LABELS: Record<string, { label: string; badgeClass: string }> = {
  WORK: { label: "เข้างานปกติ", badgeClass: "bg-blue-50 text-blue-700 border-blue-200" },
  BUSINESS_LEAVE: { label: "ลากิจ", badgeClass: "bg-amber-50 text-amber-700 border-amber-200" },
  SICK_LEAVE: { label: "ลาป่วย", badgeClass: "bg-rose-50 text-rose-700 border-rose-200" },
};

export default async function AdminAttendancePage({ searchParams }: PageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    redirect("/attendance");
  }

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const userId = params.userId || "";
  const type = params.type || "";
  const period = params.period || "monthly";
  const startDateParam = params.startDate || "";
  const endDateParam = params.endDate || "";

  const now = new Date();
  let start: Date | null = null;
  let end: Date | null = null;

  if (period === "weekly") {
    // 7 วันล่าสุด
    start = new Date(now);
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    end = new Date(now);
    end.setHours(23, 59, 59, 999);
  } else if (period === "monthly") {
    // เดือนปัจจุบัน
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  } else if (period === "yearly") {
    // ปีปัจจุบัน
    start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
  } else if (period === "custom" && (startDateParam || endDateParam)) {
    if (startDateParam) start = new Date(`${startDateParam}T00:00:00`);
    if (endDateParam) end = new Date(`${endDateParam}T23:59:59`);
  }

  const where: any = {};

  if (userId) where.userId = userId;
  if (type) where.type = type;

  if (start || end) {
    where.createdAt = {};
    if (start) where.createdAt.gte = start;
    if (end) where.createdAt.lte = end;
  }

  const [totalCount, attendances, users] = await Promise.all([
    prisma.attendance.count({ where }),
    prisma.attendance.findMany({
      where,
      include: {
        user: true,
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.user.findMany({
      where: { role: "DRIVER" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;

  // ฟังก์ชันสร้าง URL ของ Pagination
  const getPageLink = (targetPage: number) => {
    const sp = new URLSearchParams();
    if (userId) sp.set("userId", userId);
    if (type) sp.set("type", type);
    if (period) sp.set("period", period);
    if (startDateParam) sp.set("startDate", startDateParam);
    if (endDateParam) sp.set("endDate", endDateParam);
    sp.set("page", String(targetPage));
    return `/admin/attendance?${sp.toString()}`;
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* หัวกระดาษและปุ่มกลับ Dashboard */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              ⏰ บันทึกเวลาและการลาของพนักงาน
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              ตรวจสอบเวลาลงกะ และพิจารณาอนุมัติคำขอลาปฏิบัติงาน (พบทั้งหมด {totalCount.toLocaleString()} รายการ)
            </p>
          </div>
          <Link
            href="/admin/dashboard"
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold border border-slate-200 transition flex items-center gap-1.5"
          >
            📊 ดู Dashboard
          </Link>
        </div>

        {/* แถบตัวกรอง */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          {/* แท็บสลับช่วงเวลา รายสัปดาห์ / รายเดือน / รายปี / ทั้งหมด */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold overflow-x-auto w-fit">
            {[
              { id: "weekly", label: "📅 รายสัปดาห์ (7 วัน)" },
              { id: "monthly", label: "🗓️ รายเดือน" },
              { id: "yearly", label: "📆 รายปี" },
              { id: "all", label: "ทั้งหมด" },
            ].map((item) => (
              <Link
                key={item.id}
                href={`/admin/attendance?period=${item.id}${userId ? `&userId=${userId}` : ""}${type ? `&type=${type}` : ""}`}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                  period === item.id && !startDateParam
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          <form method="GET" className="space-y-4">
            <input type="hidden" name="period" value={startDateParam || endDateParam ? "custom" : period} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
              {/* พนักงาน */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1.5">พนักงาน</label>
                <select
                  name="userId"
                  defaultValue={userId}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50/50 hover:bg-slate-50 text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
                >
                  <option value="">พนักงานทั้งหมด</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* ประเภทการลงเวลา */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1.5">ประเภทการลงเวลา</label>
                <select
                  name="type"
                  defaultValue={type}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50/50 hover:bg-slate-50 text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
                >
                  <option value="">ประเภททั้งหมด</option>
                  <option value="WORK">เข้างานปกติ</option>
                  <option value="BUSINESS_LEAVE">ลากิจ</option>
                  <option value="SICK_LEAVE">ลาป่วย</option>
                </select>
              </div>

              {/* ช่วงวันที่แบบเจาะจง */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1.5">ช่วงวันที่ระบุเอง</label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    name="startDate"
                    defaultValue={startDateParam}
                    className="w-full p-1.5 border border-slate-200 rounded-lg bg-slate-50/50 text-slate-700 outline-none text-xs focus:border-blue-500 focus:bg-white"
                  />
                  <span className="text-slate-400">-</span>
                  <input
                    type="date"
                    name="endDate"
                    defaultValue={endDateParam}
                    className="w-full p-1.5 border border-slate-200 rounded-lg bg-slate-50/50 text-slate-700 outline-none text-xs focus:border-blue-500 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            {/* ปุ่มค้นหาและล้างตัวกรอง */}
            <div className="flex justify-end gap-2 pt-1 border-t border-slate-100">
              <Link
                href="/admin/attendance"
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition"
              >
                ล้างตัวกรอง
              </Link>
              <button
                type="submit"
                className="px-5 py-2 bg-[#0c1322] hover:bg-black text-white text-xs font-semibold rounded-lg transition shadow-sm"
              >
                ค้นหา
              </button>
            </div>
          </form>
        </div>

        {/* ตารางแสดงผลรายการ */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/75 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">พนักงาน</th>
                  <th className="py-3 px-4">ประเภท</th>
                  <th className="py-3 px-4">วันที่/เวลาบันทึก</th>
                  <th className="py-3 px-4 text-emerald-600">เข้างาน</th>
                  <th className="py-3 px-4 text-rose-500">ออกงาน</th>
                  <th className="py-3 px-4">หมายเหตุ / เหตุผล</th>
                  <th className="py-3 px-4 text-right">สถานะ / การอนุมัติ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {attendances.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                      ไม่พบข้อมูลการลงเวลาตามเงื่อนไขที่เลือก
                    </td>
                  </tr>
                ) : (
                  attendances.map((att) => {
                    const typeConfig = ATTENDANCE_TYPE_LABELS[att.type] || {
                      label: att.type,
                      badgeClass: "bg-slate-50 text-slate-600 border-slate-200",
                    };

                    const recordDate = new Date(att.createdAt);
                    const formattedDate = recordDate.toLocaleDateString("th-TH", {
                      day: "numeric",
                      month: "numeric",
                      year: "2-digit",
                    });
                    const formattedTime = recordDate.toLocaleTimeString("th-TH", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    const checkInTime = att.checkInAt
                      ? new Date(att.checkInAt).toLocaleTimeString("th-TH", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-";

                    const checkOutTime = att.checkOutAt
                      ? new Date(att.checkOutAt).toLocaleTimeString("th-TH", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "-";

                    return (
                      <tr key={att.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                          {att.user.name}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${typeConfig.badgeClass}`}
                          >
                            {typeConfig.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                          {formattedDate} {formattedTime}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-emerald-600 whitespace-nowrap">
                          {checkInTime}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-rose-500 whitespace-nowrap">
                          {checkOutTime}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 max-w-[200px] truncate">
                          {(att as any).note || "-"}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                            ปกติ
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ส่วนแบ่งหน้า (Pagination) */}
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              แสดง {attendances.length > 0 ? skip + 1 : 0} - {Math.min(skip + PAGE_SIZE, totalCount)} จาก{" "}
              {totalCount.toLocaleString()} รายการ
            </span>
            <div className="flex items-center gap-2">
              <Link
                href={getPageLink(page - 1)}
                className={`px-3 py-1.5 rounded-lg border border-slate-200 font-semibold ${
                  page <= 1 ? "pointer-events-none opacity-40 bg-slate-50" : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                ◀ ก่อนหน้า
              </Link>
              <span className="px-2 py-1 font-medium text-slate-700 bg-slate-100 rounded-lg">
                หน้า {page} / {totalPages}
              </span>
              <Link
                href={getPageLink(page + 1)}
                className={`px-3 py-1.5 rounded-lg border border-slate-200 font-semibold ${
                  page >= totalPages ? "pointer-events-none opacity-40 bg-slate-50" : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                ถัดไป ▶
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}