import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{
    page?: string;
    vehicleId?: string;
    userId?: string;
    category?: string;
    sort?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

const PAGE_SIZE = 15;

const CATEGORY_LABELS: Record<string, string> = {
  FUEL: "ค่าน้ำมัน",
  MAINTENANCE: "ค่าซ่อมบำรุง",
  DISPOSAL_FEE: "ค่าจุดทิ้งของเสีย",
  SALARY: "ค่าแรง / เงินเดือน",
  OTHER: "อื่นๆ",
};

export default async function ExpensesPage({ searchParams }: PageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const isAdmin = currentUser.role === "ADMIN";
  const params = await searchParams;

  const page = Math.max(1, Number(params.page) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const vehicleId = params.vehicleId || "";
  // ถ้าเป็น ADMIN ใช้ค่าจาก filter ได้ แต่ถ้าเป็นพนักงานทั่วไป บังคับให้เป็น ID ของตนเองเสมอ
  const userId = isAdmin ? (params.userId || "") : currentUser.id;
  const category = params.category || "";
  const sort = params.sort || "desc";
  const startDate = params.startDate || "";
  const endDate = params.endDate || "";

  // เงื่อนไข Filter ของ Prisma
  const where: any = {};

  if (!isAdmin) {
    where.isAdminOnly = false;
    where.userId = currentUser.id; // 🔒 ล็อกให้ดูได้เฉพาะรายการของตัวเอง
  } else {
    if (userId) where.userId = userId;
  }

  if (vehicleId) where.vehicleId = vehicleId;
  if (category) where.category = category;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(`${startDate}T00:00:00`);
    if (endDate) where.createdAt.lte = new Date(`${endDate}T23:59:59`);
  }

  const [totalCount, expenses, vehicles, users, aggregateTotal] = await Promise.all([
    prisma.expense.count({ where }),
    prisma.expense.findMany({
      where,
      include: {
        user: true,
        vehicle: true,
      },
      orderBy: { createdAt: sort === "asc" ? "asc" : "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.vehicle.findMany({
      where: { isActive: true },
      orderBy: { plateNumber: "asc" },
    }),
    // ดึงรายชื่อพนักงานเฉพาะเมื่อเป็น ADMIN
    isAdmin
      ? prisma.user.findMany({
          orderBy: { name: "asc" },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    prisma.expense.aggregate({
      where,
      _sum: { amount: true },
    }),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE) || 1;
  const currentTotalAmount = Number(aggregateTotal._sum.amount || 0);

  // Helper สร้าง Query URL สำหรับ Pagination
  const getPageLink = (targetPage: number) => {
    const sp = new URLSearchParams();
    if (vehicleId) sp.set("vehicleId", vehicleId);
    if (isAdmin && userId) sp.set("userId", userId);
    if (category) sp.set("category", category);
    if (sort) sp.set("sort", sort);
    if (startDate) sp.set("startDate", startDate);
    if (endDate) sp.set("endDate", endDate);
    sp.set("page", String(targetPage));
    return `/expenses?${sp.toString()}`;
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* หัวกระดาษและปุ่มบันทึก */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              📕 รายการรายจ่าย
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {isAdmin ? (
                <>
                  พบทั้งหมด {totalCount.toLocaleString()} รายการ (ภาพรวมบริษัท) • รวม:{" "}
                  <span className="font-bold text-rose-600">฿{currentTotalAmount.toLocaleString()}</span>
                </>
              ) : (
                <>
                  พบทั้งหมด {totalCount.toLocaleString()} รายการ (เฉพาะรายการของคุณ) • รวม:{" "}
                  <span className="font-bold text-rose-600">฿{currentTotalAmount.toLocaleString()}</span>
                </>
              )}
            </p>
          </div>
          <Link
            href="/expenses/new"
            className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 shadow-sm"
          >
            + บันทึกรายจ่ายใหม่
          </Link>
        </div>

        {/* กล่องตัวกรอง */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <form method="GET" className="space-y-4">
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAdmin ? "lg:grid-cols-4" : "lg:grid-cols-3"} gap-4 text-xs`}>
              {/* คันรถ */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1.5">คันรถ</label>
                <select
                  name="vehicleId"
                  defaultValue={vehicleId}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50/50 hover:bg-slate-50 text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
                >
                  <option value="">ทั้งหมด</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plateNumber}
                    </option>
                  ))}
                </select>
              </div>

              {/* พนักงาน (แสดงและเลือกได้เฉพาะ ADMIN) */}
              {isAdmin && (
                <div>
                  <label className="block text-slate-600 font-semibold mb-1.5">พนักงาน</label>
                  <select
                    name="userId"
                    defaultValue={userId}
                    className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50/50 hover:bg-slate-50 text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
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

              {/* หมวดหมู่รายจ่าย */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1.5">หมวดหมู่</label>
                <select
                  name="category"
                  defaultValue={category}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50/50 hover:bg-slate-50 text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
                >
                  <option value="">ทั้งหมด</option>
                  {Object.entries(CATEGORY_LABELS).map(([k, label]) => {
                    if (!isAdmin && k === "SALARY") return null;
                    return (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* เรียงลำดับ */}
              <div>
                <label className="block text-slate-600 font-semibold mb-1.5">เรียงลำดับ</label>
                <select
                  name="sort"
                  defaultValue={sort}
                  className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50/50 hover:bg-slate-50 text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white"
                >
                  <option value="desc">ล่าสุด → เก่าสุด</option>
                  <option value="asc">เก่าสุด → ล่าสุด</option>
                </select>
              </div>
            </div>

            {/* แถวล่าง: ช่วงวันที่ + ปุ่มล้างตัวกรองและปุ่มค้นหา */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-1">
              <div className="flex items-center gap-2 text-xs flex-wrap">
                <span className="text-slate-600 font-semibold">ช่วงวันที่:</span>
                <input
                  type="date"
                  name="startDate"
                  defaultValue={startDate}
                  className="p-1.5 px-2.5 border border-slate-200 rounded-lg bg-slate-50/50 text-slate-700 outline-none text-xs focus:border-blue-500 focus:bg-white"
                />
                <span className="text-slate-400">ถึง</span>
                <input
                  type="date"
                  name="endDate"
                  defaultValue={endDate}
                  className="p-1.5 px-2.5 border border-slate-200 rounded-lg bg-slate-50/50 text-slate-700 outline-none text-xs focus:border-blue-500 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Link
                  href="/expenses"
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
            </div>
          </form>
        </div>

        {/* ตารางแสดงผลรายการ */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/75 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">วัน-เวลา</th>
                  <th className="py-3 px-4">หมวดหมู่</th>
                  <th className="py-3 px-4">รถ / ผู้บันทึก</th>
                  <th className="py-3 px-4">รายละเอียด</th>
                  <th className="py-3 px-4 text-center">สลิป</th>
                  <th className="py-3 px-4 text-right">ยอดเงิน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {expenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                      ไม่พบรายการรายจ่ายตามเงื่อนไขที่ค้นหา
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp) => {
                    const dateObj = new Date(exp.createdAt);
                    const dateText = dateObj.toLocaleDateString("th-TH", {
                      day: "numeric",
                      month: "short",
                    });
                    const timeText = dateObj.toLocaleTimeString("th-TH", {
                      hour: "2-digit",
                      minute: "2-digit",
                    });

                    return (
                      <tr key={exp.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-800">{dateText}</div>
                          <div className="text-[13px] text-slate-600 font-mono">{timeText} น.</div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-semibold text-slate-800">
                              {CATEGORY_LABELS[exp.category] || exp.category}
                            </span>
                            {exp.isAdminOnly && (
                              <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                                🔒 แอดมิน
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="font-medium text-slate-900">
                            {exp.vehicle ? exp.vehicle.plateNumber : "-"}
                          </div>
                          <div className="text-[13px] text-slate-900">{exp.user.name}</div>
                        </td>

                        <td className="py-3 px-4 max-w-[220px] truncate text-slate-600">
                          {exp.note || "-"}
                        </td>

                        <td className="py-3 px-4 text-center">
                          {exp.slipPhotoUrl ? (
                            <a
                              href={exp.slipPhotoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-block text-xs text-blue-600 hover:underline font-semibold"
                            >
                              ดูสลิป
                            </a>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right font-bold text-rose-600 whitespace-nowrap">
                          ฿{Number(exp.amount).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ส่วนแบ่งหน้า (Pagination) */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <Link
                href={getPageLink(page - 1)}
                className={`px-3 py-1.5 rounded-lg border border-slate-200 font-semibold ${
                  page <= 1 ? "pointer-events-none opacity-40 bg-slate-50" : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                ← ก่อนหน้า
              </Link>
              <span className="text-slate-500">
                หน้า {page} จาก {totalPages}
              </span>
              <Link
                href={getPageLink(page + 1)}
                className={`px-3 py-1.5 rounded-lg border border-slate-200 font-semibold ${
                  page >= totalPages ? "pointer-events-none opacity-40 bg-slate-50" : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                ถัดไป →
              </Link>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}