import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{
    view?: string;
    vehicleId?: string;
    month?: string;
    year?: string;
    startDate?: string;
    endDate?: string;
  }>;
}

interface PeriodSummary {
  key: string;
  label: string;
  revenue: number;
  expense: number;
  profit: number;
}

const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];

export default async function ReportsPage({ searchParams }: PageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    redirect("/jobs");
  }

  const params = await searchParams;
  const viewMode = params.view || "weekly";
  const vehicleId = params.vehicleId || "";

  const now = new Date();
  const currentYear = now.getFullYear();
  const selectedYear = Number(params.year) || currentYear;
  const selectedMonth = Number(params.month) || (now.getMonth() + 1);

  const vehicles = await prisma.vehicle.findMany({
    orderBy: { plateNumber: "asc" },
  });

  const jobWhere: any = {};
  const expenseWhere: any = {};

  if (vehicleId) {
    jobWhere.vehicleId = vehicleId;
    expenseWhere.vehicleId = vehicleId;
  }

  let chartData: PeriodSummary[] = [];
  let startDate: Date;
  let endDate: Date;

  if (viewMode === "monthly") {
    startDate = new Date(currentYear, selectedMonth - 1, 1, 0, 0, 0);
    endDate = new Date(currentYear, selectedMonth, 0, 23, 59, 59);

    jobWhere.createdAt = { gte: startDate, lte: endDate };
    expenseWhere.createdAt = { gte: startDate, lte: endDate };

    const [jobs, expenses] = await Promise.all([
      prisma.job.findMany({ where: jobWhere, select: { price: true, createdAt: true } }),
      prisma.expense.findMany({ where: expenseWhere, select: { amount: true, createdAt: true } }),
    ]);

    const weeks: PeriodSummary[] = [
      { key: "w1", label: "วันที่ 1-7", revenue: 0, expense: 0, profit: 0 },
      { key: "w2", label: "วันที่ 8-14", revenue: 0, expense: 0, profit: 0 },
      { key: "w3", label: "วันที่ 15-21", revenue: 0, expense: 0, profit: 0 },
      { key: "w4", label: `วันที่ 22-${endDate.getDate()}`, revenue: 0, expense: 0, profit: 0 },
    ];

    jobs.forEach((j) => {
      const d = new Date(j.createdAt).getDate();
      const idx = d <= 7 ? 0 : d <= 14 ? 1 : d <= 21 ? 2 : 3;
      weeks[idx].revenue += Number(j.price);
    });

    expenses.forEach((e) => {
      const d = new Date(e.createdAt).getDate();
      const idx = d <= 7 ? 0 : d <= 14 ? 1 : d <= 21 ? 2 : 3;
      weeks[idx].expense += Number(e.amount);
    });

    chartData = weeks.map((w) => ({ ...w, profit: w.revenue - w.expense }));
  } else if (viewMode === "yearly") {
    startDate = new Date(selectedYear, 0, 1, 0, 0, 0);
    endDate = new Date(selectedYear, 11, 31, 23, 59, 59);

    jobWhere.createdAt = { gte: startDate, lte: endDate };
    expenseWhere.createdAt = { gte: startDate, lte: endDate };

    const [jobs, expenses] = await Promise.all([
      prisma.job.findMany({ where: jobWhere, select: { price: true, createdAt: true } }),
      prisma.expense.findMany({ where: expenseWhere, select: { amount: true, createdAt: true } }),
    ]);

    const months: PeriodSummary[] = Array.from({ length: 12 }, (_, i) => ({
      key: `${selectedYear}-${i + 1}`,
      label: THAI_MONTHS_SHORT[i],
      revenue: 0,
      expense: 0,
      profit: 0,
    }));

    jobs.forEach((j) => {
      const m = new Date(j.createdAt).getMonth();
      months[m].revenue += Number(j.price);
    });

    expenses.forEach((e) => {
      const m = new Date(e.createdAt).getMonth();
      months[m].expense += Number(e.amount);
    });

    chartData = months.map((m) => ({ ...m, profit: m.revenue - m.expense }));
  } else if (viewMode === "custom") {
    const startStr = params.startDate || now.toISOString().slice(0, 10);
    const endStr = params.endDate || now.toISOString().slice(0, 10);
    startDate = new Date(`${startStr}T00:00:00`);
    endDate = new Date(`${endStr}T23:59:59`);

    jobWhere.createdAt = { gte: startDate, lte: endDate };
    expenseWhere.createdAt = { gte: startDate, lte: endDate };

    const [jobs, expenses] = await Promise.all([
      prisma.job.findMany({ where: jobWhere, select: { price: true, createdAt: true } }),
      prisma.expense.findMany({ where: expenseWhere, select: { amount: true, createdAt: true } }),
    ]);

    const daysMap: Record<string, PeriodSummary> = {};
    const curr = new Date(startDate);
    while (curr <= endDate) {
      const k = curr.toISOString().split("T")[0];
      daysMap[k] = {
        key: k,
        label: curr.toLocaleDateString("th-TH", { day: "numeric", month: "short" }),
        revenue: 0,
        expense: 0,
        profit: 0,
      };
      curr.setDate(curr.getDate() + 1);
    }

    jobs.forEach((j) => {
      const k = new Date(j.createdAt).toISOString().split("T")[0];
      if (daysMap[k]) daysMap[k].revenue += Number(j.price);
    });

    expenses.forEach((e) => {
      const k = new Date(e.createdAt).toISOString().split("T")[0];
      if (daysMap[k]) daysMap[k].expense += Number(e.amount);
    });

    chartData = Object.values(daysMap).map((d) => ({ ...d, profit: d.revenue - d.expense }));
  } else {
    // โหมดสัปดาห์ (7 วันล่าสุด)
    startDate = new Date(now);
    startDate.setDate(now.getDate() - 6);
    startDate.setHours(0, 0, 0, 0);
    endDate = new Date(now);
    endDate.setHours(23, 59, 59, 999);

    jobWhere.createdAt = { gte: startDate, lte: endDate };
    expenseWhere.createdAt = { gte: startDate, lte: endDate };

    const [jobs, expenses] = await Promise.all([
      prisma.job.findMany({ where: jobWhere, select: { price: true, createdAt: true } }),
      prisma.expense.findMany({ where: expenseWhere, select: { amount: true, createdAt: true } }),
    ]);

    const daysMap: Record<string, PeriodSummary> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const k = d.toISOString().split("T")[0];
      daysMap[k] = {
        key: k,
        label: d.toLocaleDateString("th-TH", { day: "numeric", month: "short" }),
        revenue: 0,
        expense: 0,
        profit: 0,
      };
    }

    jobs.forEach((j) => {
      const k = new Date(j.createdAt).toISOString().split("T")[0];
      if (daysMap[k]) daysMap[k].revenue += Number(j.price);
    });

    expenses.forEach((e) => {
      const k = new Date(e.createdAt).toISOString().split("T")[0];
      if (daysMap[k]) daysMap[k].expense += Number(e.amount);
    });

    chartData = Object.values(daysMap).map((d) => ({ ...d, profit: d.revenue - d.expense }));
  }

  const maxVal = Math.max(...chartData.map((d) => Math.max(d.revenue, d.expense)), 1000);
  const totalRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0);
  const totalExpense = chartData.reduce((sum, d) => sum + d.expense, 0);
  const netProfit = totalRevenue - totalExpense;

  const exportUrl = `/api/reports/export?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}${vehicleId ? `&vehicleId=${vehicleId}` : ""}`;

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-800">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              📊 สรุปรายงานรายรับ - รายจ่าย
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              วิเคราะห์ผลการดำเนินงานและเปรียบเทียบกระแสเงินสด
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={exportUrl}
              download
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition flex items-center gap-1.5 shadow-sm"
            >
              📥 Export เป็นไฟล์ Excel/CSV
            </a>
            <Link
              href="/admin/dashboard"
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold border border-slate-200 transition"
            >
              ← กลับแดชบอร์ด
            </Link>
          </div>
        </div>

        {/* แถบตัวกรอง */}
        <form method="GET" className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold overflow-x-auto">
              <Link
                href={`/admin/reports?view=weekly${vehicleId ? `&vehicleId=${vehicleId}` : ""}`}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                  viewMode === "weekly" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                📅 รายสัปดาห์
              </Link>
              <Link
                href={`/admin/reports?view=monthly${vehicleId ? `&vehicleId=${vehicleId}` : ""}`}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                  viewMode === "monthly" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                🗓️ รายเดือน
              </Link>
              <Link
                href={`/admin/reports?view=yearly${vehicleId ? `&vehicleId=${vehicleId}` : ""}`}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                  viewMode === "yearly" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                📆 รายปี
              </Link>
              <Link
                href={`/admin/reports?view=custom${vehicleId ? `&vehicleId=${vehicleId}` : ""}`}
                className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                  viewMode === "custom" ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-800"
                }`}
              >
                ⚙️ เลือกช่วงเอง
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <select
                name="vehicleId"
                defaultValue={vehicleId}
                className="text-xs p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 outline-none font-medium"
              >
                <option value="">ทุกคันรถ (ภาพรวม)</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    รถ: {v.plateNumber}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <input type="hidden" name="view" value={viewMode} />

            <div className="flex items-center gap-2 flex-wrap text-xs">
              {viewMode === "monthly" && (
                <>
                  <span className="text-slate-500 font-medium">เลือกเดือน (ปี {currentYear + 543}):</span>
                  <select
                    name="month"
                    defaultValue={selectedMonth}
                    className="p-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 outline-none font-medium"
                  >
                    {THAI_MONTHS.map((mName, idx) => (
                      <option key={idx + 1} value={idx + 1}>
                        {mName}
                      </option>
                    ))}
                  </select>
                </>
              )}

              {viewMode === "yearly" && (
                <>
                  <span className="text-slate-500 font-medium">ระบุปี (ค.ศ.):</span>
                  <input
                    type="number"
                    name="year"
                    defaultValue={selectedYear}
                    min="2000"
                    max="2100"
                    className="w-24 p-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 outline-none font-medium"
                  />
                  <span className="text-slate-400 font-normal">(พ.ศ. {selectedYear + 543})</span>
                </>
              )}

              {viewMode === "custom" && (
                <>
                  <span className="text-slate-500 font-medium">ช่วงวันที่:</span>
                  <input
                    type="date"
                    name="startDate"
                    defaultValue={params.startDate || now.toISOString().slice(0, 10)}
                    className="p-1.5 border border-slate-200 rounded-lg text-slate-700 bg-slate-50 outline-none"
                  />
                  <span className="text-slate-400">ถึง</span>
                  <input
                    type="date"
                    name="endDate"
                    defaultValue={params.endDate || now.toISOString().slice(0, 10)}
                    className="p-1.5 border border-slate-200 rounded-lg text-slate-700 bg-slate-50 outline-none"
                  />
                </>
              )}

              {viewMode === "weekly" && (
                <span className="text-slate-500">ย้อนหลัง 7 วัน นับจากปัจจุบัน</span>
              )}
            </div>

            <button
              type="submit"
              className="px-4 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-semibold transition"
            >
              กรองข้อมูล
            </button>
          </div>
        </form>

        {/* การ์ดสถิติ KPI */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500">รายรับรวม</span>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              ฿{totalRevenue.toLocaleString()}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500">รายจ่ายรวมทั้งหมด</span>
            <div className="text-2xl font-bold text-rose-600 mt-1">
              ฿{totalExpense.toLocaleString()}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs font-semibold text-slate-500">กำไรสุทธิ</span>
            <div className={`text-2xl font-bold mt-1 ${netProfit >= 0 ? "text-blue-600" : "text-rose-600"}`}>
              ฿{netProfit.toLocaleString()}
            </div>
          </div>
        </div>

        {/* แผนภูมิกราฟแท่ง */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              แผนภูมิเปรียบเทียบรายรับ - รายจ่าย
            </h2>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
                รายรับ
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-rose-500 inline-block" />
                รายจ่าย (รวมแอดมิน)
              </span>
            </div>
          </div>

          <div className="h-64 flex items-end justify-between gap-1.5 sm:gap-3 pt-8 pb-2 border-b border-slate-200 overflow-x-auto">
            {chartData.map((d) => {
              const revPercent = Math.max(3, Math.round((d.revenue / maxVal) * 100));
              const expPercent = Math.max(3, Math.round((d.expense / maxVal) * 100));

              return (
                <div key={d.key} className="flex-1 min-w-[32px] flex flex-col items-center h-full justify-end group relative">
                  <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition pointer-events-none bg-slate-900 text-white text-[11px] p-2 rounded-lg whitespace-nowrap z-10 shadow-lg">
                    <div>รับ: ฿{d.revenue.toLocaleString()}</div>
                    <div>จ่าย: ฿{d.expense.toLocaleString()}</div>
                  </div>

                  <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1.5 h-full">
                    <div
                      style={{ height: `${d.revenue > 0 ? revPercent : 2}%` }}
                      className="w-full max-w-[16px] bg-emerald-500 rounded-t transition-all hover:bg-emerald-600"
                    />
                    <div
                      style={{ height: `${d.expense > 0 ? expPercent : 2}%` }}
                      className="w-full max-w-[16px] bg-rose-400 rounded-t transition-all hover:bg-rose-500"
                    />
                  </div>

                  <span className="text-[10px] sm:text-xs text-slate-500 mt-2 font-medium truncate text-center">
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* ตารางแสดงตัวเลข */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-800">ตารางแจกแจงรายละเอียดตัวเลข</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">ช่วงเวลา</th>
                  <th className="py-3 px-4 text-right">รายรับ</th>
                  <th className="py-3 px-4 text-right">รายจ่าย</th>
                  <th className="py-3 px-4 text-right">กำไรสุทธิ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {chartData.map((row) => (
                  <tr key={row.key} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-medium">{row.label}</td>
                    <td className="py-3 px-4 text-right text-emerald-600 font-semibold">
                      ฿{row.revenue.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-rose-600 font-semibold">
                      ฿{row.expense.toLocaleString()}
                    </td>
                    <td className={`py-3 px-4 text-right font-bold ${row.profit >= 0 ? "text-blue-600" : "text-rose-600"}`}>
                      ฿{row.profit.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}