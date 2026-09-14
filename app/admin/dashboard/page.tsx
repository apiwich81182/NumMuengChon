import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{
    period?: string; // "today" | "this_month" | "this_year" | "all" | "custom"
    startDate?: string;
    endDate?: string;
  }>;
}

const MONTH_NAMES_TH = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

export default async function AdminDashboardPage({ searchParams }: PageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    redirect("/jobs");
  }

  const params = await searchParams;
  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const period = params.period || (!params.startDate && !params.endDate ? "today" : "custom");
  const startDate = params.startDate || "";
  const endDate = params.endDate || "";

  // คำนวณช่วงเวลา Start / End
  let start: Date | null = null;
  let end: Date | null = null;

  if (startDate || endDate) {
    // ถ้ากรอกมาแค่วันเดียว ให้ใช้วันเดียวกันทั้งเริ่มและสิ้นสุด
    const s = startDate || endDate;
    const e = endDate || startDate;
    start = new Date(`${s}T00:00:00`);
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

  // เงื่อนไข Filter สำหรับ Prisma Query
  const jobDateWhere: any = {};
  const expenseDateWhere: any = {};

  if (start || end) {
    const range: any = {};
    if (start) range.gte = start;
    if (end) range.lte = end;

    jobDateWhere.completedAt = range;
    expenseDateWhere.createdAt = range;
  }

  // วันและเดือนสำหรับตาราง Matrix Attendance
  const currentMonthIdx = now.getMonth();
  const currentYear = now.getFullYear();
  const daysInMonth = new Date(currentYear, currentMonthIdx + 1, 0).getDate();
  const attendanceDays = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Query ดึงข้อมูล
  const [vehicles, allExpenses, jobs, drivers, attendances, monthJobs] = await Promise.all([
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
    prisma.user.findMany({
      where: { role: "DRIVER" },
      orderBy: { name: "asc" },
    }),
    (prisma as any).attendance
      ? (prisma as any).attendance
          .findMany({
            where: {
              createdAt: {
                gte: new Date(currentYear, currentMonthIdx, 1, 0, 0, 0),
                lte: new Date(currentYear, currentMonthIdx + 1, 0, 23, 59, 59, 999),
              },
            },
            include: { user: true },
          })
          .catch(() => [])
      : Promise.resolve([]),

    // 🌟 เพิ่ม Query นี้: ดึงเฉพาะงานของเดือนปัจจุบันทั้งเดือน (ไม่ผูกกับตัวกรองช่วงเวลาด้านบน)
    prisma.job.findMany({
      where: {
        completedAt: {
          gte: new Date(currentYear, currentMonthIdx, 1, 0, 0, 0),
          lte: new Date(currentYear, currentMonthIdx + 1, 0, 23, 59, 59, 999),
        },
      },
      select: {
        userId: true,
        driver2Id: true,
        completedAt: true,
        createdAt: true,
      },
    }),
  ]);

  // สรุปยอดรวม
  const totalRevenue = jobs.reduce((sum, j) => sum + Number(j.price || 0), 0);
  const totalVolume = jobs.reduce((sum, j) => sum + (j.volumePumped || 0), 0);
  const totalJobsCount = jobs.length;
  const avgVolumePerJob = totalJobsCount > 0 ? Math.round(totalVolume / totalJobsCount) : 0;

  let cashRevenue = 0;
  let transferRevenue = 0;
  jobs.forEach((j) => {
    if (j.paymentMethod === "CASH") cashRevenue += Number(j.price || 0);
    else transferRevenue += Number(j.price || 0);
  });

  const totalExpense = allExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpense;
  const profitMargin = totalRevenue > 0 ? `${((netProfit / totalRevenue) * 100).toFixed(1)}%` : "-";

  // สรุป 5 หมวดหมู่ค่าใช้จ่าย
  let catFuel = 0;
  let catDisposal = 0;
  let catMaintenance = 0;
  let catSalary = 0;
  let catOther = 0;

  allExpenses.forEach((e) => {
    const amt = Number(e.amount || 0);
    if (e.category === "FUEL") catFuel += amt;
    else if (e.category === "DISPOSAL_FEE") catDisposal += amt;
    else if (e.category === "MAINTENANCE") catMaintenance += amt;
    else if (e.category === "SALARY") catSalary += amt;
    else catOther += amt;
  });

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
      <div className="max-w-6xl mx-auto space-y-6">
        {/* หัวกระดาษ และปุ่มแอ็กชัน */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              📊 แดชบอร์ดสรุปผลประกอบการ
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              ข้อมูลรายรับ-รายจ่าย ประสิทธิภาพงาน และการลงเวลาพนักงาน
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`/api/export/jobs?${exportParams.toString()}`}
              target="_blank"
              className="px-4 py-2 bg-[#027a48] hover:bg-[#02643c] text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              📊 ส่งออก Excel / CSV
            </a>
            <Link
              href="/expenses/new"
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-sm"
            >
              + บันทึกรายจ่าย
            </Link>
            <Link
              href="/jobs/new"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-sm"
            >
              + ส่งงานใหม่
            </Link>
          </div>
        </div>

        {/* แถบตัวกรอง วันนี้ / เดือนนี้ / ปีนี้ / ทั้งหมด */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
          <form method="GET" className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 text-xs">
            {/* ปุ่มช่วงเวลาลัด */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-slate-500 font-bold">ช่วงเวลา:</span>
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                {[
                  { id: "today", label: "วันนี้" },
                  { id: "this_month", label: "เดือนนี้" },
                  { id: "this_year", label: "ปีนี้" },
                  { id: "all", label: "ทั้งหมด" },
                ].map((item) => (
                  <Link
                    key={item.id}
                    href={`/admin/dashboard?period=${item.id}`}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                      period === item.id && !startDate && !endDate
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* ช่องระบุวันที่เอง */}
            <div className="flex items-center gap-2 self-stretch lg:self-auto justify-end flex-wrap">
              <span className="text-slate-400">หรือระบุวันที่:</span>
              <input
                type="date"
                name="startDate"
                defaultValue={startDate}
                className="p-1.5 px-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
              />
              <span className="text-slate-400">ถึง</span>
              <input
                type="date"
                name="endDate"
                defaultValue={endDate}
                className="p-1.5 px-2.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 outline-none focus:border-blue-500 focus:bg-white"
              />
              <button
                type="submit"
                className="px-4 py-1.5 bg-[#0c1322] hover:bg-black text-white font-semibold rounded-lg transition shadow-sm"
              >
                ค้นหา
              </button>
            </div>
          </form>
        </div>

        {/* 1. บัตรสรุปผล 4 ใบ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <span className="text-xs text-slate-500 font-medium">รายรับรวม</span>
            <div className="text-2xl font-bold text-emerald-600">
              ฿{totalRevenue.toLocaleString()}
            </div>
            <div className="flex items-center gap-2 pt-1 text-[11px] font-semibold">
              <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-100">
                💵 เงินสด: ฿{cashRevenue.toLocaleString()}
              </span>
              <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100">
                📱 เงินโอน: ฿{transferRevenue.toLocaleString()}
              </span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <span className="text-xs text-slate-500 font-medium">รายจ่ายรวม</span>
            <div className="text-2xl font-bold text-rose-600">
              ฿{totalExpense.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 pt-1">
              น้ำมัน, จุดทิ้ง, และค่าซ่อมบำรุง
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <span className="text-xs text-slate-500 font-medium">กำไรสุทธิ</span>
            <div
              className={`text-2xl font-bold ${
                netProfit >= 0 ? "text-blue-600" : "text-rose-600"
              }`}
            >
              ฿{netProfit.toLocaleString()}
            </div>
            <div className="text-[11px] text-slate-400 pt-1">
              กำไรขั้นต้น {profitMargin}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
            <span className="text-xs text-slate-500 font-medium">ปริมาณสูบรวม</span>
            <div className="text-2xl font-bold text-slate-800">
              {totalVolume.toLocaleString()} <span className="text-sm font-normal text-slate-500">ลิตร</span>
            </div>
            <div className="text-[11px] text-slate-400 pt-1">
              เฉลี่ย {avgVolumePerJob.toLocaleString()} ลิตร/เที่ยว ({totalJobsCount} งาน)
            </div>
          </div>
        </div>

        {/* 2. ตารางผลประกอบการและแจกแจงรายจ่ายแยกตามคันรถ */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-2">
          <div className="p-4 sm:p-5 border-b border-slate-100">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              🚚 ผลประกอบการและแจกแจงรายจ่ายแยกตามคันรถ
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              แจกแจงค่าน้ำมัน ค่าทิ้งสิ่งปฏิกูล ค่าซ่อมบำรุง และกำไรส่วนต่างเฉพาะคัน
            </p>
          </div>

          <div className="overflow-x-auto">
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

        {/* 3. ตารางประสิทธิภาพพนักงาน & ยอดเงินสดที่ถือ */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-2">
          <div className="p-4 sm:p-5 border-b border-slate-100">
            <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
              👷 ประสิทธิภาพพนักงาน & ยอดเงินสดที่ถือ
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              ตรวจสอบจำนวนเที่ยวงาน และยอดเงินสดที่พนักงานต้องส่งแอดมิน
            </p>
          </div>

          <div className="overflow-x-auto">
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

        {/* 4. ตารางสรุปการเข้างานประจำเดือน Matrix */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-2">
          <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                🗓️ สรุปการเข้างานประจำเดือน ({MONTH_NAMES_TH[currentMonthIdx]} {currentYear + 543})
              </h2>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                <span>สัญลักษณ์:</span>
                <span className="flex items-center gap-1 font-semibold text-emerald-600">▪ มาทำงาน</span>
              </div>
            </div>
            <Link
              href="/admin/attendance"
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
            >
              ⏱️ ดูประวัติลงเวลาละเอียด
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 text-left whitespace-nowrap min-w-[120px]">พนักงาน</th>
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
                    <td className="py-2.5 px-3 text-left font-bold text-slate-800 whitespace-nowrap">
                      {d.name}
                    </td>
                    {attendanceDays.map((dayNum) => {
                      // 1. ตรวจสอบจาก monthJobs แทน jobs เดิม เพื่อให้เห็นประวัติทั้งเดือนเสมอ
                      const hasJobWorked = monthJobs.some((j) => {
                        const jobDate = new Date(j.completedAt || j.createdAt);
                        const isSameDay =
                          jobDate.getDate() === dayNum &&
                          jobDate.getMonth() === currentMonthIdx &&
                          jobDate.getFullYear() === currentYear;

                        const isWorker = j.userId === d.id || j.driver2Id === d.id;
                        return isSameDay && isWorker;
                      });

                      // 2. กำหนดสัญลักษณ์
                      let symbol = "-";
                      if (hasJobWorked) {
                        symbol = "▪"; // มีงานทำในวันนั้น = มาทำงาน
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
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
            💸 สรุปหมวดหมู่ค่าใช้จ่าย
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-1">
              <span className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
                ⛽ ค่าน้ำมัน
              </span>
              <div className="text-lg sm:text-xl font-bold text-slate-900">
                ฿{catFuel.toLocaleString()}
              </div>
            </div>

            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-1">
              <span className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
                🚽 ค่าทิ้งสิ่งปฏิกูล
              </span>
              <div className="text-lg sm:text-xl font-bold text-slate-900">
                ฿{catDisposal.toLocaleString()}
              </div>
            </div>

            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-1">
              <span className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
                🔧 ซ่อมบำรุง
              </span>
              <div className="text-lg sm:text-xl font-bold text-slate-900">
                ฿{catMaintenance.toLocaleString()}
              </div>
            </div>

            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-1">
              <span className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
                💼 ค่าแรง
              </span>
              <div className="text-lg sm:text-xl font-bold text-slate-900">
                ฿{catSalary.toLocaleString()}
              </div>
            </div>

            <div className="bg-slate-50/70 p-4 rounded-xl border border-slate-200/80 space-y-1">
              <span className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
                📦 อื่นๆ
              </span>
              <div className="text-lg sm:text-xl font-bold text-slate-900">
                ฿{catOther.toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}