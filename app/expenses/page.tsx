import { prisma } from "@/lib/prisma";
import { requireUserPage } from "@/lib/auth";
import Link from "next/link";
import { getDateRange, toDateFilter } from "@/lib/date-range";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/labels";
import { Prisma, ExpenseCategory } from "@prisma/client";
import Pagination from "@/components/Pagination";
import { formatCurrency, formatDateTh, formatTimeTh } from "@/lib/formatters";
import { getActiveVehicles } from "@/lib/vehicle-service";
import { getStaffAndDrivers } from "@/lib/user-service";
import ExpenseFilterBar from "@/components/expenses/ExpenseFilterBar";

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

const CATEGORY_NAMES = EXPENSE_CATEGORY_LABELS;

export default async function ExpensesPage({ searchParams }: PageProps) {
  const currentUser = await requireUserPage("/login");

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

  const dateFilter = toDateFilter(
    getDateRange({
      period,
      startDate: startDateParam,
      endDate: endDateParam,
      now,
    })
  );

  // 2. สร้างเงื่อนไข Where (พนักงานเห็นเฉพาะของตัวเอง)
  const whereCondition: Prisma.ExpenseWhereInput = {};

  if (dateFilter) {
    whereCondition.createdAt = dateFilter;
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
    whereCondition.category = selectedCategory as ExpenseCategory;
  }

  // 3. ดึงข้อมูล
  const [vehicles, users, totalCount, allFilteredExpenses, expenses] = await Promise.all([
    getActiveVehicles(),
    getStaffAndDrivers(),
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
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 xl:p-10 text-slate-800">
      <div className="w-full max-w-[1600px] mx-auto space-y-6">
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

        {/* แถบตัวกรองอัตโนมัติ (Instant Filter Bar) */}
        <ExpenseFilterBar
          vehicles={vehicles.map((v) => ({ id: v.id, plateNumber: v.plateNumber }))}
          users={users.map((u) => ({ id: u.id, name: u.name }))}
          isAdmin={currentUser.role === "ADMIN"}
          period={period}
          selectedVehicleId={selectedVehicleId}
          selectedUserId={selectedUserId}
          selectedCategory={selectedCategory}
          selectedSort={selectedSort}
          startDateParam={startDateParam}
          endDateParam={endDateParam}
        />

        {/* 1. มุมมองแบบการ์ดสำหรับมือถือ (Mobile Card Layout) */}
        <div className="md:hidden space-y-3">
          {expenses.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto text-2xl shadow-2xs">
                📕
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-slate-800 text-base">
                  ยังไม่มีประวัติรายจ่ายในเงื่อนไขนี้
                </h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  คุณสามารถปรับเปลี่ยนตัวกรอง หรือบันทึกค่าน้ำมันและค่าใช้จ่ายหน้างานได้ทันที
                </p>
              </div>
              <div className="pt-2 flex items-center justify-center gap-3">
                <Link
                  href="/expenses"
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 text-xs font-semibold rounded-xl transition"
                >
                  ล้างตัวกรอง
                </Link>
                <Link
                  href="/expenses/new"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white text-xs font-semibold rounded-xl transition shadow-xs flex items-center gap-1.5"
                >
                  <span>+ บันทึกรายจ่าย</span>
                </Link>
              </div>
            </div>
          ) : (
            expenses.map((exp) => {
              const d = new Date(exp.createdAt);
              const dateText = formatDateTh(d, { format: "short" });
              const timeText = formatTimeTh(d);
              const slipLink = exp.slipPhotoUrl;

              return (
                <div
                  key={exp.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-sm text-slate-800">
                        {CATEGORY_NAMES[exp.category as ExpenseCategory] || exp.category}
                      </span>
                      {Boolean(exp.isAdminOnly) && (
                        <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 text-[10px] rounded border border-amber-200 font-semibold inline-flex items-center gap-0.5">
                          🔒 แอดมิน
                        </span>
                      )}
                    </div>
                    <span className="font-bold text-rose-600 font-mono text-base">
                      {formatCurrency(exp.amount)}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1">
                    <div className="flex items-center gap-2 text-slate-500 flex-wrap">
                      {exp.vehicle && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium border border-slate-200/60">
                          🚛 {exp.vehicle.plateNumber}
                        </span>
                      )}
                      {exp.user && <span>👤 {exp.user.name}</span>}
                    </div>
                    {exp.note && (
                      <p className="text-slate-700 text-xs bg-slate-50 p-2 rounded-lg border border-slate-100">
                        {exp.note}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100">
                    <span className="text-slate-400">
                      🕒 {dateText} {timeText} น.
                    </span>
                    {slipLink ? (
                      <a
                        href={slipLink}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition font-medium"
                      >
                        🧾 ดูสลิป
                      </a>
                    ) : (
                      <span className="text-slate-300 text-[11px]">ไม่มีสลิป</span>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Pagination สำหรับ Mobile */}
          <Pagination
            className="p-3 bg-white rounded-xl border border-slate-200/80 flex flex-col justify-between items-center gap-2 text-xs text-slate-500"
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalCount}
            startIndex={startIndex}
            endIndex={endIndex}
            buildPageUrl={getPageUrl}
          />
        </div>

        {/* 2. มุมมองแบบตารางสำหรับ Desktop (Desktop Table View) */}
        <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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
                    <td colSpan={6} className="py-12 text-center">
                      <div className="space-y-3 max-w-sm mx-auto">
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto text-2xl shadow-2xs">
                          📕
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-bold text-slate-800 text-sm">
                            ยังไม่มีประวัติรายจ่ายในเงื่อนไขนี้
                          </h4>
                          <p className="text-xs text-slate-500">
                            คุณสามารถปรับเปลี่ยนตัวกรอง หรือบันทึกค่าน้ำมันและค่าใช้จ่ายหน้างานได้ทันที
                          </p>
                        </div>
                        <div className="pt-1 flex items-center justify-center gap-2">
                          <Link
                            href="/expenses"
                            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 text-xs font-semibold rounded-xl transition"
                          >
                            ล้างตัวกรอง
                          </Link>
                          <Link
                            href="/expenses/new"
                            className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white text-xs font-semibold rounded-xl transition shadow-xs"
                          >
                            + บันทึกรายจ่าย
                          </Link>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  expenses.map((exp) => {
                    const d = new Date(exp.createdAt);
                    const dateText = formatDateTh(d, { format: "short" });
                    const timeText = formatTimeTh(d);

                    const slipLink = exp.slipPhotoUrl;

                    return (
                      <tr key={exp.id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-800">{dateText}</div>
                          <div className="text-[11px] text-slate-400">{timeText} น.</div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-semibold text-slate-800">
                            {CATEGORY_NAMES[exp.category as ExpenseCategory] || exp.category}
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
                          {exp.note || "-"}
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
                          {formatCurrency(exp.amount)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination สำหรับ Desktop */}
          <Pagination
            className="p-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500"
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalCount}
            startIndex={startIndex}
            endIndex={endIndex}
            buildPageUrl={getPageUrl}
          />
        </div>
      </div>
    </main>
  );
}