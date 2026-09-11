import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const revalidate = 0;

interface DashboardProps {
  searchParams: Promise<{
    period?: string; // 'today' | 'this_month' | 'this_year' | 'custom'
    startDate?: string;
    endDate?: string;
  }>;
}

export default async function AdminDashboardPage({ searchParams }: DashboardProps) {
  const params = await searchParams;
  const now = new Date();

  const period = params.period || "this_month";
  let start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
  let end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  if (period === "today") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  } else if (period === "this_year") {
    start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
  } else if (period === "all") {
    start = new Date(2020, 0, 1);
    end = new Date(2035, 11, 31);
  } else if (period === "custom" && params.startDate && params.endDate) {
    start = new Date(`${params.startDate}T00:00:00`);
    end = new Date(`${params.endDate}T23:59:59`);
  }

  // กำหนดช่วงวันสำหรับปฏิทินเข้างาน
  const daysInMonth = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();

  // ดึงข้อมูลตามช่วงเวลา
  const [vehicles, allExpenses, jobs, drivers, attendances] = await Promise.all([
    prisma.vehicle.findMany({
      where: { isActive: true },
      include: {
        jobs: {
          where: { completedAt: { gte: start, lte: end } },
          select: { price: true, volumePumped: true },
        },
        expenses: {
          where: { createdAt: { gte: start, lte: end } },
          select: { amount: true, category: true },
        },
      },
      orderBy: { plateNumber: "asc" },
    }),
    prisma.expense.findMany({
      where: { createdAt: { gte: start, lte: end } },
      select: { amount: true, category: true },
    }),
    prisma.job.findMany({
      where: { completedAt: { gte: start, lte: end } },
      include: { user: true, driver2: true },
      orderBy: { completedAt: "desc" },
    }),
    prisma.user.findMany({
      where: { role: "DRIVER" },
      orderBy: { name: "asc" },
    }),
    prisma.attendance.findMany({
      where: { createdAt: { gte: start, lte: end } },
    }),
  ]);

  // คำนวณรายรับรวม & แยกเงินสด vs โอน
  let totalRevenue = 0;
  let totalCash = 0;
  let totalTransfer = 0;
  let totalVolumePumped = 0;

  jobs.forEach((j) => {
    const val = Number(j.price);
    totalRevenue += val;
    totalVolumePumped += j.volumePumped;
    if (j.paymentMethod === "CASH") totalCash += val;
    else totalTransfer += val;
  });

  const totalExpense = allExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const netProfit = totalRevenue - totalExpense;

  // คำนวณประสิทธิภาพพนักงาน
  const driverStats = drivers.map((d) => {
    const primaryJobs = jobs.filter((j) => j.userId === d.id);
    const secondaryJobs = jobs.filter((j) => j.driver2Id === d.id);
    const totalJobs = primaryJobs.length + secondaryJobs.length;

    // คำนวณเฉพาะเงินสดที่ "ยังไม่ได้ตรวจรับ" (!j.isReconciled)
    const cashCollected = primaryJobs
      .filter((j) => j.paymentMethod === "CASH" && !j.isReconciled)
      .reduce((sum, j) => sum + Number(j.price), 0);

    const totalVolume =
      primaryJobs.reduce((sum, j) => sum + j.volumePumped, 0) +
      secondaryJobs.reduce((sum, j) => sum + j.volumePumped, 0);

    return {
      id: d.id,
      name: d.name,
      phone: d.phone,
      totalJobs,
      asPrimary: primaryJobs.length,
      asSecondary: secondaryJobs.length,
      cashCollected,
      totalVolume,
    };
  });

  // หมวดหมู่ค่าใช้จ่ายภาพรวมทั้งหมด
  const expenseByCategory = {
    FUEL: allExpenses.filter((e) => e.category === "FUEL").reduce((s, e) => s + Number(e.amount), 0),
    DISPOSAL_FEE: allExpenses.filter((e) => e.category === "DISPOSAL_FEE").reduce((s, e) => s + Number(e.amount), 0),
    MAINTENANCE: allExpenses.filter((e) => e.category === "MAINTENANCE").reduce((s, e) => s + Number(e.amount), 0),
    SALARY: allExpenses.filter((e) => e.category === "SALARY").reduce((s, e) => s + Number(e.amount), 0),
    OTHER: allExpenses
      .filter((e) => !["FUEL", "DISPOSAL_FEE", "MAINTENANCE", "SALARY"].includes(e.category))
      .reduce((s, e) => s + Number(e.amount), 0),
  };

  const monthNames = [
    "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
    "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-800 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            📊 แดชบอร์ดสรุปผลประกอบการ
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            ข้อมูลรายรับ-รายจ่าย ประสิทธิภาพงาน และการลงเวลาพนักงาน
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* ปุ่มส่งออกรายงาน CSV */}
          <a
            href={`/api/export/jobs?period=${period}${params.startDate ? `&startDate=${params.startDate}` : ""}${params.endDate ? `&endDate=${params.endDate}` : ""}`}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
            download
          >
            📥 ส่งออก Excel / CSV
          </a>
          <Link
            href="/expenses/new"
            className="px-3.5 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 shadow-sm transition"
          >
            + บันทึกรายจ่าย
          </Link>
          <Link
            href="/jobs/new"
            className="px-3.5 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 shadow-sm transition"
          >
            + ส่งงานใหม่
          </Link>
        </div>
      </div>

      {/* แถบเลือกช่วงเวลา (Date Filter Bar) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <form method="GET" className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-500 mr-1">ช่วงเวลา:</span>
            {[
              { id: "today", label: "วันนี้" },
              { id: "this_month", label: "เดือนนี้" },
              { id: "this_year", label: "ปีนี้" },
              { id: "all", label: "ทั้งหมด" },
            ].map((item) => (
              <Link
                key={item.id}
                href={`/admin/dashboard?period=${item.id}`}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  period === item.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* กำหนดวันเริ่มต้น - สิ้นสุดเอง */}
          <div className="flex items-center gap-2 text-xs">
            <input type="hidden" name="period" value="custom" />
            <span className="text-slate-400">หรือระบุวันที่:</span>
            <input
              type="date"
              name="startDate"
              defaultValue={params.startDate || ""}
              className="p-1.5 border rounded-lg text-slate-700 bg-slate-50 outline-none"
            />
            <span className="text-slate-400">ถึง</span>
            <input
              type="date"
              name="endDate"
              defaultValue={params.endDate || ""}
              className="p-1.5 border rounded-lg text-slate-700 bg-slate-50 outline-none"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium transition"
            >
              ค้นหา
            </button>
          </div>
        </form>
      </div>

      {/* สรุปตัวเลขภาพรวม */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">รายรับรวม</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">฿{totalRevenue.toLocaleString()}</p>
          <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between text-xs font-medium">
            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
              💵 เงินสด: ฿{totalCash.toLocaleString()}
            </span>
            <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              📱 เงินโอน: ฿{totalTransfer.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">รายจ่ายรวม</p>
          <p className="text-2xl font-black text-rose-600 mt-1">฿{totalExpense.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-3 pt-2 border-t border-slate-100">
            น้ำมัน, จุดทิ้ง, และค่าซ่อมบำรุง
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">กำไรสุทธิ</p>
          <p className={`text-2xl font-black mt-1 ${netProfit >= 0 ? "text-blue-600" : "text-red-500"}`}>
            ฿{netProfit.toLocaleString()}
          </p>
          <p className="text-xs text-slate-400 mt-3 pt-2 border-t border-slate-100">
            {totalRevenue > 0 ? `กำไรขั้นต้น ${((netProfit / totalRevenue) * 100).toFixed(1)}%` : "-"}
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">ปริมาณสูบรวม</p>
          <p className="text-2xl font-black text-slate-800 mt-1">
            {totalVolumePumped.toLocaleString()} <span className="text-sm font-normal text-slate-400">ลิตร</span>
          </p>
          <p className="text-xs text-slate-400 mt-3 pt-2 border-t border-slate-100">
            เฉลี่ย {jobs.length > 0 ? (totalVolumePumped / jobs.length).toFixed(0) : 0} ลิตร/เที่ยว ({jobs.length} งาน)
          </p>
        </div>
      </div>

      {/* ผลประกอบการและแจกแจงรายจ่ายแยกตามคันรถ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between sm:items-center gap-2">
          <div>
            <h2 className="font-bold text-lg text-slate-900">🚛 ผลประกอบการและแจกแจงรายจ่ายแยกตามคันรถ</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              แจกแจงค่าน้ำมัน ค่าทิ้งสิ่งปฏิกูล ค่าซ่อมบำรุง และกำไรส่วนต่างเฉพาะคัน
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 whitespace-nowrap">ทะเบียนรถ</th>
                <th className="py-3 px-4 text-center whitespace-nowrap">เที่ยวงาน</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">ปริมาณสูบ</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">รายรับ</th>
                <th className="py-3 px-4 text-right text-amber-700 whitespace-nowrap">⛽ ค่าน้ำมัน</th>
                <th className="py-3 px-4 text-right text-cyan-700 whitespace-nowrap">🚽 ค่าจุดทิ้ง</th>
                <th className="py-3 px-4 text-right text-orange-700 whitespace-nowrap">🔧 ค่าซ่อม</th>
                <th className="py-3 px-4 text-right text-slate-500 whitespace-nowrap">📦 อื่นๆ</th>
                <th className="py-3 px-4 text-right text-rose-600 font-bold whitespace-nowrap">รวมจ่าย</th>
                <th className="py-3 px-4 text-right whitespace-nowrap">กำไรส่วนต่าง</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vehicles.map((v) => {
                const rev = v.jobs.reduce((sum, j) => sum + Number(j.price), 0);
                const vol = v.jobs.reduce((sum, j) => sum + j.volumePumped, 0);

                let fuel = 0;
                let disposal = 0;
                let maintenance = 0;
                let other = 0;

                v.expenses.forEach((e) => {
                  const amt = Number(e.amount);
                  if (e.category === "FUEL") fuel += amt;
                  else if (e.category === "DISPOSAL_FEE") disposal += amt;
                  else if (e.category === "MAINTENANCE") maintenance += amt;
                  else other += amt;
                });

                const totalCarExpense = fuel + disposal + maintenance + other;
                const profit = rev - totalCarExpense;

                return (
                  <tr key={v.id} className="hover:bg-slate-50 transition">
                    {/* 1. ทะเบียนรถ */}
                    <td className="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">
                      {v.plateNumber}
                    </td>

                    {/* 2. เที่ยวงาน */}
                    <td className="py-3 px-4 text-center whitespace-nowrap text-slate-600">
                      {v.jobs.length} เที่ยว
                    </td>

                    {/* 3. ปริมาณสูบ */}
                    <td className="py-3 px-4 text-right whitespace-nowrap text-slate-600">
                      {vol.toLocaleString()} ลิตร
                    </td>

                    {/* 4. รายรับ */}
                    <td className="py-3 px-4 text-right font-semibold text-emerald-600 whitespace-nowrap">
                      ฿{rev.toLocaleString()}
                    </td>

                    {/* 5. ค่าน้ำมัน */}
                    <td className="py-3 px-4 text-right whitespace-nowrap text-slate-700">
                      {fuel > 0 ? `฿${fuel.toLocaleString()}` : "-"}
                    </td>

                    {/* 6. ค่าจุดทิ้ง */}
                    <td className="py-3 px-4 text-right whitespace-nowrap text-slate-700">
                      {disposal > 0 ? `฿${disposal.toLocaleString()}` : "-"}
                    </td>

                    {/* 7. ค่าซ่อม */}
                    <td className="py-3 px-4 text-right whitespace-nowrap text-slate-700">
                      {maintenance > 0 ? `฿${maintenance.toLocaleString()}` : "-"}
                    </td>

                    {/* 8. อื่นๆ */}
                    <td className="py-3 px-4 text-right whitespace-nowrap text-slate-500">
                      {other > 0 ? `฿${other.toLocaleString()}` : "-"}
                    </td>

                    {/* 9. รวมจ่าย */}
                    <td className="py-3 px-4 text-right font-bold text-rose-500 whitespace-nowrap">
                      ฿{totalCarExpense.toLocaleString()}
                    </td>

                    {/* 10. กำไรส่วนต่าง */}
                    <td
                      className={`py-3 px-4 text-right font-bold whitespace-nowrap ${
                        profit >= 0 ? "text-blue-600" : "text-rose-600"
                      }`}
                    >
                      ฿{profit.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* สรุปประสิทธิภาพพนักงาน */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100">
          <h2 className="font-bold text-lg text-slate-900">👷‍♂️ ประสิทธิภาพพนักงาน & ยอดเงินสดที่ถือ</h2>
          <p className="text-xs text-slate-500">ตรวจสอบจำนวนเที่ยวงาน และยอดเงินสดที่พนักงานต้องส่งแอดมิน</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">ชื่อพนักงาน</th>
                <th className="py-3 px-4 text-center">คนขับหลัก</th>
                <th className="py-3 px-4 text-center">ผู้ช่วย</th>
                <th className="py-3 px-4 text-center">รวมงาน</th>
                <th className="py-3 px-4 text-right">ปริมาณสูบรวม</th>
                <th className="py-3 px-4 text-right">💵 เงินสดที่ต้องส่งคืน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {driverStats.map((ds) => (
                <tr key={ds.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-800">{ds.name}</p>
                    <p className="text-[11px] text-slate-400">{ds.phone}</p>
                  </td>
                  <td className="py-3 px-4 text-center">{ds.asPrimary} เที่ยว</td>
                  <td className="py-3 px-4 text-center text-slate-500">{ds.asSecondary} เที่ยว</td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-bold text-xs">
                      {ds.totalJobs} งาน
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right text-slate-600">
                    {ds.totalVolume.toLocaleString()} ลิตร
                  </td>
                  <td className="py-3 px-4 text-right">
                    {ds.cashCollected > 0 ? (
                      <span className="font-black text-amber-600">
                        ฿{ds.cashCollected.toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                        ✓ ครบแล้ว (฿0)
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ปฏิทินรอบเดือนสรุปการเข้างาน */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h2 className="font-bold text-lg text-slate-900">
              📅 สรุปการเข้างานประจำเดือน ({monthNames[start.getMonth()]} {start.getFullYear() + 543})
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              สัญลักษณ์: <span className="text-emerald-600 font-bold">● มาทำงาน</span> |{" "}
              <span className="text-amber-500 font-bold">▲ ลากิจ</span> |{" "}
              <span className="text-rose-500 font-bold">✖ ลาป่วย</span>
            </p>
          </div>
          <Link
            href="/admin/attendance"
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition border border-slate-200"
          >
            ⏱️ ดูประวัติลงเวลาละเอียด
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse border border-slate-200">
            <thead>
              <tr className="bg-slate-50">
                <th className="p-2 border border-slate-200 text-left min-w-[120px]">พนักงาน</th>
                {Array.from({ length: daysInMonth }, (_, i) => (
                  <th key={i + 1} className="p-1 border border-slate-200 text-center w-7">
                    {i + 1}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver) => {
                const driverLogs = attendances.filter((a) => a.userId === driver.id);
                return (
                  <tr key={driver.id} className="hover:bg-slate-50">
                    <td className="p-2 border border-slate-200 font-medium text-slate-800">
                      {driver.name}
                    </td>
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const day = i + 1;
                      const log = driverLogs.find((a) => new Date(a.createdAt).getDate() === day);

                      let icon = <span className="text-slate-200">-</span>;
                      if (log) {
                        if (log.type === "WORK") icon = <span className="text-emerald-600 font-black">●</span>;
                        else if (log.type === "BUSINESS_LEAVE") icon = <span className="text-amber-500 font-black">▲</span>;
                        else if (log.type === "SICK_LEAVE") icon = <span className="text-rose-500 font-black">✖</span>;
                      }

                      return (
                        <td key={day} className="p-1 border border-slate-200 text-center font-bold">
                          {icon}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* สรุปหมวดหมู่ค่าใช้จ่าย */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <h2 className="font-bold text-base text-slate-900 mb-3">💸 สรุปหมวดหมู่ค่าใช้จ่าย</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs text-slate-500">⛽ ค่าน้ำมัน</p>
            <p className="text-lg font-bold text-slate-800 mt-1">฿{expenseByCategory.FUEL.toLocaleString()}</p>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs text-slate-500">🚽 ค่าทิ้งสิ่งปฏิกูล</p>
            <p className="text-lg font-bold text-slate-800 mt-1">฿{expenseByCategory.DISPOSAL_FEE.toLocaleString()}</p>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs text-slate-500">🔧 ซ่อมบำรุง</p>
            <p className="text-lg font-bold text-slate-800 mt-1">฿{expenseByCategory.MAINTENANCE.toLocaleString()}</p>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs text-slate-500">💼 ค่าแรง</p>
            <p className="text-lg font-bold text-slate-800 mt-1">฿{expenseByCategory.SALARY.toLocaleString()}</p>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs text-slate-500">📦 อื่นๆ</p>
            <p className="text-lg font-bold text-slate-800 mt-1">฿{expenseByCategory.OTHER.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}