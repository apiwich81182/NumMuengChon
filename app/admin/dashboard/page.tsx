import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/auth";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import {
  summarizeFinances,
  summarizePaymentMethods,
  summarizeExpensesByCategory,
  calculateProfitMargin,
} from "@/lib/finance";
import { getDateRange, toDateFilter, getThaiDateParts } from "@/lib/date-range";
import { THAI_MONTHS_FULL } from "@/lib/formatters";
import { getActiveDrivers } from "@/lib/user-service";
import FinancialCalendar from "@/components/dashboard/FinancialCalendar";
import DashboardViewSwitcher from "@/components/dashboard/DashboardViewSwitcher";
import { getCalendarMonthData } from "@/lib/calendar-stats";

export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{
    tab?: string; // "overview" | "calendar"
    period?: string; // "today" | "this_month" | "this_year" | "all" | "custom"
    startDate?: string;
    endDate?: string;
    calYear?: string;
    calMonth?: string;
  }>;
}

const MONTH_NAMES_TH = THAI_MONTHS_FULL;

export default async function AdminDashboardPage({ searchParams }: PageProps) {
  await requireAdminPage("/jobs");

  const params = await searchParams;
  const defaultTab = params.tab === "calendar" ? "calendar" : "overview";
  const now = new Date();
  const period = params.period || (!params.startDate && !params.endDate ? "today" : "custom");
  const startDate = params.startDate || "";
  const endDate = params.endDate || "";

  // คำนวณช่วงเวลา Start / End ผ่าน Date Range กลาง (คำนวณตามเวลาไทย Asia/Bangkok เสมอ)
  const { start, end } = getDateRange({
    period,
    startDate,
    endDate,
    now,
  });

  // เงื่อนไข Filter สำหรับ Prisma Query
  const dateFilter = toDateFilter({ start, end });
  const jobDateWhere: Prisma.JobWhereInput = {
    status: "COMPLETED",
  };
  const expenseDateWhere: Prisma.ExpenseWhereInput = {};

  if (dateFilter) {
    jobDateWhere.completedAt = dateFilter;
    expenseDateWhere.createdAt = dateFilter;
  }

  // วันและเดือนสำหรับตาราง Matrix Attendance (คำนวณตามเวลาไทย Asia/Bangkok)
  const { year: currentYear, month: currentMonthNum } = getThaiDateParts(now);
  const currentMonthIdx = currentMonthNum - 1;
  const daysInMonth = new Date(currentYear, currentMonthNum, 0).getDate();
  const attendanceDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // คำนวณช่วงของเดือนปัจจุบันตามเวลาไทยสำหรับดึง monthJobs
  const { start: monthStart, end: monthEnd } = getDateRange({
    period: "this_month",
    now,
  });

  let targetCalYear = Number(params.calYear);
  let targetCalMonth = Number(params.calMonth);

  if (!targetCalYear || !targetCalMonth) {
    const latestJob = await prisma.job.findFirst({
      orderBy: { completedAt: "desc" },
      select: { completedAt: true, createdAt: true },
    });
    if (latestJob) {
      const latestParts = getThaiDateParts(latestJob.completedAt || latestJob.createdAt);
      targetCalYear = latestParts.year;
      targetCalMonth = latestParts.month;
    } else {
      targetCalYear = currentYear;
      targetCalMonth = currentMonthNum;
    }
  }

  // Query ดึงข้อมูล
  const [vehicles, allExpenses, jobs, drivers, monthJobs, calendarData] = await Promise.all([
    prisma.vehicle.findMany({
      where: { isActive: true },
      include: {
        jobs: {
          where: jobDateWhere,
        },
        expenses: {
          where: expenseDateWhere,
        },
      },
      orderBy: { plateNumber: "asc" },
    }),
    prisma.expense.findMany({
      where: expenseDateWhere,
    }),
    prisma.job.findMany({
      where: jobDateWhere,
      include: {
        user: true,
        driver2: true,
      },
    }),
    getActiveDrivers(),
    // 🌟 ดึงเฉพาะงานของเดือนปัจจุบันทั้งเดือนตามเวลาไทย (Asia/Bangkok)
    prisma.job.findMany({
      where: {
        completedAt: {
          ...(monthStart ? { gte: monthStart } : {}),
          ...(monthEnd ? { lte: monthEnd } : {}),
        },
      },
      select: {
        userId: true,
        driver2Id: true,
        completedAt: true,
        createdAt: true,
      },
    }),
    // 🌟 ดึงข้อมูลปฏิทินรายได้สุทธิและจำนวนงานรายวัน
    getCalendarMonthData(targetCalYear, targetCalMonth),
  ]);

  // สรุปยอดรวม
  const { totalRevenue, totalExpense, netProfit } = summarizeFinances(jobs, allExpenses);
  const totalVolume = jobs.reduce((sum, j) => sum + (j.volumePumped || 0), 0);
  const totalJobsCount = jobs.length;
  const avgVolumePerJob = totalJobsCount > 0 ? Math.round(totalVolume / totalJobsCount) : 0;

  const { cashRevenue, transferRevenue } = summarizePaymentMethods(jobs);
  const profitMargin = calculateProfitMargin(totalRevenue, netProfit);
  const { catFuel, catDisposal, catMaintenance, catSalary, catOther } =
    summarizeExpensesByCategory(allExpenses);

  // Query Params สำหรับส่งออก CSV
  const exportParams = new URLSearchParams();
  if (period && period !== "custom") {
    exportParams.set("period", period);
  } else {
    exportParams.set("period", "custom");
  }
  if (startDate) exportParams.set("startDate", startDate);
  if (endDate) exportParams.set("endDate", endDate);

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-800">
      <div className="max-w-6xl mx-auto space-y-5 sm:space-y-6">
        {/* หัวกระดาษ และปุ่มแอ็กชัน */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              📊 แดชบอร์ดสรุปผลประกอบการ
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              ข้อมูลรายรับ-รายจ่าย ประสิทธิภาพงาน และการลงเวลาพนักงาน
            </p>
          </div>
          <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
            <Link
              href="/admin/jobs/assign"
              className="px-2.5 sm:px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs text-center truncate flex items-center justify-center gap-1"
            >
              <span>📋</span>
              <span>+ จ่ายงาน</span>
            </Link>
            <a
              href={`/api/export/jobs?${exportParams.toString()}`}
              target="_blank"
              className="px-2.5 sm:px-4 py-2 bg-[#027a48] hover:bg-[#02643c] text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1 transition shadow-xs cursor-pointer text-center"
            >
              <span>📊</span>
              <span className="truncate">ส่งออก Excel</span>
            </a>
            <Link
              href="/expenses/new"
              className="px-2.5 sm:px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs text-center truncate"
            >
              + รายจ่าย
            </Link>
            <Link
              href="/jobs/new"
              className="px-2.5 sm:px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-xs text-center truncate"
            >
              + ส่งงาน
            </Link>
          </div>
        </div>

        {/* 🌟 สลับมุมมอง: ภาพรวมและหน้างาน VS ปฏิทินรายได้สุทธิ */}
        <DashboardViewSwitcher
          defaultTab={defaultTab}
          calendarContent={<FinancialCalendar key="calendar-view" initialData={calendarData} />}
          overviewContent={
            <div key="overview-view" className="space-y-5 sm:space-y-6">
              {/* แถบตัวกรอง วันนี้ / เดือนนี้ / ปีนี้ / ทั้งหมด */}
              <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <form method="GET" className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 text-xs">
            {/* ปุ่มช่วงเวลาลัด */}
            <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 no-scrollbar">
              <span className="text-slate-500 font-bold whitespace-nowrap">ช่วงเวลา:</span>
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                {[
                  { id: "today", label: "วันนี้" },
                  { id: "this_month", label: "เดือนนี้" },
                  { id: "this_year", label: "ปีนี้" },
                  { id: "all", label: "ทั้งหมด" },
                ].map((item) => (
                  <Link
                    key={item.id}
                    href={`/admin/dashboard?period=${item.id}`}
                    className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
                      period === item.id && !startDate && !endDate
                        ? "bg-blue-600 text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* ช่องระบุวันที่เอง */}
            <div className="flex items-center gap-2 w-full lg:w-auto justify-end flex-wrap pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
              <span className="text-slate-400 text-xs">หรือระบุวันที่:</span>
              <input
                type="date"
                name="startDate"
                defaultValue={startDate}
                className="p-1.5 px-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 outline-none focus:border-blue-500 focus:bg-white text-xs"
              />
              <span className="text-slate-400">ถึง</span>
              <input
                type="date"
                name="endDate"
                defaultValue={endDate}
                className="p-1.5 px-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 outline-none focus:border-blue-500 focus:bg-white text-xs"
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#0c1322] hover:bg-black text-white font-semibold rounded-lg transition shadow-xs cursor-pointer text-xs"
              >
                ค้นหา
              </button>
            </div>
          </form>
        </div>

        {/* 1. บัตรสรุปผล 4 ใบ (บนมือถือแสดง 2 คอลัมน์กะทัดรัด) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1 sm:space-y-2">
            <span className="text-[11px] sm:text-xs text-slate-500 font-medium">รายรับรวม</span>
            <div className="text-lg sm:text-2xl font-bold text-emerald-600 truncate">
              ฿{totalRevenue.toLocaleString()}
            </div>
            <div className="flex flex-wrap items-center gap-1 pt-0.5 text-[10px] sm:text-[11px] font-semibold">
              <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded border border-emerald-100 whitespace-nowrap">
                💵 เงินสด: ฿{cashRevenue.toLocaleString()}
              </span>
              <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded border border-blue-100 whitespace-nowrap">
                📱 โอน: ฿{transferRevenue.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1 sm:space-y-2">
            <span className="text-[11px] sm:text-xs text-slate-500 font-medium">รายจ่ายรวม</span>
            <div className="text-lg sm:text-2xl font-bold text-rose-600 truncate">
              ฿{totalExpense.toLocaleString()}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 pt-0.5 truncate">
              น้ำมัน, จุดทิ้ง, ซ่อมบำรุง
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1 sm:space-y-2">
            <span className="text-[11px] sm:text-xs text-slate-500 font-medium">กำไรสุทธิ</span>
            <div
              className={`text-lg sm:text-2xl font-bold truncate ${
                netProfit >= 0 ? "text-blue-600" : "text-rose-600"
              }`}
            >
              ฿{netProfit.toLocaleString()}
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 pt-0.5 truncate">
              กำไรขั้นต้น {profitMargin}
            </div>
          </div>

          <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1 sm:space-y-2">
            <span className="text-[11px] sm:text-xs text-slate-500 font-medium">ปริมาณสูบรวม</span>
            <div className="text-lg sm:text-2xl font-bold text-slate-800 truncate">
              {totalVolume.toLocaleString()}{" "}
              <span className="text-xs font-normal text-slate-500">ลิตร</span>
            </div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 pt-0.5 truncate">
              เฉลี่ย {avgVolumePerJob.toLocaleString()} ล./งาน ({totalJobsCount} งาน)
            </div>
          </div>
        </div>

        {/* 2. ตารางผลประกอบการและแจกแจงรายจ่ายแยกตามคันรถ */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-2">
          <div className="p-4 sm:p-5 border-b border-slate-100">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              🚚 ผลประกอบการและแจกแจงรายจ่ายแยกตามคันรถ
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              แจกแจงค่าน้ำมัน ค่าทิ้งสิ่งปฏิกูล ค่าซ่อมบำรุง และกำไรส่วนต่างเฉพาะคัน
            </p>
          </div>

          {/* 2.1 มุมมองการ์ดบนมือถือ (Mobile Cards) */}
          <div className="md:hidden p-3.5 space-y-3">
            {vehicles.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
                ไม่พบข้อมูลรถในระบบ
              </div>
            ) : (
              vehicles.map((v) => {
                const rev = v.jobs.reduce((sum, j) => sum + Number(j.price || 0), 0);
                const vol = v.jobs.reduce((sum, j) => sum + (j.volumePumped || 0), 0);

                let fuel = 0;
                let disposal = 0;
                let maintenance = 0;
                let other = 0;

                v.expenses.forEach((e) => {
                  const amt = Number(e.amount || 0);
                  if (e.category === "FUEL") fuel += amt;
                  else if (e.category === "DISPOSAL_FEE") disposal += amt;
                  else if (e.category === "MAINTENANCE") maintenance += amt;
                  else other += amt;
                });

                const totalCarExpense = fuel + disposal + maintenance + other;
                const profit = rev - totalCarExpense;

                return (
                  <div
                    key={v.id}
                    className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-bold text-sm text-slate-900">
                          🚚 {v.plateNumber}
                        </span>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {v.jobs.length} เที่ยว • {vol.toLocaleString()} ลิตร
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">กำไรส่วนต่าง</span>
                        <span
                          className={`font-bold font-mono text-sm ${
                            profit >= 0 ? "text-blue-600" : "text-rose-600"
                          }`}
                        >
                          ฿{profit.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* รายรับ & รวมจ่าย */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/60 font-medium">
                      <div className="flex items-center justify-between bg-emerald-50/70 text-emerald-800 p-2 rounded-lg border border-emerald-100">
                        <span>รายรับ:</span>
                        <span className="font-bold font-mono">฿{rev.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between bg-rose-50/70 text-rose-800 p-2 rounded-lg border border-rose-100">
                        <span>รวมจ่าย:</span>
                        <span className="font-bold font-mono">฿{totalCarExpense.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* แจกแจงรายจ่ายแต่ละประเภท */}
                    <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-600 pt-0.5">
                      <div className="flex items-center justify-between px-2 py-1 bg-white rounded border border-slate-200/60">
                        <span>⛽ น้ำมัน:</span>
                        <span className="font-semibold">{fuel > 0 ? `฿${fuel.toLocaleString()}` : "-"}</span>
                      </div>
                      <div className="flex items-center justify-between px-2 py-1 bg-white rounded border border-slate-200/60">
                        <span>🚽 จุดทิ้ง:</span>
                        <span className="font-semibold">{disposal > 0 ? `฿${disposal.toLocaleString()}` : "-"}</span>
                      </div>
                      <div className="flex items-center justify-between px-2 py-1 bg-white rounded border border-slate-200/60">
                        <span>🔧 ซ่อม:</span>
                        <span className="font-semibold">{maintenance > 0 ? `฿${maintenance.toLocaleString()}` : "-"}</span>
                      </div>
                      <div className="flex items-center justify-between px-2 py-1 bg-white rounded border border-slate-200/60">
                        <span>📦 อื่นๆ:</span>
                        <span className="font-semibold">{other > 0 ? `฿${other.toLocaleString()}` : "-"}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 2.2 ตารางมุมมอง Desktop (Desktop Table) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 whitespace-nowrap">ทะเบียนรถ</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">เที่ยวงาน</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">ปริมาณสูบ</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">รายรับ</th>
                  <th className="py-3 px-4 text-right text-rose-600 font-medium whitespace-nowrap">⛽ ค่าน้ำมัน</th>
                  <th className="py-3 px-4 text-right text-purple-600 font-medium whitespace-nowrap">🚽 ค่าจุดทิ้ง</th>
                  <th className="py-3 px-4 text-right text-amber-600 font-medium whitespace-nowrap">🔧 ค่าซ่อม</th>
                  <th className="py-3 px-4 text-right text-yellow-700 font-medium whitespace-nowrap">📦 อื่นๆ</th>
                  <th className="py-3 px-4 text-right text-rose-600 font-bold whitespace-nowrap">รวมจ่าย</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap font-bold">กำไรส่วนต่าง</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {vehicles.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400 text-xs">
                      ไม่พบข้อมูลรถในระบบ
                    </td>
                  </tr>
                ) : (
                  vehicles.map((v) => {
                    const rev = v.jobs.reduce((sum, j) => sum + Number(j.price || 0), 0);
                    const vol = v.jobs.reduce((sum, j) => sum + (j.volumePumped || 0), 0);

                    let fuel = 0;
                    let disposal = 0;
                    let maintenance = 0;
                    let other = 0;

                    v.expenses.forEach((e) => {
                      const amt = Number(e.amount || 0);
                      if (e.category === "FUEL") fuel += amt;
                      else if (e.category === "DISPOSAL_FEE") disposal += amt;
                      else if (e.category === "MAINTENANCE") maintenance += amt;
                      else other += amt;
                    });

                    const totalCarExpense = fuel + disposal + maintenance + other;
                    const profit = rev - totalCarExpense;

                    return (
                      <tr key={v.id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-800 whitespace-nowrap">
                          {v.plateNumber}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap text-slate-600">
                          {v.jobs.length} เที่ยว
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap text-slate-600">
                          {vol.toLocaleString()} ลิตร
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-emerald-600 whitespace-nowrap">
                          ฿{rev.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap text-slate-700">
                          {fuel > 0 ? `฿${fuel.toLocaleString()}` : "-"}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap text-slate-700">
                          {disposal > 0 ? `฿${disposal.toLocaleString()}` : "-"}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap text-slate-700">
                          {maintenance > 0 ? `฿${maintenance.toLocaleString()}` : "-"}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap text-slate-500">
                          {other > 0 ? `฿${other.toLocaleString()}` : "-"}
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-rose-500 whitespace-nowrap">
                          ฿{totalCarExpense.toLocaleString()}
                        </td>
                        <td
                          className={`py-3.5 px-4 text-right font-bold whitespace-nowrap ${
                            profit >= 0 ? "text-blue-600" : "text-rose-600"
                          }`}
                        >
                          ฿{profit.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. ประสิทธิภาพพนักงาน & ยอดเงินสดที่ถือ */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-2">
          <div className="p-4 sm:p-5 border-b border-slate-100">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              👷 ประสิทธิภาพพนักงาน & ยอดเงินสดที่ถือ
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ตรวจสอบจำนวนเที่ยวงาน และยอดเงินสดที่พนักงานต้องส่งแอดมิน
            </p>
          </div>

          {/* 3.1 มุมมองการ์ดบนมือถือ (Mobile Cards) */}
          <div className="md:hidden p-3.5 space-y-3">
            {drivers.map((driver) => {
              let primaryJobs = 0;
              let assistantJobs = 0;
              let volumeSum = 0;
              let unreconciledCash = 0;

              jobs.forEach((j) => {
                if (j.userId === driver.id) {
                  primaryJobs++;
                  volumeSum += j.volumePumped || 0;
                  if (j.paymentMethod === "CASH" && !j.isReconciled) {
                    unreconciledCash += Number(j.price || 0);
                  }
                } else if (j.driver2Id === driver.id) {
                  assistantJobs++;
                  volumeSum += j.volumePumped || 0;
                }
              });

              const totalStaffJobs = primaryJobs + assistantJobs;

              return (
                <div
                  key={driver.id}
                  className="p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-bold text-sm text-slate-900">
                      👷 {driver.name}
                    </span>
                    {unreconciledCash > 0 ? (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 whitespace-nowrap">
                        💵 ค้างส่ง: ฿{unreconciledCash.toLocaleString()}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 whitespace-nowrap">
                        ✓ ครบแล้ว (฿0)
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1 border-t border-slate-200/60">
                    <div className="p-1.5 bg-white rounded-lg border border-slate-200/60">
                      <span className="text-[10px] text-slate-400 block">ขับหลัก</span>
                      <span className="font-bold text-slate-700">{primaryJobs} เที่ยว</span>
                    </div>
                    <div className="p-1.5 bg-white rounded-lg border border-slate-200/60">
                      <span className="text-[10px] text-slate-400 block">ผู้ช่วย</span>
                      <span className="font-bold text-slate-700">{assistantJobs} เที่ยว</span>
                    </div>
                    <div className="p-1.5 bg-blue-50/60 rounded-lg border border-blue-100">
                      <span className="text-[10px] text-blue-600 block">รวมงาน</span>
                      <span className="font-bold text-blue-700">{totalStaffJobs} งาน</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 text-right">
                    ปริมาณสูบสะสม: <strong className="text-slate-700">{volumeSum.toLocaleString()} ลิตร</strong>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 3.2 ตารางมุมมอง Desktop (Desktop Table) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 whitespace-nowrap">ชื่อพนักงาน</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">คนขับหลัก</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">ผู้ช่วย</th>
                  <th className="py-3 px-4 text-center whitespace-nowrap">รวมงาน</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">ปริมาณสูบรวม</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">💵 เงินสดที่ต้องส่งคืน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {drivers.map((driver) => {
                  let primaryJobs = 0;
                  let assistantJobs = 0;
                  let volumeSum = 0;
                  let unreconciledCash = 0;

                  jobs.forEach((j) => {
                    if (j.userId === driver.id) {
                      primaryJobs++;
                      volumeSum += j.volumePumped || 0;
                      if (j.paymentMethod === "CASH" && !j.isReconciled) {
                        unreconciledCash += Number(j.price || 0);
                      }
                    } else if (j.driver2Id === driver.id) {
                      assistantJobs++;
                      volumeSum += j.volumePumped || 0;
                    }
                  });

                  const totalStaffJobs = primaryJobs + assistantJobs;

                  return (
                    <tr key={driver.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-800 whitespace-nowrap">
                        {driver.name}
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-600 whitespace-nowrap">
                        {primaryJobs} เที่ยว
                      </td>
                      <td className="py-3.5 px-4 text-center text-slate-600 whitespace-nowrap">
                        {assistantJobs} เที่ยว
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-blue-600 whitespace-nowrap">
                        {totalStaffJobs} งาน
                      </td>
                      <td className="py-3.5 px-4 text-right text-slate-600 whitespace-nowrap">
                        {volumeSum.toLocaleString()} ลิตร
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {unreconciledCash > 0 ? (
                          <span className="font-bold text-rose-600">
                            ฿{unreconciledCash.toLocaleString()}
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200">
                            ✓ ครบแล้ว (฿0)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. ตารางสรุปการเข้างานประจำเดือน Matrix (พร้อม Sticky Column สำหรับ Mobile) */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-2">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                🗓️ สรุปการเข้างานประจำเดือน ({MONTH_NAMES_TH[currentMonthIdx]} {currentYear + 543})
              </h2>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                <span>สัญลักษณ์:</span>
                <span className="flex items-center gap-1 font-semibold text-emerald-600">▪ มาทำงาน</span>
                <span className="text-[10px] text-slate-400 sm:hidden">
                  (← เลื่อนซ้ายขวาเพื่อดูวันที่ →)
                </span>
              </div>
            </div>
            <Link
              href="/admin/attendance"
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition self-end sm:self-auto"
            >
              ⏱️ ดูประวัติลงเวลาละเอียด
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="sticky left-0 bg-slate-50 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.04)] py-2.5 px-3 text-left whitespace-nowrap min-w-[110px]">
                    พนักงาน
                  </th>
                  {attendanceDays.map((d) => (
                    <th key={d} className="py-2.5 px-1 min-w-[28px] font-semibold text-slate-600">
                      {d}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {drivers.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50 transition">
                    <td className="sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.04)] py-2.5 px-3 text-left font-bold text-slate-800 whitespace-nowrap">
                      {d.name}
                    </td>
                    {attendanceDays.map((dayNum) => {
                      const hasJobWorked = monthJobs.some((j) => {
                        const jobDate = j.completedAt || j.createdAt;
                        const { year: jYear, month: jMonth, day: jDay } = getThaiDateParts(jobDate);
                        const isSameDay =
                          jDay === dayNum &&
                          jMonth === currentMonthNum &&
                          jYear === currentYear;

                        const isWorker = j.userId === d.id || j.driver2Id === d.id;
                        return isSameDay && isWorker;
                      });

                      let symbol = "-";
                      if (hasJobWorked) {
                        symbol = "▪";
                      }

                      return (
                        <td key={dayNum} className="py-2.5 px-1 text-slate-400 font-medium">
                          <span
                            className={
                              symbol === "▪"
                                ? "text-emerald-600 font-bold text-sm"
                                : "text-slate-300"
                            }
                          >
                            {symbol}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 5. การ์ดสรุปหมวดหมู่ค่าใช้จ่าย 5 หมวดด้านล่างสุด */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-5 space-y-3 sm:space-y-4">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            💸 สรุปหมวดหมู่ค่าใช้จ่าย
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="bg-slate-50/70 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 space-y-1">
              <span className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
                ⛽ ค่าน้ำมัน
              </span>
              <div className="text-base sm:text-xl font-bold text-slate-900 truncate">
                ฿{catFuel.toLocaleString()}
              </div>
            </div>

            <div className="bg-slate-50/70 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 space-y-1">
              <span className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
                🚽 ค่าทิ้งสิ่งปฏิกูล
              </span>
              <div className="text-base sm:text-xl font-bold text-slate-900 truncate">
                ฿{catDisposal.toLocaleString()}
              </div>
            </div>

            <div className="bg-slate-50/70 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 space-y-1">
              <span className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
                🔧 ซ่อมบำรุง
              </span>
              <div className="text-base sm:text-xl font-bold text-slate-900 truncate">
                ฿{catMaintenance.toLocaleString()}
              </div>
            </div>

            <div className="bg-slate-50/70 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 space-y-1">
              <span className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
                💼 ค่าแรง
              </span>
              <div className="text-base sm:text-xl font-bold text-slate-900 truncate">
                ฿{catSalary.toLocaleString()}
              </div>
            </div>

            <div className="col-span-2 sm:col-span-1 bg-slate-50/70 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 space-y-1">
              <span className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
                📦 อื่นๆ
              </span>
              <div className="text-base sm:text-xl font-bold text-slate-900 truncate">
                ฿{catOther.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    }
  />
</div>
</main>
  );
}