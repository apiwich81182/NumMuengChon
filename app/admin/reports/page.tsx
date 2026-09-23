import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/auth";
import Link from "next/link";
import { getDateRange, toDateFilter, toLocalDateKey, getThaiDateParts } from "@/lib/date-range";
import { Prisma } from "@prisma/client";
import { summarizeFinances } from "@/lib/finance";
import { THAI_MONTHS_SHORT } from "@/lib/formatters";
import { getActiveVehicles } from "@/lib/vehicle-service";

export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{
    period?: string; // "weekly" | "monthly" | "yearly" | "custom"
    year?: string;
    month?: string;
    vehicleId?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

const MONTH_NAMES = THAI_MONTHS_SHORT;

export default async function AdminReportsPage({ searchParams }: PageProps) {
  await requireAdminPage("/jobs");

  const params = await searchParams;
  const now = new Date();
  const period = params.period || "yearly";
  const vehicleId = params.vehicleId || "";
  const targetYear = Number(params.year) || now.getFullYear();
  const targetMonth = Number(params.month) || (now.getMonth() + 1);
  const startDateParam = params.startDate || "";
  const endDateParam = params.endDate || "";

  const { start, end } = getDateRange({
    period,
    startDate: startDateParam,
    endDate: endDateParam,
    year: targetYear,
    month: targetMonth,
    now,
  });

  // 2. เงื่อนไข Query ข้อมูล
  const dateFilter = toDateFilter({ start, end });
  const jobWhere: Prisma.JobWhereInput = {
    status: "COMPLETED",
  };
  const expenseWhere: Prisma.ExpenseWhereInput = {};

  if (vehicleId) {
    jobWhere.vehicleId = vehicleId;
    expenseWhere.vehicleId = vehicleId;
  }

  if (dateFilter) {
    jobWhere.completedAt = dateFilter;
    expenseWhere.createdAt = dateFilter;
  }

  const [jobs, expenses, vehicles] = await Promise.all([
    prisma.job.findMany({
      where: jobWhere,
      select: {
        id: true,
        price: true,
        volumePumped: true,
        completedAt: true,
        createdAt: true,
      },
    }),
    prisma.expense.findMany({
      where: expenseWhere,
      select: {
        id: true,
        amount: true,
        category: true,
        createdAt: true,
      },
    }),
    getActiveVehicles(),
  ]);

  const { totalRevenue, totalExpense, netProfit } = summarizeFinances(jobs, expenses);

  // 3. จัดกลุ่มข้อมูล (Breakdown) สำหรับกราฟและตาราง
  type BreakdownItem = {
    label: string;
    revenue: number;
    expense: number;
    profit: number;
    keyDate: string;
  };

  let breakdownList: BreakdownItem[] = [];

  if (period === "yearly") {
    breakdownList = Array.from({ length: 12 }, (_, i) => ({
      label: MONTH_NAMES[i],
      revenue: 0,
      expense: 0,
      profit: 0,
      keyDate: String(i),
    }));

    jobs.forEach((j) => {
      const { year, month } = getThaiDateParts(j.completedAt || j.createdAt);
      if (year === targetYear) {
        breakdownList[month - 1].revenue += Number(j.price || 0);
      }
    });

    expenses.forEach((e) => {
      const { year, month } = getThaiDateParts(e.createdAt);
      if (year === targetYear) {
        breakdownList[month - 1].expense += Number(e.amount || 0);
      }
    });
  } else if (period === "weekly" && start) {
    for (let i = 0; i < 7; i++) {
      const d = new Date(start.getTime());
      d.setDate(d.getDate() + i);
      const dayStr = d.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        timeZone: "Asia/Bangkok",
      });
      const localKey = toLocalDateKey(d);

      breakdownList.push({
        label: dayStr,
        revenue: 0,
        expense: 0,
        profit: 0,
        keyDate: localKey,
      });
    }

    jobs.forEach((j) => {
      const d = new Date(j.completedAt || j.createdAt);
      const jobKey = toLocalDateKey(d);
      const match = breakdownList.find((b) => b.keyDate === jobKey);
      if (match) {
        match.revenue += Number(j.price || 0);
      }
    });

    expenses.forEach((e) => {
      const d = new Date(e.createdAt);
      const expKey = toLocalDateKey(d);
      const match = breakdownList.find((b) => b.keyDate === expKey);
      if (match) {
        match.expense += Number(e.amount || 0);
      }
    });
  } else if (period === "monthly" && start && end) {
    const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      breakdownList.push({
        label: `${day}`,
        revenue: 0,
        expense: 0,
        profit: 0,
        keyDate: String(day),
      });
    }

    jobs.forEach((j) => {
      const { year, month, day } = getThaiDateParts(j.completedAt || j.createdAt);
      if (year === targetYear && month === targetMonth) {
        if (breakdownList[day - 1]) {
          breakdownList[day - 1].revenue += Number(j.price || 0);
        }
      }
    });

    expenses.forEach((e) => {
      const { year, month, day } = getThaiDateParts(e.createdAt);
      if (year === targetYear && month === targetMonth) {
        if (breakdownList[day - 1]) {
          breakdownList[day - 1].expense += Number(e.amount || 0);
        }
      }
    });
  } else if (period === "custom" && start && end) {
    const curr = new Date(start.getTime());
    while (curr <= end) {
      const localKey = toLocalDateKey(curr);
      const dayStr = curr.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "short",
        timeZone: "Asia/Bangkok",
      });
      breakdownList.push({
        label: dayStr,
        revenue: 0,
        expense: 0,
        profit: 0,
        keyDate: localKey,
      });
      curr.setDate(curr.getDate() + 1);
    }

    jobs.forEach((j) => {
      const d = new Date(j.completedAt || j.createdAt);
      const jobKey = toLocalDateKey(d);
      const match = breakdownList.find((b) => b.keyDate === jobKey);
      if (match) {
        match.revenue += Number(j.price || 0);
      }
    });

    expenses.forEach((e) => {
      const d = new Date(e.createdAt);
      const expKey = toLocalDateKey(d);
      const match = breakdownList.find((b) => b.keyDate === expKey);
      if (match) {
        match.expense += Number(e.amount || 0);
      }
    });
  }

  breakdownList.forEach((item) => {
    item.profit = item.revenue - item.expense;
  });

  const exportParams = new URLSearchParams();
  exportParams.set("period", period);
  if (vehicleId) exportParams.set("vehicleId", vehicleId);
  if (period === "yearly") exportParams.set("year", String(targetYear));
  if (period === "monthly") {
    exportParams.set("year", String(targetYear));
    exportParams.set("month", String(targetMonth));
  }
  if (period === "custom") {
    if (startDateParam) exportParams.set("startDate", startDateParam);
    if (endDateParam) exportParams.set("endDate", endDateParam);
  }

  const maxVal = Math.max(
    ...breakdownList.map((m) => Math.max(m.revenue, m.expense)),
    1000
  );

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* หัวกระดาษ */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              📊 สรุปรายงานรายรับ - รายจ่าย
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              วิเคราะห์ผลการดำเนินงานและเปรียบเทียบกระแสเงินสด
            </p>
          </div>
          <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
            <a
              href={`/api/export/reports?${exportParams.toString()}`}
              target="_blank"
              className="px-3 sm:px-4 py-2 bg-[#027a48] hover:bg-[#02643c] text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition shadow-sm cursor-pointer text-center"
            >
              📥 Export CSV
            </a>
            <Link
              href="/admin/dashboard"
              className="px-3 sm:px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs sm:text-sm font-medium border border-slate-200 transition flex items-center justify-center text-center"
            >
              ← แดชบอร์ด
            </Link>
          </div>
        </div>

        {/* แถบตัวกรอง */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <form method="GET" className="space-y-4">
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
              {/* แถบเลือกประเภทช่วงเวลา */}
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold overflow-x-auto no-scrollbar w-full md:w-fit">
                {[
                  { id: "weekly", label: "📅 รายสัปดาห์" },
                  { id: "monthly", label: "🗓️ รายเดือน" },
                  { id: "yearly", label: "📆 รายปี" },
                  { id: "custom", label: "⚙️ เลือกช่วงเอง" },
                ].map((item) => (
                  <Link
                    key={item.id}
                    href={`/admin/reports?period=${item.id}${vehicleId ? `&vehicleId=${vehicleId}` : ""}${
                      item.id === "yearly" ? `&year=${targetYear}` : ""
                    }${item.id === "monthly" ? `&year=${targetYear}&month=${targetMonth}` : ""}`}
                    className={`flex-1 sm:flex-initial text-center px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                      period === item.id
                        ? "bg-white text-slate-900 shadow-sm font-bold"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              {/* เลือกรถ */}
              <div className="w-full md:w-auto">
                <select
                  name="vehicleId"
                  defaultValue={vehicleId}
                  className="w-full md:w-56 p-2.5 sm:p-2 text-xs border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-800 outline-none focus:border-blue-500"
                >
                  <option value="">ทุกคันรถ (ภาพรวม)</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.plateNumber}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <input type="hidden" name="period" value={period} />

            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
              <div className="w-full sm:w-auto">
                {period === "weekly" && (
                  <span className="text-slate-500 font-medium">ย้อนหลัง 7 วัน นับจากปัจจุบัน</span>
                )}

                {period === "monthly" && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-600 font-medium">ระบุเดือน/ปี:</span>
                    <select
                      name="month"
                      defaultValue={targetMonth}
                      className="p-2 sm:p-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 outline-none flex-1 sm:flex-none"
                    >
                      {MONTH_NAMES.map((m, idx) => (
                        <option key={idx + 1} value={idx + 1}>
                          {m}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      name="year"
                      defaultValue={targetYear}
                      className="w-24 sm:w-20 p-2 sm:p-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 outline-none flex-1 sm:flex-none"
                    />
                  </div>
                )}

                {period === "yearly" && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-slate-600 font-medium">ระบุปี (ค.ศ.):</span>
                    <input
                      type="number"
                      name="year"
                      defaultValue={targetYear}
                      className="w-24 p-2 sm:p-1.5 border border-slate-200 rounded-lg bg-slate-50 font-medium text-slate-800 outline-none"
                    />
                    <span className="text-slate-400">(พ.ศ. {targetYear + 543})</span>
                  </div>
                )}

                {period === "custom" && (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <span className="text-slate-600 font-medium whitespace-nowrap">จาก:</span>
                      <input
                        type="date"
                        name="startDate"
                        defaultValue={startDateParam}
                        className="p-2 sm:p-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 outline-none w-full sm:w-auto"
                      />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <span className="text-slate-400 whitespace-nowrap sm:inline">ถึง:</span>
                      <input
                        type="date"
                        name="endDate"
                        defaultValue={endDateParam}
                        className="p-2 sm:p-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 outline-none w-full sm:w-auto"
                      />
                    </div>
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-5 py-2.5 bg-[#0c1322] hover:bg-black text-white rounded-xl font-semibold transition shadow-sm text-center"
              >
                กรองข้อมูล
              </button>
            </div>
          </form>
        </div>

        {/* บัตรสรุปตัวเลข 3 ใบ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between sm:block space-y-0 sm:space-y-1">
            <div>
              <span className="text-xs text-slate-500 font-medium">รายรับรวม</span>
              <p className="text-[11px] text-slate-400 hidden sm:block">จากงานสูบที่เสร็จสิ้น</p>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-600">
              ฿{totalRevenue.toLocaleString()}
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between sm:block space-y-0 sm:space-y-1">
            <div>
              <span className="text-xs text-slate-500 font-medium">รายจ่ายรวมทั้งหมด</span>
              <p className="text-[11px] text-slate-400 hidden sm:block">รวมค่าน้ำมัน ซ่อมบำรุง ฯลฯ</p>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-rose-600">
              ฿{totalExpense.toLocaleString()}
            </div>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between sm:block space-y-0 sm:space-y-1">
            <div>
              <span className="text-xs text-slate-500 font-medium">กำไรสุทธิ</span>
              <p className="text-[11px] text-slate-400 hidden sm:block">รายรับหักค่าใช้จ่ายทั้งหมด</p>
            </div>
            <div
              className={`text-xl sm:text-2xl font-bold ${
                netProfit >= 0 ? "text-blue-600" : "text-rose-600"
              }`}
            >
              ฿{netProfit.toLocaleString()}
            </div>
          </div>
        </div>

        {/* กราฟเปรียบเทียบรายรับ - รายจ่าย */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                📈 กราฟเปรียบเทียบรายรับ - รายจ่าย
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ภาพรวมกระแสเงินสดและสัดส่วนรายจ่ายตามช่วงเวลาที่เลือก
              </p>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-4 text-xs font-semibold pt-1 sm:pt-0">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> รายรับ
                </span>
                <span className="flex items-center gap-1.5 text-rose-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block" /> รายจ่าย
                </span>
              </div>
              {breakdownList.length > 10 && (
                <span className="text-[11px] text-slate-400 block sm:hidden">
                  👈 เลื่อนดูกราฟ
                </span>
              )}
            </div>
          </div>

          {breakdownList.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              กรุณาระบุช่วงวันที่เพื่อดูการเปรียบเทียบ
            </div>
          ) : (
            <div className="w-full overflow-x-auto pb-3 pt-6 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-slate-50 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
              {/* กำหนดความสูง h-64 sm:h-72 พร้อม pt-14 ไม่ให้ Tooltip ชนหัวตาราง */}
              <div
                className="flex items-end h-64 sm:h-72 border-b border-slate-200 px-2 sm:px-3 gap-1.5 sm:gap-2 pt-14 pb-1"
                style={{
                  minWidth:
                    breakdownList.length > 10
                      ? `${breakdownList.length * 40}px`
                      : "100%",
                }}
              >
                {breakdownList.map((m, idx) => {
                  const revPercent =
                    maxVal > 0 ? Math.round((m.revenue / maxVal) * 100) : 0;
                  const expPercent =
                    maxVal > 0 ? Math.round((m.expense / maxVal) * 100) : 0;

                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer"
                    >
                      {/* Tooltip Hover แสดงผลเมื่อมีค่า */}
                      {(m.revenue > 0 || m.expense > 0) && (
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[11px] rounded-lg py-1 px-2.5 pointer-events-none opacity-0 group-hover:opacity-100 transition whitespace-nowrap z-30 shadow-xl border border-slate-800 flex flex-col items-center">
                          <div className="font-semibold">{m.label}</div>
                          <div className="text-emerald-400">
                            รับ: ฿{m.revenue.toLocaleString()}
                          </div>
                          <div className="text-rose-400">
                            จ่าย: ฿{m.expense.toLocaleString()}
                          </div>
                          <div className="w-2 h-2 bg-slate-900 rotate-45 -mb-2 mt-0.5" />
                        </div>
                      )}

                      {/* เสากราฟ (Bars) */}
                      <div className="flex items-end gap-1 h-full w-full justify-center">
                        <div
                          style={{
                            height: `${
                              m.revenue > 0 ? Math.max(revPercent, 5) : 0
                            }%`,
                          }}
                          className="w-2.5 sm:w-3.5 bg-emerald-500 hover:bg-emerald-600 rounded-t-sm transition-all"
                        />
                        <div
                          style={{
                            height: `${
                              m.expense > 0 ? Math.max(expPercent, 5) : 0
                            }%`,
                          }}
                          className="w-2.5 sm:w-3.5 bg-rose-500 hover:bg-rose-600 rounded-t-sm transition-all"
                        />
                      </div>

                      {/* ตัวเลขแกนวันที่ */}
                      <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 mt-2 block truncate max-w-[42px] text-center">
                        {m.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ตารางแจกแจงตัวเลข */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-3.5 sm:p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-xs sm:text-sm text-slate-800 flex items-center gap-2">
              📋 ตารางแจกแจงรายละเอียดตัวเลข
            </h3>
            <span className="text-[11px] text-slate-400">
              {breakdownList.length} รายการ
            </span>
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                <tr>
                  <th className="py-2.5 sm:py-3 px-3 sm:px-4 whitespace-nowrap">ช่วงเวลา / วัน</th>
                  <th className="py-2.5 sm:py-3 px-3 sm:px-4 text-right whitespace-nowrap">รายรับ</th>
                  <th className="py-2.5 sm:py-3 px-3 sm:px-4 text-right whitespace-nowrap">รายจ่าย</th>
                  <th className="py-2.5 sm:py-3 px-3 sm:px-4 text-right whitespace-nowrap">กำไรสุทธิ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {breakdownList.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                      ไม่พบข้อมูลในช่วงเวลาที่เลือก
                    </td>
                  </tr>
                ) : (
                  breakdownList.map((m, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition">
                      <td className="py-2 sm:py-3 px-3 sm:px-4 text-slate-800 font-semibold whitespace-nowrap text-xs sm:text-sm">
                        {period === "monthly" ? `วันที่ ${m.label}` : m.label}
                      </td>
                      <td className="py-2 sm:py-3 px-3 sm:px-4 text-right text-emerald-600 text-xs sm:text-sm whitespace-nowrap">
                        {m.revenue > 0 ? `฿${m.revenue.toLocaleString()}` : "-"}
                      </td>
                      <td className="py-2 sm:py-3 px-3 sm:px-4 text-right text-rose-600 text-xs sm:text-sm whitespace-nowrap">
                        {m.expense > 0 ? `฿${m.expense.toLocaleString()}` : "-"}
                      </td>
                      <td
                        className={`py-2 sm:py-3 px-3 sm:px-4 text-right font-bold text-xs sm:text-sm whitespace-nowrap ${
                          m.profit >= 0 ? "text-blue-600" : "text-rose-600"
                        }`}
                      >
                        ฿{m.profit.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {breakdownList.length > 0 && (
                <tfoot className="bg-slate-50 font-bold border-t border-slate-200 sticky bottom-0 z-10 shadow-[0_-1px_2px_rgba(0,0,0,0.03)]">
                  <tr>
                    <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-slate-900 text-xs sm:text-sm">
                      รวมทั้งสิ้น
                    </td>
                    <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-right text-emerald-700 font-bold text-xs sm:text-sm whitespace-nowrap">
                      ฿{totalRevenue.toLocaleString()}
                    </td>
                    <td className="py-2.5 sm:py-3 px-3 sm:px-4 text-right text-rose-700 font-bold text-xs sm:text-sm whitespace-nowrap">
                      ฿{totalExpense.toLocaleString()}
                    </td>
                    <td
                      className={`py-2.5 sm:py-3 px-3 sm:px-4 text-right font-extrabold text-xs sm:text-sm whitespace-nowrap ${
                        netProfit >= 0 ? "text-blue-700" : "text-rose-700"
                      }`}
                    >
                      ฿{netProfit.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}