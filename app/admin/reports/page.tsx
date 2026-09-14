import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

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

const MONTH_NAMES = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
];

// Helper แปลง Date เป็น YYYY-MM-DD ตาม Local Timezone ป้องกันปัญหา Timezone Shift
function toLocalDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export default async function AdminReportsPage({ searchParams }: PageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    redirect("/admin/dashboard");
  }

  const params = await searchParams;
  const now = new Date();
  const period = params.period || "yearly";
  const vehicleId = params.vehicleId || "";
  const targetYear = Number(params.year) || now.getFullYear();
  const targetMonth = Number(params.month) || (now.getMonth() + 1);
  const startDateParam = params.startDate || "";
  const endDateParam = params.endDate || "";

  let start: Date | null = null;
  let end: Date | null = null;

  // 1. คำนวณช่วงเวลา Start/End
  if (period === "weekly") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (period === "monthly") {
    start = new Date(targetYear, targetMonth - 1, 1, 0, 0, 0);
    end = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);
  } else if (period === "yearly") {
    start = new Date(targetYear, 0, 1, 0, 0, 0);
    end = new Date(targetYear, 11, 31, 23, 59, 59, 999);
  } else if (period === "custom" && (startDateParam || endDateParam)) {
    if (startDateParam) start = new Date(`${startDateParam}T00:00:00`);
    if (endDateParam) end = new Date(`${endDateParam}T23:59:59.999`);
  }

  // 2. เงื่อนไข Query ข้อมูล
  const jobWhere: any = {};
  const expenseWhere: any = {};

  if (vehicleId) {
    jobWhere.vehicleId = vehicleId;
    expenseWhere.vehicleId = vehicleId;
  }

  if (start || end) {
    const range: any = {};
    if (start) range.gte = start;
    if (end) range.lte = end;
    jobWhere.completedAt = range;
    expenseWhere.createdAt = range;
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
    prisma.vehicle.findMany({
      where: { isActive: true },
      orderBy: { plateNumber: "asc" },
    }),
  ]);

  const totalRevenue = jobs.reduce((sum, j) => sum + Number(j.price || 0), 0);
  const totalExpense = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  const netProfit = totalRevenue - totalExpense;

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
      const d = new Date(j.completedAt || j.createdAt);
      if (d.getFullYear() === targetYear) {
        breakdownList[d.getMonth()].revenue += Number(j.price || 0);
      }
    });

    expenses.forEach((e) => {
      const d = new Date(e.createdAt);
      if (d.getFullYear() === targetYear) {
        breakdownList[d.getMonth()].expense += Number(e.amount || 0);
      }
    });
  } else if (period === "weekly" && start) {
    for (let i = 0; i < 7; i++) {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const dayStr = d.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
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
    const daysInMonth = end.getDate();
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
      const d = new Date(j.completedAt || j.createdAt);
      if (d.getFullYear() === targetYear && d.getMonth() + 1 === targetMonth) {
        const day = d.getDate();
        if (breakdownList[day - 1]) {
          breakdownList[day - 1].revenue += Number(j.price || 0);
        }
      }
    });

    expenses.forEach((e) => {
      const d = new Date(e.createdAt);
      if (d.getFullYear() === targetYear && d.getMonth() + 1 === targetMonth) {
        const day = d.getDate();
        if (breakdownList[day - 1]) {
          breakdownList[day - 1].expense += Number(e.amount || 0);
        }
      }
    });
  } else if (period === "custom" && start && end) {
    const curr = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());

    while (curr <= endOnly) {
      const localKey = toLocalDateKey(curr);
      const dayStr = curr.toLocaleDateString("th-TH", { day: "numeric", month: "short" });
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
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              📊 สรุปรายงานรายรับ - รายจ่าย
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              วิเคราะห์ผลการดำเนินงานและเปรียบเทียบกระแสเงินสด
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/api/export/reports?${exportParams.toString()}`}
              target="_blank"
              className="px-4 py-2 bg-[#027a48] hover:bg-[#02643c] text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-1.5 transition shadow-sm cursor-pointer"
            >
              📥 Export เป็นไฟล์ Excel/CSV
            </a>
            <Link
              href="/admin/dashboard"
              className="px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs sm:text-sm font-medium border border-slate-200 transition"
            >
              ← กลับแดชบอร์ด
            </Link>
          </div>
        </div>

        {/* แถบตัวกรอง */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <form method="GET" className="space-y-4">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold overflow-x-auto w-fit">
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
                    className={`px-3 py-1.5 rounded-lg transition whitespace-nowrap ${
                      period === item.id
                        ? "bg-white text-slate-900 shadow-sm font-bold"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>

              <div className="w-full md:w-auto">
                <select
                  name="vehicleId"
                  defaultValue={vehicleId}
                  className="w-full md:w-56 p-2 text-xs border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-800 outline-none"
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

            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
              <div>
                {period === "weekly" && (
                  <span className="text-slate-500 font-medium">ย้อนหลัง 7 วัน นับจากปัจจุบัน</span>
                )}

                {period === "monthly" && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 font-medium">ระบุเดือน/ปี:</span>
                    <select
                      name="month"
                      defaultValue={targetMonth}
                      className="p-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 outline-none"
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
                      className="w-20 p-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 outline-none"
                    />
                  </div>
                )}

                {period === "yearly" && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 font-medium">ระบุปี (ค.ศ.):</span>
                    <input
                      type="number"
                      name="year"
                      defaultValue={targetYear}
                      className="w-24 p-1.5 border border-slate-200 rounded-lg bg-slate-50 font-medium text-slate-800 outline-none"
                    />
                    <span className="text-slate-400">(พ.ศ. {targetYear + 543})</span>
                  </div>
                )}

                {period === "custom" && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-600 font-medium">ช่วงวันที่:</span>
                    <input
                      type="date"
                      name="startDate"
                      defaultValue={startDateParam}
                      className="p-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 outline-none"
                    />
                    <span className="text-slate-400">ถึง</span>
                    <input
                      type="date"
                      name="endDate"
                      defaultValue={endDateParam}
                      className="p-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 outline-none"
                    />
                  </div>
                )}
              </div>

              <button
                type="submit"
                className="px-5 py-2 bg-[#0c1322] hover:bg-black text-white rounded-xl font-semibold transition self-end sm:self-auto shadow-sm"
              >
                กรองข้อมูล
              </button>
            </div>
          </form>
        </div>

        {/* บัตรสรุปตัวเลข 3 ใบ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs text-slate-500 font-medium">รายรับรวม</span>
            <div className="text-2xl font-bold text-emerald-600">
              ฿{totalRevenue.toLocaleString()}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs text-slate-500 font-medium">รายจ่ายรวมทั้งหมด</span>
            <div className="text-2xl font-bold text-rose-600">
              ฿{totalExpense.toLocaleString()}
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs text-slate-500 font-medium">กำไรสุทธิ</span>
            <div
              className={`text-2xl font-bold ${
                netProfit >= 0 ? "text-blue-600" : "text-rose-600"
              }`}
            >
              ฿{netProfit.toLocaleString()}
            </div>
          </div>
        </div>

        {/* กราฟเปรียบเทียบรายรับ - รายจ่าย */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-2">
                📈 กราฟเปรียบเทียบรายรับ - รายจ่าย
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                ภาพรวมกระแสเงินสดและสัดส่วนรายจ่ายตามช่วงเวลาที่เลือก
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold self-end sm:self-auto">
              <span className="flex items-center gap-1.5 text-emerald-600">
                <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> รายรับ
              </span>
              <span className="flex items-center gap-1.5 text-rose-600">
                <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" /> รายจ่าย
              </span>
            </div>
          </div>

          {breakdownList.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              กรุณาระบุช่วงวันที่เพื่อดูการเปรียบเทียบ
            </div>
          ) : (
            <div className="w-full overflow-x-auto pb-4 pt-6 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-slate-50 [&::-webkit-scrollbar-thumb]:bg-slate-200 [&::-webkit-scrollbar-thumb]:rounded-full">
              {/* กำหนดความสูง h-72 พร้อม pt-14 ไม่ให้ Tooltip ชนหัวตาราง */}
              <div
                className="flex items-end h-72 border-b border-slate-200 px-3 gap-2 pt-14 pb-1"
                style={{
                  minWidth:
                    breakdownList.length > 15
                      ? `${breakdownList.length * 36}px`
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
                      className="flex-1 flex flex-col items-center h-full justify-end group relative"
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
                          className="w-2 sm:w-3.5 bg-emerald-500 hover:bg-emerald-600 rounded-t-sm transition-all cursor-pointer"
                        />
                        <div
                          style={{
                            height: `${
                              m.expense > 0 ? Math.max(expPercent, 5) : 0
                            }%`,
                          }}
                          className="w-2 sm:w-3.5 bg-rose-500 hover:bg-rose-600 rounded-t-sm transition-all cursor-pointer"
                        />
                      </div>

                      {/* ตัวเลขแกนวันที่ */}
                      <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 mt-2 block truncate max-w-[40px] text-center">
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
          <div className="p-4 border-b border-slate-100 font-bold text-sm text-slate-800">
            ตารางแจกแจงรายละเอียดตัวเลข
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">ช่วงเวลา / วัน</th>
                  <th className="py-3 px-4 text-right">รายรับ</th>
                  <th className="py-3 px-4 text-right">รายจ่าย</th>
                  <th className="py-3 px-4 text-right">กำไรสุทธิ</th>
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
                    <tr key={idx} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 text-slate-800 font-semibold">
                        {period === "monthly" ? `วันที่ ${m.label}` : m.label}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-600">
                        {m.revenue > 0 ? `฿${m.revenue.toLocaleString()}` : "-"}
                      </td>
                      <td className="py-3 px-4 text-right text-rose-600">
                        {m.expense > 0 ? `฿${m.expense.toLocaleString()}` : "-"}
                      </td>
                      <td
                        className={`py-3 px-4 text-right font-bold ${
                          m.profit >= 0 ? "text-blue-600" : "text-rose-600"
                        }`}
                      >
                        ฿{m.profit.toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}