import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import LeaveActionButtons from "./LeaveActionButtons";

export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{
    userId?: string;
    type?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 15;

// ฟังก์ชันแปลง DateTime ให้เป็นเวลา HH:mm
function formatTime(date: Date | null | undefined) {
  if (!date) return "-";
  return new Date(date).toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export default async function AdminAttendancePage({ searchParams }: PageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    redirect("/jobs");
  }

  const params = await searchParams;
  const { userId, type, startDate, endDate, page: rawPage } = params;

  const currentPage = Math.max(1, Number(rawPage) || 1);
  const skip = (currentPage - 1) * PAGE_SIZE;

  // 1. กำหนดเงื่อนไข Where สำหรับกรองข้อมูล
  const where: any = {};

  if (userId) where.userId = userId;
  if (type) where.type = type;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(`${startDate}T00:00:00`);
    if (endDate) where.createdAt.lte = new Date(`${endDate}T23:59:59`);
  }

  // 2. Query ดาต้าเบสพร้อมกัน
  const [totalCount, attendances, staffList] = await Promise.all([
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
      orderBy: { name: "asc" },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Helper สร้าง Query URL ส่งต่อไปยังปุ่มแบ่งหน้า
  const createPageUrl = (pageNumber: number) => {
    const p = new URLSearchParams();
    if (userId) p.set("userId", userId);
    if (type) p.set("type", type);
    if (startDate) p.set("startDate", startDate);
    if (endDate) p.set("endDate", endDate);
    p.set("page", pageNumber.toString());
    return `/admin/attendance?${p.toString()}`;
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ส่วนหัวหน้า */}
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
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold border border-slate-200 transition"
          >
            📊 ดู Dashboard
          </Link>
        </div>

        {/* แถบตัวกรองการค้นหา */}
        <form
          method="GET"
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                พนักงาน
              </label>
              <select
                name="userId"
                defaultValue={userId || ""}
                className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 outline-none font-medium"
              >
                <option value="">พนักงานทั้งหมด</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                ประเภทการลงเวลา
              </label>
              <select
                name="type"
                defaultValue={type || ""}
                className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 outline-none font-medium"
              >
                <option value="">ประเภททั้งหมด</option>
                <option value="WORK">เข้างานปกติ</option>
                <option value="BUSINESS_LEAVE">ลากิจ</option>
                <option value="SICK_LEAVE">ลาป่วย</option>
              </select>
            </div>

            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  ช่วงวันที่
                </label>
                <div className="flex items-center gap-1.5 text-xs">
                  <input
                    type="date"
                    name="startDate"
                    defaultValue={startDate || ""}
                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-700 bg-slate-50 outline-none text-xs"
                  />
                  <span className="text-slate-400">-</span>
                  <input
                    type="date"
                    name="endDate"
                    defaultValue={endDate || ""}
                    className="w-full p-2 border border-slate-200 rounded-lg text-slate-700 bg-slate-50 outline-none text-xs"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex justify-end gap-2">
            <Link
              href="/admin/attendance"
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition"
            >
              ล้างตัวกรอง
            </Link>
            <button
              type="submit"
              className="px-4 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-semibold transition"
            >
              ค้นหา
            </button>
          </div>
        </form>

        {/* ตารางแสดงผล */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold">
                  <th className="py-3 px-4">พนักงาน</th>
                  <th className="py-3 px-4">ประเภท</th>
                  <th className="py-3 px-4">วันที่/เวลาบันทึก</th>
                  <th className="py-3 px-4 text-center">เข้างาน</th>
                  <th className="py-3 px-4 text-center">ออกงาน</th>
                  <th className="py-3 px-4">หมายเหตุ / เหตุผล</th>
                  <th className="py-3 px-4 text-right">สถานะ / การอนุมัติ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {attendances.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      ไม่พบข้อมูลบันทึกเวลาตามเงื่อนไข
                    </td>
                  </tr>
                ) : (
                  attendances.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {item.user.name}
                      </td>
                      <td className="py-3.5 px-4">
                        {item.type === "WORK" ? (
                          <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full font-medium border border-blue-200 text-[11px]">
                            เข้างานปกติ
                          </span>
                        ) : item.type === "BUSINESS_LEAVE" ? (
                          <span className="px-2.5 py-1 bg-amber-50 text-amber-700 rounded-full font-medium border border-amber-200 text-[11px]">
                            ลากิจ
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-rose-50 text-rose-700 rounded-full font-medium border border-rose-200 text-[11px]">
                            ลาป่วย
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleString("th-TH", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="py-3.5 px-4 text-center font-medium text-emerald-600">
                        {formatTime(item.checkInAt)}
                      </td>
                      <td className="py-3.5 px-4 text-center font-medium text-orange-600">
                        {formatTime(item.checkOutAt)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                        {item.note || "-"}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {item.type === "WORK" ? (
                          <span className="text-emerald-600 font-semibold text-xs">
                            ปกติ
                          </span>
                        ) : (
                          <LeaveActionButtons
                            attendanceId={item.id}
                            isApproved={item.isApproved}
                          />
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* แถบตัวควบคุมแบ่งหน้า (Pagination Controls) */}
        {totalCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white px-5 py-3.5 rounded-2xl border border-slate-200 shadow-sm text-xs sm:text-sm">
            <div className="text-slate-500 font-medium">
              แสดง {skip + 1} - {Math.min(skip + PAGE_SIZE, totalCount)} จาก{" "}
              {totalCount.toLocaleString()} รายการ
            </div>

            <div className="flex items-center gap-2">
              {currentPage > 1 ? (
                <Link
                  href={createPageUrl(currentPage - 1)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  ◀ ก่อนหน้า
                </Link>
              ) : (
                <span className="px-3 py-1.5 border border-slate-100 rounded-xl text-xs font-medium text-slate-300 cursor-not-allowed">
                  ◀ ก่อนหน้า
                </span>
              )}

              <span className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800">
                หน้า {currentPage} / {totalPages || 1}
              </span>

              {currentPage < totalPages ? (
                <Link
                  href={createPageUrl(currentPage + 1)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  ถัดไป ▶
                </Link>
              ) : (
                <span className="px-3 py-1.5 border border-slate-100 rounded-xl text-xs font-medium text-slate-300 cursor-not-allowed">
                  ถัดไป ▶
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}