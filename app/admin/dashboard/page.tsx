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
import DashboardFilterBar from "@/components/dashboard/DashboardFilterBar";
import ExportExcelButton from "@/components/ExportExcelButton";
import { getCalendarMonthData } from "@/lib/calendar-stats";
import {
  TrendingUp,
  Fuel,
  BarChart3,
  Truck,
  ClipboardList,
  CheckCircle2,
  Calendar,
  FileSpreadsheet,
  Plus,
  ArrowRight,
  ShieldCheck,
  DollarSign,
  Clock,
  Layers,
  LayoutDashboard,
  Briefcase,
} from "lucide-react";

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
  const { year: currentYear, month: currentMonthNum, day: currentDayNum } = getThaiDateParts(now);
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
  const [vehicles, allExpenses, jobs, drivers, monthJobs, calendarData, pendingAssignedCount] = await Promise.all([
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
    // ดึงเฉพาะงานของเดือนปัจจุบันทั้งเดือนตามเวลาไทย (Asia/Bangkok)
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
    // ดึงข้อมูลปฏิทินรายได้สุทธิและจำนวนงานรายวัน
    getCalendarMonthData(targetCalYear, targetCalMonth),
    // นับจำนวนงานที่มอบหมายรอเริ่มงาน (ASSIGNED)
    prisma.job.count({
      where: { status: "ASSIGNED" },
    }),
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
    <main className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8 text-slate-800 antialiased">
      <div className="w-full max-w-[1600px] mx-auto space-y-6">
        {/* ========================================================= */}
        {/* 🌟 1. หัวกระดาษ และปุ่มแอ็กชัน (BUTTON HIERARCHY) */}
        {/* ========================================================= */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-2">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
              <LayoutDashboard className="w-7 h-7 text-indigo-400" />
              <span>แดชบอร์ดสรุปผลประกอบการ</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-normal">
              ภาพรวมกระแสเงินสด ประสิทธิภาพรถสูบ และการลงเวลาปฏิบัติงานของพนักงาน
            </p>
          </div>

          {/* Action Buttons: 1 เด่น Primary + ปุ่มรอง Outline/Ghost */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full sm:w-auto">
            {/* 1. ปุ่มหลักเด่นชัดที่สุด (Primary Button) */}
            <Link
              href="/admin/jobs/assign"
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 shadow-sm shadow-blue-500/20 active:scale-[0.98] flex items-center justify-center gap-1.5 shrink-0"
            >
              <Briefcase className="w-4 h-4" />
              <span>จ่ายงาน</span>
            </Link>

            {/* 2. ปุ่มรอง Outline: ส่งออก Excel */}
            <ExportExcelButton
              exportUrl={`/api/export/jobs?${exportParams.toString()}`}
              defaultFilename="jobs-export.csv"
              className="px-3.5 sm:px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold border border-slate-300/90 hover:border-slate-400 transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>ส่งออก Excel</span>
            </ExportExcelButton>

            {/* 3. ปุ่มรอง Outline: + รายจ่าย */}
            <Link
              href="/expenses/new"
              className="px-3.5 sm:px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-semibold border border-slate-300/90 hover:border-slate-400 transition-all shadow-2xs flex items-center justify-center gap-1.5 shrink-0"
            >
              <Fuel className="w-4 h-4 text-white" />
              <span>รายจ่าย</span>
            </Link>

            {/* 4. ปุ่มรอง Outline: + ส่งงาน */}
            <Link
              href="/jobs/new"
              className="px-3.5 sm:px-4 py-2.5 bg-blue-500 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold border border-slate-300/90 hover:border-slate-400 transition-all shadow-2xs flex items-center justify-center gap-1.5 shrink-0"
            >
              <Truck className="w-4 h-4 text-white" />
              <span>ส่งงาน</span>
            </Link>
          </div>
        </div>

        {/* ========================================================= */}
        {/* 🌟 2. สลับมุมมอง: ภาพรวมและหน้างาน VS ปฏิทินรายได้สุทธิ */}
        {/* ========================================================= */}
        <DashboardViewSwitcher
          defaultTab={defaultTab}
          calendarContent={<FinancialCalendar key="calendar-view" initialData={calendarData} />}
          overviewContent={
            <div key="overview-view" className="space-y-6">
              {/* แถบตัวกรองอัตโนมัติ (Instant Filter Bar) */}
              <DashboardFilterBar
                period={period}
                startDate={startDate}
                endDate={endDate}
              />

              {/* ========================================================= */}
              {/* 🌟 3. แถบแจ้งเตือนงานรอดำเนินการ (SOFT-TONE ALERT BANNER) */}
              {/* ========================================================= */}
              {pendingAssignedCount > 0 && (
                <div className="bg-blue-50/80 border border-blue-200/90 rounded-2xl p-4 sm:p-4.5 text-blue-950 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 transition-all">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-xl bg-blue-100/80 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
                      <ClipboardList className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm sm:text-base text-slate-900">
                          มีงานที่จ่ายแล้วรอดำเนินการ {pendingAssignedCount} งาน
                        </span>
                        <span className="flex h-2.5 w-2.5 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-blue-600"></span>
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        งานที่จ่ายให้คนขับแล้วและกำลังรอดำเนินการจบงานในระบบ
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/jobs?tab=assigned"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm rounded-xl transition shadow-xs whitespace-nowrap self-stretch sm:self-auto text-center flex items-center justify-center gap-1.5"
                  >
                    <span>ดูคิวงานรอดำเนินการ</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}

              {/* ========================================================= */}
              {/* 🌟 4. บล็อกสถิติหลัก 4 ช่อง (METRIC / KPI STAT CARDS) */}
              {/* ========================================================= */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Stat 1: รายรับรวม */}
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
                  <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 text-[11px] font-semibold">
                    <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg border border-emerald-200/60 whitespace-nowrap">
                      💵 เงินสด ฿{cashRevenue.toLocaleString()}
                    </span>
                    <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg border border-blue-200/60 whitespace-nowrap">
                      📱 โอน ฿{transferRevenue.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Stat 2: รายจ่ายรวม */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      รายจ่ายรวม
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
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>น้ำมัน, จุดทิ้ง, ซ่อมบำรุง</span>
                    <span className="font-semibold text-slate-700">{allExpenses.length} บิล</span>
                  </div>
                </div>

                {/* Stat 3: กำไรสุทธิ */}
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
                  <div className="pt-2 border-t border-slate-100 text-[11px] flex items-center justify-between">
                    <span className="text-slate-500">อัตรากำไรขั้นต้น:</span>
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border ${
                        netProfit >= 0
                          ? "bg-blue-50 text-blue-700 border-blue-200/60"
                          : "bg-rose-50 text-rose-700 border-rose-200/60"
                      }`}
                    >
                      {profitMargin}
                    </span>
                  </div>
                </div>

                {/* Stat 4: ปริมาณสูบรวม */}
                <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      ปริมาณสูบรวม
                    </span>
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center shrink-0">
                      <Truck className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="my-2.5">
                    <div className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                      {totalVolume.toLocaleString()}{" "}
                      <span className="text-sm font-normal text-slate-500">ลิตร</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>เฉลี่ย {avgVolumePerJob.toLocaleString()} ล./งาน</span>
                    <span className="font-semibold text-slate-700">{totalJobsCount} เที่ยว</span>
                  </div>
                </div>
              </div>

              {/* ========================================================= */}
              {/* 🌟 5. ตารางผลประกอบการแยกตามคันรถ (DATA TABLE UX) */}
              {/* ========================================================= */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-blue-600" />
                      <span>ผลประกอบการและแจกแจงรายจ่ายแยกตามคันรถ</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5 font-normal">
                      แจกแจงค่าน้ำมัน ค่าทิ้งสิ่งปฏิกูล ค่าซ่อมบำรุง และกำไรส่วนต่างเฉพาะคัน
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-400 self-start sm:self-auto">
                    {vehicles.length} คันในระบบ
                  </span>
                </div>

                {/* Mobile Cards */}
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

                          <div className="grid grid-cols-2 gap-1.5 text-[11px] text-slate-600 pt-0.5">
                            <div className="flex items-center justify-between px-2 py-1 bg-white rounded border border-slate-200/60">
                              <span>⛽ น้ำมัน:</span>
                              <span className="font-semibold">{fuel > 0 ? `฿${fuel.toLocaleString()}` : <span className="text-slate-300">-</span>}</span>
                            </div>
                            <div className="flex items-center justify-between px-2 py-1 bg-white rounded border border-slate-200/60">
                              <span>🚽 จุดทิ้ง:</span>
                              <span className="font-semibold">{disposal > 0 ? `฿${disposal.toLocaleString()}` : <span className="text-slate-300">-</span>}</span>
                            </div>
                            <div className="flex items-center justify-between px-2 py-1 bg-white rounded border border-slate-200/60">
                              <span>🔧 ซ่อม:</span>
                              <span className="font-semibold">{maintenance > 0 ? `฿${maintenance.toLocaleString()}` : <span className="text-slate-300">-</span>}</span>
                            </div>
                            <div className="flex items-center justify-between px-2 py-1 bg-white rounded border border-slate-200/60">
                              <span>📦 อื่นๆ:</span>
                              <span className="font-semibold">{other > 0 ? `฿${other.toLocaleString()}` : <span className="text-slate-300">-</span>}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Desktop Table with Strict Right Alignment for Numbers */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50/90 text-slate-500 font-semibold text-xs uppercase tracking-wider border-b border-slate-200/80">
                      <tr>
                        <th className="py-3 px-4 whitespace-nowrap">ทะเบียนรถ</th>
                        <th className="py-3 px-4 text-center whitespace-nowrap">เที่ยวงาน</th>
                        <th className="py-3 px-4 text-right whitespace-nowrap">ปริมาณสูบ</th>
                        <th className="py-3 px-4 text-right whitespace-nowrap">รายรับ</th>
                        <th className="py-3 px-4 text-right text-rose-600 font-semibold whitespace-nowrap">⛽ ค่าน้ำมัน</th>
                        <th className="py-3 px-4 text-right text-purple-600 font-semibold whitespace-nowrap">🚽 ค่าจุดทิ้ง</th>
                        <th className="py-3 px-4 text-right text-amber-600 font-semibold whitespace-nowrap">🔧 ค่าซ่อม</th>
                        <th className="py-3 px-4 text-right text-slate-600 font-semibold whitespace-nowrap">📦 อื่นๆ</th>
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
                            <tr key={v.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                                🚚 {v.plateNumber}
                              </td>
                              <td className="py-3.5 px-4 text-center whitespace-nowrap text-slate-600">
                                {v.jobs.length} เที่ยว
                              </td>
                              <td className="py-3.5 px-4 text-right whitespace-nowrap text-slate-600 font-mono">
                                {vol.toLocaleString()} ลิตร
                              </td>
                              <td className="py-3.5 px-4 text-right font-bold text-emerald-600 whitespace-nowrap font-mono">
                                ฿{rev.toLocaleString()}
                              </td>
                              <td className="py-3.5 px-4 text-right whitespace-nowrap text-slate-700 font-mono">
                                {fuel > 0 ? `฿${fuel.toLocaleString()}` : <span className="text-slate-300 font-sans">-</span>}
                              </td>
                              <td className="py-3.5 px-4 text-right whitespace-nowrap text-slate-700 font-mono">
                                {disposal > 0 ? `฿${disposal.toLocaleString()}` : <span className="text-slate-300 font-sans">-</span>}
                              </td>
                              <td className="py-3.5 px-4 text-right whitespace-nowrap text-slate-700 font-mono">
                                {maintenance > 0 ? `฿${maintenance.toLocaleString()}` : <span className="text-slate-300 font-sans">-</span>}
                              </td>
                              <td className="py-3.5 px-4 text-right whitespace-nowrap text-slate-500 font-mono">
                                {other > 0 ? `฿${other.toLocaleString()}` : <span className="text-slate-300 font-sans">-</span>}
                              </td>
                              <td className="py-3.5 px-4 text-right font-bold text-rose-600 whitespace-nowrap font-mono">
                                ฿{totalCarExpense.toLocaleString()}
                              </td>
                              <td
                                className={`py-3.5 px-4 text-right font-bold whitespace-nowrap font-mono ${
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
                    {vehicles.length > 0 && (
                      <tfoot className="bg-slate-50 font-semibold border-t-2 border-slate-200">
                        <tr>
                          <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                            รวมทั้งสิ้น
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap text-slate-900 font-mono">
                            {totalJobsCount} เที่ยว
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap text-slate-900 font-mono">
                            {totalVolume.toLocaleString()} ลิตร
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-emerald-700 whitespace-nowrap font-mono">
                            ฿{totalRevenue.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap text-slate-900 font-mono">
                            ฿{catFuel.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap text-slate-900 font-mono">
                            ฿{catDisposal.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap text-slate-900 font-mono">
                            ฿{catMaintenance.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 text-right whitespace-nowrap text-slate-900 font-mono">
                            ฿{catOther.toLocaleString()}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-rose-700 whitespace-nowrap font-mono">
                            ฿{totalExpense.toLocaleString()}
                          </td>
                          <td className={`py-3.5 px-4 text-right font-bold whitespace-nowrap font-mono ${
                            netProfit >= 0 ? "text-blue-700" : "text-rose-700"
                          }`}>
                            ฿{netProfit.toLocaleString()}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {/* ========================================================= */}
              {/* 🌟 6. ประสิทธิภาพพนักงาน & ยอดเงินสดที่ถือ (DATA TABLE UX) */}
              {/* ========================================================= */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <span>ประสิทธิภาพพนักงาน & ยอดเงินสดที่ถือ</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5 font-normal">
                      ตรวจสอบจำนวนเที่ยวงาน และยอดเงินสดที่พนักงานต้องส่งคืนแอดมิน ป้องกันเงินตกหล่น
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-slate-400 self-start sm:self-auto">
                    {drivers.length} พนักงานขับรถ
                  </span>
                </div>

                {/* Mobile Cards */}
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
                            <span className="px-2 py-0.5 rounded-lg text-[11px] font-bold text-rose-700 bg-rose-50 border border-rose-200 whitespace-nowrap">
                              💵 ค้างส่ง: ฿{unreconciledCash.toLocaleString()}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-lg text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 whitespace-nowrap">
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

                {/* Desktop Table with Strict Right Alignment for Financial Numbers */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-50/90 text-slate-500 font-semibold text-xs uppercase tracking-wider border-b border-slate-200/80">
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
                          <tr key={driver.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="py-3.5 px-4 font-bold text-slate-900 whitespace-nowrap">
                              👷 {driver.name}
                            </td>
                            <td className="py-3.5 px-4 text-center text-slate-600 whitespace-nowrap font-mono">
                              {primaryJobs} เที่ยว
                            </td>
                            <td className="py-3.5 px-4 text-center text-slate-600 whitespace-nowrap font-mono">
                              {assistantJobs} เที่ยว
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold text-blue-600 whitespace-nowrap font-mono">
                              {totalStaffJobs} งาน
                            </td>
                            <td className="py-3.5 px-4 text-right text-slate-600 whitespace-nowrap font-mono">
                              {volumeSum.toLocaleString()} ลิตร
                            </td>
                            <td className="py-3.5 px-4 text-right whitespace-nowrap font-mono">
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

              {/* ========================================================= */}
              {/* 🌟 7. ตารางสรุปการเข้างานประจำเดือน MATRIX (WITH HOVER TOOLTIPS) */}
              {/* ========================================================= */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-blue-600" />
                      <span>สรุปการเข้างานประจำเดือน ({MONTH_NAMES_TH[currentMonthIdx]} {currentYear + 543})</span>
                    </h2>
                    <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                      <span>สัญลักษณ์:</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                        <span className="w-4 h-4 rounded bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-bold">✓</span> มาทำงาน
                      </span>
                      <span className="text-slate-400">
                        <span className="text-slate-300 font-bold">-</span> ไม่มีงานวิ่ง
                      </span>
                    </div>
                  </div>
                  <Link
                    href="/admin/attendance"
                    className="px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors self-end sm:self-auto shadow-2xs"
                  >
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>ดูประวัติลงเวลาละเอียด</span>
                  </Link>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-center text-xs">
                    <thead className="bg-slate-50/90 text-slate-500 font-semibold border-b border-slate-200/80">
                      <tr>
                        <th className="sticky left-0 bg-slate-50/95 z-20 shadow-[2px_0_5px_rgba(0,0,0,0.03)] py-3 px-3.5 text-left whitespace-nowrap min-w-[130px] text-xs uppercase tracking-wider font-semibold">
                          พนักงาน
                        </th>
                        {attendanceDays.map((d) => (
                          <th
                            key={d}
                            className={`py-3 px-1 min-w-[32px] sm:min-w-[36px] font-semibold ${
                              d === currentDayNum ? "text-blue-600 bg-blue-50/50" : "text-slate-600"
                            }`}
                          >
                            {d}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {drivers.map((d) => (
                        <tr key={d.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="sticky left-0 bg-white z-10 shadow-[2px_0_5px_rgba(0,0,0,0.03)] py-3 px-3.5 text-left font-bold text-slate-900 whitespace-nowrap text-xs">
                            👷 {d.name}
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

                            return (
                              <td key={dayNum} className="py-2 px-1 text-center align-middle">
                                {hasJobWorked ? (
                                  <div className="relative group inline-flex items-center justify-center">
                                    <span className="w-6 h-6 mx-auto rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs">
                                      ✓
                                    </span>
                                    {/* Tooltip on hover */}
                                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] font-medium px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-30 shadow-md">
                                      มาทำงาน ({dayNum} {MONTH_NAMES_TH[currentMonthIdx]})
                                    </span>
                                  </div>
                                ) : (
                                  <span className="inline-flex items-center justify-center w-6 h-6 text-slate-300 font-medium text-xs">
                                    -
                                  </span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* ========================================================= */}
              {/* 🌟 8. สรุปหมวดหมู่ค่าใช้จ่าย 5 หมวด */}
              {/* ========================================================= */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-600" />
                    <span>สรุปหมวดหมู่ค่าใช้จ่าย</span>
                  </h2>
                  <span className="text-xs font-semibold text-slate-500">
                    รวมทั้งสิ้น: <strong className="text-rose-600 font-mono">฿{totalExpense.toLocaleString()}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                  <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1 relative">
                    <div className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center">
                      <Fuel className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
                      ⛽ ค่าน้ำมัน
                    </span>
                    <div className="text-base sm:text-xl font-bold text-slate-900 font-mono">
                      ฿{catFuel.toLocaleString()}
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1 relative">
                    <div className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-purple-50 text-purple-500 flex items-center justify-center">
                      <Truck className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
                      🚽 ค่าทิ้งสิ่งปฏิกูล
                    </span>
                    <div className="text-base sm:text-xl font-bold text-slate-900 font-mono">
                      ฿{catDisposal.toLocaleString()}
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1 relative">
                    <div className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
                      🔧 ซ่อมบำรุง
                    </span>
                    <div className="text-base sm:text-xl font-bold text-slate-900 font-mono">
                      ฿{catMaintenance.toLocaleString()}
                    </div>
                  </div>

                  <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1 relative">
                    <div className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center">
                      <DollarSign className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
                      💼 ค่าแรง
                    </span>
                    <div className="text-base sm:text-xl font-bold text-slate-900 font-mono">
                      ฿{catSalary.toLocaleString()}
                    </div>
                  </div>

                  <div className="col-span-2 sm:col-span-1 bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1 relative">
                    <div className="absolute top-3 right-3 w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center">
                      <Layers className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
                      📦 อื่นๆ
                    </span>
                    <div className="text-base sm:text-xl font-bold text-slate-900 font-mono">
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