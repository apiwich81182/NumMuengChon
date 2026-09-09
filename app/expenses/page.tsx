import { prisma } from "@/lib/prisma";
import Link from "next/link";
import Image from "next/image";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{
    vehicleId?: string;
    userId?: string;
    category?: string;
    sortOrder?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 15;

const CATEGORY_MAP: Record<
  string,
  { label: string; icon: string; badgeColor: string }
> = {
  FUEL: {
    label: "ค่าน้ำมัน",
    icon: "⛽",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
  },
  DISPOSAL_FEE: {
    label: "ค่าจุดทิ้งสิ่งปฏิกูล",
    icon: "💧",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
  },
  MAINTENANCE: {
    label: "ค่าซ่อมบำรุง / อะไหล่",
    icon: "🔧",
    badgeColor: "bg-rose-50 text-rose-700 border-rose-200",
  },
  OTHER: {
    label: "อื่นๆ",
    icon: "📦",
    badgeColor: "bg-slate-50 text-slate-700 border-slate-200",
  },
};

export default async function ExpensesPage({ searchParams }: PageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const params = await searchParams;
  const {
    vehicleId,
    userId,
    category,
    sortOrder = "desc",
    startDate,
    endDate,
    page: rawPage,
  } = params;

  const isAdmin = currentUser.role === "ADMIN";
  const currentPage = Math.max(1, Number(rawPage) || 1);
  const skip = (currentPage - 1) * PAGE_SIZE;

  // 1. กำหนดเงื่อนไข Where ตามสิทธิ์และตัวกรอง
  const where: any = {};

  if (!isAdmin) {
    where.userId = currentUser.id;
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

  // 2. Query ดาต้าเบสพร้อมกัน (จำนวนรวม, ผลรวมเงิน, รายการ 15 แถว, รถ, พนักงาน)
  const [totalCount, totalAmountAgg, expenses, vehicles, staffList] =
    await Promise.all([
      prisma.expense.count({ where }),
      prisma.expense.aggregate({
        where,
        _sum: { amount: true },
      }),
      prisma.expense.findMany({
        where,
        include: {
          user: true,
          vehicle: true,
        },
        orderBy: { createdAt: sortOrder === "asc" ? "asc" : "desc" },
        skip,
        take: PAGE_SIZE,
      }),
      prisma.vehicle.findMany({
        where: { isActive: true },
        orderBy: { plateNumber: "asc" },
      }),
      isAdmin
        ? prisma.user.findMany({ orderBy: { name: "asc" } })
        : Promise.resolve([]),
    ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);
  const totalAmount = totalAmountAgg._sum.amount || 0;

  // Helper สร้าง Query URL ส่งต่อไปยังปุ่มแบ่งหน้า
  const createPageUrl = (pageNumber: number) => {
    const p = new URLSearchParams();
    if (vehicleId) p.set("vehicleId", vehicleId);
    if (userId) p.set("userId", userId);
    if (category) p.set("category", category);
    if (sortOrder) p.set("sortOrder", sortOrder);
    if (startDate) p.set("startDate", startDate);
    if (endDate) p.set("endDate", endDate);
    p.set("page", pageNumber.toString());
    return `/expenses?${p.toString()}`;
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-800">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* ส่วนหัวหน้า */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              ⛽ บันทึกรายจ่ายรถและทั่วไป
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              พบ {totalCount.toLocaleString()} รายการ • ยอดรวมตัวกรองนี้{" "}
              <span className="font-semibold text-rose-600">
                ฿{Number(totalAmount).toLocaleString()}
              </span>
            </p>
          </div>
          <Link
            href="/expenses/new"
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
          >
            + บันทึกรายจ่ายใหม่
          </Link>
        </div>

        {/* ฟอร์มตัวกรองการค้นหา */}
        <form
          method="GET"
          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3"
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                คันรถ
              </label>
              <select
                name="vehicleId"
                defaultValue={vehicleId || ""}
                className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 outline-none"
              >
                <option value="">ทั้งหมด</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plateNumber}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                หมวดหมู่
              </label>
              <select
                name="category"
                defaultValue={category || ""}
                className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 outline-none"
              >
                <option value="">ทั้งหมด</option>
                <option value="FUEL">⛽ ค่าน้ำมัน</option>
                <option value="DISPOSAL_FEE">💧 ค่าจุดทิ้งสิ่งปฏิกูล</option>
                <option value="MAINTENANCE">🔧 ค่าซ่อมบำรุง / อะไหล่</option>
                <option value="OTHER">📦 อื่นๆ</option>
              </select>
            </div>

            {isAdmin && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  ผู้เบิกจ่าย
                </label>
                <select
                  name="userId"
                  defaultValue={userId || ""}
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 outline-none"
                >
                  <option value="">ทั้งหมด</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                เรียงลำดับ
              </label>
              <select
                name="sortOrder"
                defaultValue={sortOrder}
                className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 outline-none"
              >
                <option value="desc">ล่าสุด → เก่าสุด</option>
                <option value="asc">เก่าสุด → ล่าสุด</option>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">ช่วงวันที่:</span>
              <input
                type="date"
                name="startDate"
                defaultValue={startDate || ""}
                className="p-1.5 border border-slate-200 rounded-lg text-slate-700 bg-slate-50 outline-none text-xs"
              />
              <span className="text-slate-400">ถึง</span>
              <input
                type="date"
                name="endDate"
                defaultValue={endDate || ""}
                className="p-1.5 border border-slate-200 rounded-lg text-slate-700 bg-slate-50 outline-none text-xs"
              />
            </div>
            <div className="flex gap-2">
              <Link
                href="/expenses"
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
          </div>
        </form>

        {/* รายการแสดงผลการ์ดรายจ่าย */}
        {expenses.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400 text-sm">
            ไม่พบรายการรายจ่ายตามเงื่อนไขที่เลือก
          </div>
        ) : (
          <div className="space-y-3">
            {expenses.map((expense) => {
              const catInfo = CATEGORY_MAP[expense.category] || {
                label: expense.category,
                icon: "🏷️",
                badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
              };

              return (
                <div
                  key={expense.id}
                  className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-3.5">
                    <span className="text-2xl p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                      {catInfo.icon}
                    </span>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-md font-semibold border ${catInfo.badgeColor}`}
                        >
                          {catInfo.label}
                        </span>
                        {expense.vehicle && (
                          <span className="text-xs font-medium px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                            รถ: {expense.vehicle.plateNumber}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600">
                        ผู้เบิก:{" "}
                        <span className="font-medium text-slate-800">
                          {expense.user.name}
                        </span>
                        {expense.note && (
                          <>
                            {" "}
                            • หมายเหตุ:{" "}
                            <span className="text-slate-700">
                              {expense.note}
                            </span>
                          </>
                        )}
                      </p>

                      <p className="text-[11px] text-slate-400">
                        {new Date(expense.createdAt).toLocaleString("th-TH")}
                      </p>
                    </div>
                  </div>

                  {/* ฝั่งขวา: ยอดเงิน + รูปสลิป */}
                  <div className="flex items-center gap-3 self-end sm:self-center">
                    {expense.slipPhotoUrl && (
                      <a
                        href={expense.slipPhotoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium border border-slate-200 transition inline-flex items-center gap-1 shrink-0"
                      >
                        🧾 สลิป
                      </a>
                    )}

                    <span className="text-lg sm:text-xl font-bold text-rose-600">
                      -฿{Number(expense.amount).toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

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