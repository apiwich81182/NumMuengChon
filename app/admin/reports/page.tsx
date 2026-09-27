import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/auth";
import Link from "next/link";
import { getDateRange, toDateFilter, toLocalDateKey, getThaiDateParts } from "@/lib/date-range";
import { Prisma } from "@prisma/client";
import { summarizeFinances } from "@/lib/finance";
import { THAI_MONTHS_SHORT } from "@/lib/formatters";
import { getActiveVehicles } from "@/lib/vehicle-service";
import ReportsFilterBar from "@/components/reports/ReportsFilterBar";
import ExportExcelButton from "@/components/ExportExcelButton";
import {
  TrendingUp,
  Fuel,
  BarChart3,
  FileSpreadsheet,
  ArrowLeft,
  Calendar,
  Layers,
} from "lucide-react";

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
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 text-slate-800 antialiased">
      <div className="w-full max-w-[1600px] mx-auto space-y-6">
        {/* ========================================================= */}
        {/* 🌟 1. หัวกระดาษ และปุ่มแอ็กชัน (BUTTON HIERARCHY) */}
        {/* ========================================================= */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <BarChart3 className="w-7 h-7 text-violet-400" />
              <span>รายงานวิเคราะห์ รายรับ - รายจ่าย</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal">
              วิเคราะห์ผลการดำเนินงานและเปรียบเทียบกระแสเงินสดตามช่วงเวลา
            </p>
          </div>

          {/* Action Buttons: 1 เด่น Primary + Outline Secondary */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Primary Button: ส่งออก Excel */}
            <ExportExcelButton
              exportUrl={`/api/export/reports?${exportParams.toString()}`}
              defaultFilename={`income-expense-${targetYear}.csv`}
              className="px-3.5 sm:px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold border border-slate-300/90 hover:border-slate-400 transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>ส่งออก Excel</span>
            </ExportExcelButton>

            {/* Outline Button: กลับแดชบอร์ด */}
            <Link
              href="/admin/dashboard"
              className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold border border-slate-300/90 hover:border-slate-400 transition-all shadow-2xs flex items-center justify-center gap-1.5 shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-slate-500" />
              <span>แดชบอร์ด</span>
            </Link>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 🌟 2. แถบตัวกรองอัตโนมัติ (Instant Filter Bar) */}
        {/* ========================================================= */}
        <ReportsFilterBar
          vehicles={vehicles.map((v) => ({ id: v.id, plateNumber: v.plateNumber }))}
          period={period}
          vehicleId={vehicleId}
          targetYear={targetYear}
          targetMonth={targetMonth}
          startDateParam={startDateParam}
          endDateParam={endDateParam}
          monthNames={MONTH_NAMES}
        />

        {/* ========================================================= */}
        {/* 🌟 3. บล็อกสถิติหลัก 3 ช่อง (KPI STAT CARDS) */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: รายรับรวม */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                รายรับรวม
              </span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="my-2.5">
              <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                ฿{totalRevenue.toLocaleString()}
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 text-xs text-slate-500">
              จากงานสูบที่เสร็จสิ้นในช่วงเวลานี้ ({jobs.length} งาน)
            </div>
          </div>

          {/* Card 2: รายจ่ายรวมทั้งหมด */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                รายจ่ายรวมทั้งหมด
              </span>
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
                <Fuel className="w-4 h-4" />
              </div>
            </div>
            <div className="my-2.5">
              <div className="text-2xl sm:text-3xl font-bold text-rose-600 tracking-tight">
                ฿{totalExpense.toLocaleString()}
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 text-xs text-slate-500">
              รวมค่าน้ำมัน จุดทิ้ง ซ่อมบำรุง ({expenses.length} รายการ)
            </div>
          </div>

          {/* Card 3: กำไรสุทธิ */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between gap-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                กำไรสุทธิ
              </span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
                <BarChart3 className="w-4 h-4" />
              </div>
            </div>
            <div className="my-2.5">
              <div
                className={`text-2xl sm:text-3xl font-bold tracking-tight ${
                  netProfit >= 0 ? "text-blue-600" : "text-rose-600"
                }`}
              >
                ฿{netProfit.toLocaleString()}
              </div>
            </div>
            <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
              <span>รายรับหักค่าใช้จ่าย:</span>
              <span
                className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border ${
                  netProfit >= 0
                    ? "bg-blue-50 text-blue-700 border-blue-200/60"
                    : "bg-rose-50 text-rose-700 border-rose-200/60"
                }`}
              >
                {totalRevenue > 0 ? `${((netProfit / totalRevenue) * 100).toFixed(1)}%` : "0%"}
              </span>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 🌟 4. กราฟแท่งเปรียบเทียบรายรับ - รายจ่าย (POLISHED BAR CHART) */}
        {/* ========================================================= */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <span>กราฟเปรียบเทียบรายรับ - รายจ่าย</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ภาพรวมกระแสเงินสดและสัดส่วนรายจ่ายตามช่วงเวลาที่เลือก
              </p>
            </div>
            <div className="flex items-center justify-between sm:justify-end gap-5 text-xs font-semibold pt-1 sm:pt-0">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <span className="w-3 h-3 rounded-xs bg-[#10b981] inline-block shadow-2xs" />
                  <span>รายรับ</span>
                </span>
                <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                  <span className="w-3 h-3 rounded-xs bg-[#f43f5e] inline-block shadow-2xs" />
                  <span>รายจ่าย</span>
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
              {/* Chart container with horizontal guideline grid */}
              <div
                className="relative flex items-end h-64 sm:h-76 border-b border-slate-200 px-2 sm:px-4 gap-2 sm:gap-3 pt-16 pb-1"
                style={{
                  minWidth:
                    breakdownList.length > 10
                      ? `${breakdownList.length * 48}px`
                      : "100%",
                }}
              >
                {/* Horizontal Background Guidelines (dashed) */}
                <div className="absolute inset-x-0 top-16 border-b border-dashed border-slate-200/80 pointer-events-none" />
                <div className="absolute inset-x-0 top-1/2 border-b border-dashed border-slate-200/80 pointer-events-none" />
                <div className="absolute inset-x-0 bottom-1/4 border-b border-dashed border-slate-200/80 pointer-events-none" />

                {breakdownList.map((m, idx) => {
                  const revPercent =
                    maxVal > 0 ? Math.round((m.revenue / maxVal) * 100) : 0;
                  const expPercent =
                    maxVal > 0 ? Math.round((m.expense / maxVal) * 100) : 0;

                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col items-center h-full justify-end group relative cursor-pointer z-10"
                    >
                      {/* Tooltip Hover แสดงผลเมื่อมีค่า */}
                      {(m.revenue > 0 || m.expense > 0) && (
                        <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[11px] rounded-xl py-1.5 px-3 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-30 shadow-xl border border-slate-800 flex flex-col items-center">
                          <div className="font-bold text-slate-200">{m.label}</div>
                          <div className="text-emerald-400 font-semibold font-mono">
                            รับ: ฿{m.revenue.toLocaleString()}
                          </div>
                          <div className="text-rose-400 font-semibold font-mono">
                            จ่าย: ฿{m.expense.toLocaleString()}
                          </div>
                          <div className="w-2 h-2 bg-slate-900 rotate-45 -mb-2 mt-0.5" />
                        </div>
                      )}

                      {/* เสากราฟ (Bars - WIDER & ROUNDED-T-LG) */}
                      <div className="flex items-end gap-1 sm:gap-1.5 h-full w-full justify-center">
                        {/* Bar รายรับ: Emerald Green #10B981 */}
                        <div
                          style={{
                            height: `${
                              m.revenue > 0 ? Math.max(revPercent, 5) : 0
                            }%`,
                          }}
                          className="w-5 sm:w-7 md:w-8 bg-[#10b981] hover:bg-[#059669] rounded-t-lg transition-all shadow-xs shadow-emerald-500/20"
                        />
                        {/* Bar รายจ่าย: Soft Rose #F43F5E */}
                        <div
                          style={{
                            height: `${
                              m.expense > 0 ? Math.max(expPercent, 5) : 0
                            }%`,
                          }}
                          className="w-5 sm:w-7 md:w-8 bg-[#f43f5e] hover:bg-[#e11d48] rounded-t-lg transition-all shadow-xs shadow-rose-500/20"
                        />
                      </div>

                      {/* ตัวเลขแกนวันที่ */}
                      <span className="text-[10px] sm:text-xs font-semibold text-slate-500 mt-2 block truncate max-w-[50px] text-center">
                        {m.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ========================================================= */}
        {/* 🌟 5. ตารางแจกแจงตัวเลข (DATA TABLE UX) */}
        {/* ========================================================= */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-xs sm:text-sm text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>ตารางแจกแจงรายละเอียดตัวเลข</span>
            </h3>
            <span className="text-xs font-semibold text-slate-400">
              {breakdownList.length} รายการ
            </span>
          </div>

          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50/90 text-slate-500 font-semibold text-xs uppercase tracking-wider border-b border-slate-200/80 sticky top-0 z-10 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                <tr>
                  <th className="py-3 px-4 whitespace-nowrap">ช่วงเวลา / วัน</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">รายรับ</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">รายจ่าย</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">กำไรสุทธิ</th>
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
                  breakdownList.map((m, idx) => {
                    const isEmpty = m.revenue === 0 && m.expense === 0;
                    return (
                    <tr key={idx} className={`transition-colors ${isEmpty ? "text-slate-300" : "hover:bg-slate-50/80"}`}>
                      <td className={`py-3 px-4 whitespace-nowrap text-xs sm:text-sm ${isEmpty ? "font-normal text-slate-400" : "text-slate-900 font-semibold"}`}>
                        {period === "monthly" ? `วันที่ ${m.label}` : m.label}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs sm:text-sm whitespace-nowrap">
                        {m.revenue > 0 ? <span className="text-emerald-600">{`฿${m.revenue.toLocaleString()}`}</span> : <span className="text-slate-300 font-sans">-</span>}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-xs sm:text-sm whitespace-nowrap">
                        {m.expense > 0 ? <span className="text-rose-600">{`฿${m.expense.toLocaleString()}`}</span> : <span className="text-slate-300 font-sans">-</span>}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-mono text-xs sm:text-sm whitespace-nowrap ${
                          isEmpty ? "text-slate-300 font-normal" :
                          m.profit >= 0 ? "text-blue-600 font-semibold" : "text-rose-600 font-semibold"
                        }`}
                      >
                        {isEmpty ? "-" : `฿${m.profit.toLocaleString()}`}
                      </td>
                    </tr>
                    );
                  })
                )}
              </tbody>
              {breakdownList.length > 0 && (
                <tfoot className="bg-slate-50 font-bold border-t border-slate-200 sticky bottom-0 z-10 shadow-[0_-1px_2px_rgba(0,0,0,0.03)]">
                  <tr>
                    <td className="py-3 px-4 text-slate-900 text-xs sm:text-sm">
                      รวมทั้งสิ้น
                    </td>
                    <td className="py-3 px-4 text-right text-emerald-700 font-mono font-bold text-xs sm:text-sm whitespace-nowrap">
                      ฿{totalRevenue.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-rose-700 font-mono font-bold text-xs sm:text-sm whitespace-nowrap">
                      ฿{totalExpense.toLocaleString()}
                    </td>
                    <td
                      className={`py-3 px-4 text-right font-mono font-extrabold text-xs sm:text-sm whitespace-nowrap ${
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