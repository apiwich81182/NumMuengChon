import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{
    period?: string;
    vehicleId?: string;
    userId?: string;
    category?: string;
    sort?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
  }>;
}

const CATEGORY_NAMES: Record<string, string> = {
  FUEL: "ค่าน้ำมัน",
  DISPOSAL_FEE: "ค่าจุดทิ้งของเสีย",
  MAINTENANCE: "ค่าซ่อมบำรุง",
  SALARY: "ค่าแรง / เงินเดือน",
  OTHER: "อื่นๆ",
};

export default async function ExpensesPage({ searchParams }: PageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  const params = await searchParams;
  const now = new Date();
  const period = params.period || (!params.startDate && !params.endDate ? "all" : "custom");
  const selectedVehicleId = params.vehicleId || "";
  const selectedUserId = params.userId || "";
  const selectedCategory = params.category || "ALL";
  const selectedSort = params.sort || "desc";
  const startDateParam = params.startDate || "";
  const endDateParam = params.endDate || "";
  const currentPage = Math.max(1, Number(params.page) || 1);
  const pageSize = 10;

  // 1. คำนวณช่วงเวลา Start/End (Smart Auto-Fill)
  let start: Date | null = null;
  let end: Date | null = null;

  if (startDateParam || endDateParam) {
    const s = startDateParam || endDateParam;
    const e = endDateParam || startDateParam;
    start = new Date(`${s}T00:00:00.000`);
    end = new Date(`${e}T23:59:59.999`);
  } else if (period === "today") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (period === "this_month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (period === "this_year") {
    start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  }

  // 2. สร้างเงื่อนไข Where (พนักงานเห็นเฉพาะของตัวเอง)
  const whereCondition: any = {};

  if (start || end) {
    const dateRange: any = {};
    if (start) dateRange.gte = start;
    if (end) dateRange.lte = end;
    whereCondition.createdAt = dateRange;
  }

  if (selectedVehicleId) {
    whereCondition.vehicleId = selectedVehicleId;
  }

  if (currentUser.role !== "ADMIN") {
    whereCondition.userId = currentUser.id;
    whereCondition.isAdminOnly = false; 
  } else if (selectedUserId) {
    whereCondition.userId = selectedUserId;
  }

  if (selectedCategory !== "ALL") {
    whereCondition.category = selectedCategory;
  }

  // 3. ดึงข้อมูล
  const [vehicles, users, totalCount, allFilteredExpenses, expenses] = await Promise.all([
    prisma.vehicle.findMany({
      where: { isActive: true },
      orderBy: { plateNumber: "asc" },
    }),
    prisma.user.findMany({
      where: { role: { in: ["DRIVER", "ADMIN"] } },
      orderBy: { name: "asc" },
    }),
    prisma.expense.count({ where: whereCondition }),
    prisma.expense.findMany({
      where: whereCondition,
      select: { amount: true },
    }),
    prisma.expense.findMany({
      where: whereCondition,
      include: {
        user: true,
        vehicle: true,
      },
      orderBy: {
        createdAt: selectedSort === "asc" ? "asc" : "desc",
      },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const totalExpenseSum = allFilteredExpenses.reduce(
    (sum, e) => sum + Number(e.amount || 0),
    0
  );

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalCount);

  const getPageUrl = (pageNumber: number) => {
    const p = new URLSearchParams();
    if (period) p.set("period", period);
    if (selectedVehicleId) p.set("vehicleId", selectedVehicleId);
    if (selectedUserId) p.set("userId", selectedUserId);
    if (selectedCategory !== "ALL") p.set("category", selectedCategory);
    if (selectedSort !== "desc") p.set("sort", selectedSort);
    if (startDateParam) p.set("startDate", startDateParam);
    if (endDateParam) p.set("endDate", endDateParam);
    p.set("page", String(pageNumber));
    return `/expenses?${p.toString()}`;
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ส่วนหัว */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              📕 รายการรายจ่าย
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              พบทั้งหมด {totalCount} รายการ{" "}
              {currentUser.role === "ADMIN" ? "(ภาพรวมบริษัท)" : "(รายการของคุณ)"}
              {currentUser.role === "ADMIN" && (
                <>
                  {" "}• รวม:{" "}
                  <strong className="text-rose-600 font-bold">
                    ฿{totalExpenseSum.toLocaleString()}
                  </strong>
                </>
              )}
            </p>
          </div>
          <Link
            href="/expenses/new"
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-sm"
          >
            + บันทึกรายจ่ายใหม่
          </Link>
        </div>

        {/* แถบตัวกรอง */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <form method="GET" action="/expenses" className="space-y-4 text-xs">
            <div
              className={`grid grid-cols-1 sm:grid-cols-2 ${
                currentUser.role === "ADMIN" ? "lg:grid-cols-4" : "lg:grid-cols-3"
              } gap-4`}
            >
              {/* คันรถ */}
              <div className="space-y-1.5">
                <label className="text-slate-500 font-medium">คันรถ</label>
                <select
                  name="vehicleId"
                  defaultValue={selectedVehicleId}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 outline-none focus:bg-white focus:border-blue-500"
                >
                  <option value="">ทั้งหมด</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plateNumber}
                    </option>
                  ))}
                </select>
              </div>

              {/* กรองพนักงาน (แสดงเฉพาะแอดมิน) */}
              {currentUser.role === "ADMIN" && (
                <div className="space-y-1.5">
                  <label className="text-slate-500 font-medium">พนักงาน</label>
                  <select
                    name="userId"
                    defaultValue={selectedUserId}
                    className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 outline-none focus:bg-white focus:border-blue-500"
                  >
                    <option value="">ทั้งหมด</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* หมวดหมู่ */}
              <div className="space-y-1.5">
                <label className="text-slate-500 font-medium">หมวดหมู่</label>
                <select
                  name="category"
                  defaultValue={selectedCategory}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 outline-none focus:bg-white focus:border-blue-500"
                >
                  <option value="ALL">ทั้งหมด</option>
                  <option value="FUEL">ค่าน้ำมัน</option>
                  <option value="DISPOSAL_FEE">ค่าจุดทิ้งของเสีย</option>
                  <option value="MAINTENANCE">ค่าซ่อมบำรุง</option>
                  {currentUser.role === "ADMIN" && (
                    <option value="SALARY">ค่าแรง / เงินเดือน</option>
                  )}
                  <option value="OTHER">อื่นๆ</option>
                </select>
              </div>

              {/* เรียงลำดับ */}
              <div className="space-y-1.5">
                <label className="text-slate-500 font-medium">เรียงลำดับ</label>
                <select
                  name="sort"
                  defaultValue={selectedSort}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 outline-none focus:bg-white focus:border-blue-500"
                >
                  <option value="desc">ล่าสุด → เก่าสุด</option>
                  <option value="asc">เก่าสุด → ล่าสุด</option>
                </select>
              </div>
            </div>

            {/* แถวล่าง: ปุ่มลัดช่วงเวลา + ระบุวันที่ */}
            <div className="pt-3 border-t border-slate-100 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-slate-500 font-medium">ช่วงเวลา:</span>
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                  {[
                    { id: "today", label: "วันนี้" },
                    { id: "this_month", label: "เดือนนี้" },
                    { id: "this_year", label: "ปีนี้" },
                    { id: "all", label: "ทั้งหมด" },
                  ].map((item) => (
                    <Link
                      key={item.id}
                      href={`/expenses?period=${item.id}${
                        selectedVehicleId ? `&vehicleId=${selectedVehicleId}` : ""
                      }${selectedUserId ? `&userId=${selectedUserId}` : ""}${
                        selectedCategory !== "ALL" ? `&category=${selectedCategory}` : ""
                      }${selectedSort !== "desc" ? `&sort=${selectedSort}` : ""}`}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                        period === item.id && !startDateParam && !endDateParam
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>

                <input type="hidden" name="period" value={period} />

                <div className="flex items-center gap-1.5 text-slate-400">
                  <span className="text-xs">หรือระบุวันที่:</span>
                  <input
                    type="date"
                    name="startDate"
                    defaultValue={startDateParam}
                    className="p-1.5 px-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 outline-none focus:bg-white"
                  />
                  <span>ถึง</span>
                  <input
                    type="date"
                    name="endDate"
                    defaultValue={endDateParam}
                    className="p-1.5 px-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 self-end lg:self-auto">
                <Link
                  href="/expenses"
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-medium transition"
                >
                  ล้างตัวกรอง
                </Link>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0c1322] hover:bg-black text-white font-semibold rounded-xl transition shadow-sm cursor-pointer"
                >
                  ค้นหา
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* ตารางแสดงรายการรายจ่าย */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 whitespace-nowrap">วัน-เวลา</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">หมวดหมู่</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">รถ / ผู้บันทึก</th>
                  <th className="py-3.5 px-4">รายละเอียด</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">สลิป</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap text-rose-600">ยอดเงิน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                      ไม่พบรายการรายจ่ายตามเงื่อนไขที่เลือก
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp: any) => {
                    const d = new Date(exp.createdAt);
                    const dateText = d.toLocaleDateString("th-TH", {
                      day: "numeric",
                      month: "short",
                      year: "2-digit",
                    });
                    const timeText = d.toLocaleTimeString("th-TH", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    });

                    // ตรวจจับสลิปจากทุกฟิลด์ที่เป็นไปได้
                    const slipLink =
                      exp.slipPhotoUrl ||
                      exp.slipUrl ||
                      exp.receiptUrl ||
                      exp.receiptPhotoUrl ||
                      exp.imageUrl ||
                      exp.photoUrl;

                    return (
                      <tr key={exp.id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-800">{dateText}</div>
                          <div className="text-[11px] text-slate-400">{timeText} น.</div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-semibold text-slate-800">
                            {CATEGORY_NAMES[exp.category] || exp.category}
                          </span>

                          {/* 🔒 แสดงป้ายแอดมินถ้าค่า isAdminOnly เป็น true */}
                          {Boolean(exp.isAdminOnly) && (
                            <span className="ml-2 px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[10px] rounded border border-amber-200 font-semibold inline-flex items-center gap-0.5">
                              🔒 แอดมิน
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-800">
                            {exp.vehicle?.plateNumber || "-"}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            {exp.user?.name || "-"}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600">
                          {exp.note || exp.description || "-"}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {slipLink ? (
                            <a
                              href={slipLink}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition font-medium"
                            >
                              ดูสลิป
                            </a>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-rose-600 font-mono text-sm sm:text-base whitespace-nowrap">
                          ฿{Number(exp.amount || 0).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500">
            <div>
              แสดง {totalCount === 0 ? 0 : startIndex + 1} - {endIndex} จาก {totalCount} รายการ
            </div>

            <div className="flex items-center gap-2">
              {currentPage > 1 ? (
                <Link
                  href={getPageUrl(currentPage - 1)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition font-medium"
                >
                  ◀ ก่อนหน้า
                </Link>
              ) : (
                <span className="px-3 py-1.5 bg-slate-50 text-slate-300 rounded-lg cursor-not-allowed">
                  ◀ ก่อนหน้า
                </span>
              )}

              <span className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 shadow-sm">
                หน้า {currentPage} / {totalPages}
              </span>

              {currentPage < totalPages ? (
                <Link
                  href={getPageUrl(currentPage + 1)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition font-medium"
                >
                  ถัดไป ▶
                </Link>
              ) : (
                <span className="px-3 py-1.5 bg-slate-50 text-slate-300 rounded-lg cursor-not-allowed">
                  ถัดไป ▶
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}