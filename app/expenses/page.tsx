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

        {/* แถบตัวกรอง (Collapsible on Mobile) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <form method="GET" action="/expenses" className="space-y-3 text-xs">
            {/* แถวบน: ปุ่มลัดช่วงเวลา (เห็นตลอดทั้งบนมือถือและคอม) */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 no-scrollbar">
              <div className="flex items-center gap-1.5 flex-nowrap">
                <span className="text-slate-500 font-medium whitespace-nowrap">ช่วงเวลา:</span>
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
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
                      className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
                        period === item.id && !startDateParam && !endDateParam
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <input type="hidden" name="period" value={period} />

            {/* แถบตัวกรองละเอียด (พับเก็บได้) */}
            <details
              open={Boolean(
                selectedVehicleId ||
                  selectedUserId ||
                  (selectedCategory && selectedCategory !== "ALL") ||
                  selectedSort !== "desc" ||
                  startDateParam ||
                  endDateParam
              )}
              className="group pt-2 border-t border-slate-100"
            >
              <summary className="flex items-center justify-between cursor-pointer list-none py-1 text-slate-600 hover:text-slate-900 font-semibold select-none">
                <span className="flex items-center gap-1.5">
                  <span>🔍</span>
                  <span>ตัวกรองเพิ่มเติม</span>
                  {(selectedVehicleId ||
                    selectedUserId ||
                    (selectedCategory && selectedCategory !== "ALL") ||
                    startDateParam ||
                    endDateParam) && (
                    <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-bold">
                      เปิดใช้งานอยู่
                    </span>
                  )}
                </span>
                <span className="text-slate-400 group-open:rotate-180 transition-transform text-xs">
                  ▼
                </span>
              </summary>

              <div className="pt-3 space-y-4">
                <div
                  className={`grid grid-cols-1 sm:grid-cols-2 ${
                    currentUser.role === "ADMIN" ? "lg:grid-cols-4" : "lg:grid-cols-3"
                  } gap-3`}
                >
                  {/* คันรถ */}
                  <div className="space-y-1">
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
                    <div className="space-y-1">
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
                  <div className="space-y-1">
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
                  <div className="space-y-1">
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

                {/* ระบุวันที่ + ปุ่มกดค้นหา */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 text-slate-500 flex-wrap">
                    <span className="text-xs">ระบุวันที่:</span>
                    <input
                      type="date"
                      name="startDate"
                      defaultValue={startDateParam}
                      className="p-1.5 px-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 outline-none focus:bg-white text-xs"
                    />
                    <span>ถึง</span>
                    <input
                      type="date"
                      name="endDate"
                      defaultValue={endDateParam}
                      className="p-1.5 px-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 outline-none focus:bg-white text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Link
                      href="/expenses"
                      className="flex-1 sm:flex-none text-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-medium transition"
                    >
                      ล้างตัวกรอง
                    </Link>
                    <button
                      type="submit"
                      className="flex-1 sm:flex-none px-5 py-2 bg-[#0c1322] hover:bg-black text-white font-semibold rounded-xl transition shadow-xs cursor-pointer"
                    >
                      ค้นหา
                    </button>
                  </div>
                </div>
              </div>
            </details>
          </form>
        </div>

        {/* 1. มุมมองแบบการ์ดสำหรับมือถือ (Mobile Card Layout) */}
        <div className="md:hidden space-y-3">
          {expenses.length === 0 ? (
            <div className="bg-white p-8 text-center text-slate-400 rounded-2xl border border-slate-200 text-sm">
              ไม่พบรายการรายจ่ายตามเงื่อนไขที่เลือก
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
                    <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                      ไม่พบรายการรายจ่ายตามเงื่อนไขที่เลือก
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