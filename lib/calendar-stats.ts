import { prisma } from "@/lib/prisma";
import { getDateRange, toDateFilter, getThaiDateParts } from "@/lib/date-range";
import { THAI_MONTHS_FULL } from "@/lib/formatters";

export interface CalendarJobItem {
  id: string;
  customerName: string;
  price: number;
  volumePumped: number;
  paymentMethod: string;
  completedAt: string;
}

export interface CalendarExpenseItem {
  id: string;
  category: string;
  amount: number;
  note: string | null;
  createdAt: string;
}

export interface CalendarDayData {
  day: number;
  dateStr: string;
  dayOfWeek: number; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  revenue: number;
  expense: number;
  net: number;
  jobCount: number;
  jobs: CalendarJobItem[];
  expenses: CalendarExpenseItem[];
}

export interface CalendarMonthData {
  year: number;
  month: number;
  monthName: string;
  daysInMonth: number;
  firstDayOfWeek: number;
  prevMonthDaysToPad: number[];
  nextMonthDaysToPad: number[];
  monthlyNetTotal: number;
  monthlyRevenue: number;
  monthlyExpense: number;
  annualNetTotal: number;
  totalJobsCount: number;
  totalVolume: number;
  profitableDaysCount: number;
  lossDaysCount: number;
  activeDaysCount: number;
  winRate: number;
  bestDay: { day: number; net: number } | null;
  worstDay: { day: number; net: number } | null;
  avgDailyNet: number;
  days: Record<number, CalendarDayData>;
}

export async function getCalendarMonthData(
  targetYear: number,
  targetMonth: number
): Promise<CalendarMonthData> {
  // 1. คำนวณช่วงเวลาของเดือนและของปี (Asia/Bangkok)
  const monthRange = getDateRange({
    period: "monthly",
    year: targetYear,
    month: targetMonth,
  });

  const yearRange = getDateRange({
    period: "yearly",
    year: targetYear,
  });

  const monthJobFilter = toDateFilter(monthRange);
  const yearJobFilter = toDateFilter(yearRange);

  // 2. ดึงข้อมูลแบบคู่ขนาน (Parallel Queries)
  const [monthJobs, monthExpenses, annualJobSum, annualExpenseSum] = await Promise.all([
    prisma.job.findMany({
      where: monthJobFilter ? { completedAt: monthJobFilter, status: "COMPLETED" } : { status: "COMPLETED" },
      select: {
        id: true,
        customerName: true,
        price: true,
        volumePumped: true,
        paymentMethod: true,
        completedAt: true,
        createdAt: true,
      },
      orderBy: { completedAt: "asc" },
    }),
    prisma.expense.findMany({
      where: monthJobFilter ? { createdAt: monthJobFilter } : {},
      select: {
        id: true,
        category: true,
        amount: true,
        note: true,
        createdAt: true,
        incurredAt: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.job.aggregate({
      where: yearJobFilter ? { completedAt: yearJobFilter, status: "COMPLETED" } : { status: "COMPLETED" },
      _sum: { price: true },
    }),
    prisma.expense.aggregate({
      where: yearJobFilter ? { createdAt: yearJobFilter } : {},
      _sum: { amount: true },
    }),
  ]);

  // 3. กำหนดโครงสร้างปฏิทิน
  const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
  const mStr = String(targetMonth).padStart(2, "0");
  const firstDayDate = new Date(`${targetYear}-${mStr}-01T00:00:00.000+07:00`);

  // หา dayOfWeek ของวันแรกในเขตเวลา Asia/Bangkok (0 = Sun, ..., 6 = Sat)
  const weekdaysShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const firstDayWkStr = firstDayDate.toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "Asia/Bangkok",
  });
  const firstDayOfWeek = Math.max(0, weekdaysShort.indexOf(firstDayWkStr));

  // คำนวณ padding วันของเดือนก่อนหน้า
  const daysInPrevMonth = new Date(targetYear, targetMonth - 1, 0).getDate();
  const prevMonthDaysToPad: number[] = [];
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    prevMonthDaysToPad.push(daysInPrevMonth - i);
  }

  // เตรียมโครงสร้างวัน 1..daysInMonth
  const days: Record<number, CalendarDayData> = {};
  for (let d = 1; d <= daysInMonth; d++) {
    const dStr = String(d).padStart(2, "0");
    const dayDate = new Date(`${targetYear}-${mStr}-${dStr}T00:00:00.000+07:00`);
    const dayWkStr = dayDate.toLocaleDateString("en-US", {
      weekday: "short",
      timeZone: "Asia/Bangkok",
    });
    const dayOfWeek = Math.max(0, weekdaysShort.indexOf(dayWkStr));

    days[d] = {
      day: d,
      dateStr: `${targetYear}-${mStr}-${dStr}`,
      dayOfWeek,
      revenue: 0,
      expense: 0,
      net: 0,
      jobCount: 0,
      jobs: [],
      expenses: [],
    };
  }

  // จัดกลุ่มข้อมูลงาน (Jobs) ลงแต่ละวัน
  let totalVolume = 0;
  for (const job of monthJobs) {
    const date = job.completedAt || job.createdAt;
    const { year: jYear, month: jMonth, day: jDay } = getThaiDateParts(date);
    if (jYear === targetYear && jMonth === targetMonth && days[jDay]) {
      const priceNum = Number(job.price || 0);
      days[jDay].revenue += priceNum;
      days[jDay].jobCount += 1;
      totalVolume += job.volumePumped || 0;
      days[jDay].jobs.push({
        id: job.id,
        customerName: job.customerName || "ลูกค้าทั่วไป",
        price: priceNum,
        volumePumped: job.volumePumped || 0,
        paymentMethod: job.paymentMethod,
        completedAt: date.toISOString(),
      });
    }
  }

  // จัดกลุ่มข้อมูลรายจ่าย (Expenses) ลงแต่ละวัน
  for (const exp of monthExpenses) {
    const date = exp.createdAt || exp.incurredAt;
    const { year: eYear, month: eMonth, day: eDay } = getThaiDateParts(date);
    if (eYear === targetYear && eMonth === targetMonth && days[eDay]) {
      const amountNum = Number(exp.amount || 0);
      days[eDay].expense += amountNum;
      days[eDay].expenses.push({
        id: exp.id,
        category: exp.category,
        amount: amountNum,
        note: exp.note,
        createdAt: date.toISOString(),
      });
    }
  }

  // คำนวณ Net ในแต่ละวัน และสถิติรวมของเดือน
  let monthlyRevenue = 0;
  let monthlyExpense = 0;
  let profitableDaysCount = 0;
  let lossDaysCount = 0;
  let bestDay: { day: number; net: number } | null = null;
  let worstDay: { day: number; net: number } | null = null;

  for (let d = 1; d <= daysInMonth; d++) {
    const item = days[d];
    item.net = item.revenue - item.expense;
    monthlyRevenue += item.revenue;
    monthlyExpense += item.expense;

    const hasActivity = item.jobCount > 0 || item.expense > 0;
    if (hasActivity) {
      if (item.net > 0) {
        profitableDaysCount++;
        if (!bestDay || item.net > bestDay.net) {
          bestDay = { day: d, net: item.net };
        }
      } else if (item.net < 0) {
        lossDaysCount++;
        if (!worstDay || item.net < worstDay.net) {
          worstDay = { day: d, net: item.net };
        }
      }
    }
  }

  const monthlyNetTotal = monthlyRevenue - monthlyExpense;
  const activeDaysCount = profitableDaysCount + lossDaysCount;
  const winRate =
    activeDaysCount > 0
      ? Number(((profitableDaysCount / activeDaysCount) * 100).toFixed(1))
      : 0;

  const avgDailyNet =
    activeDaysCount > 0 ? Math.round(monthlyNetTotal / activeDaysCount) : 0;

  // คำนวณยอดสุทธิสะสมประจำปี
  const annualRev = Number(annualJobSum._sum.price || 0);
  const annualExp = Number(annualExpenseSum._sum.amount || 0);
  const annualNetTotal = annualRev - annualExp;

  // คำนวณ padding วันของเดือนถัดไปเพื่อให้ตารางลงตัว (35 หรือ 42 ช่อง)
  const totalCellsSoFar = firstDayOfWeek + daysInMonth;
  const totalCellsNeeded = Math.ceil(totalCellsSoFar / 7) * 7;
  const padNextCount = totalCellsNeeded - totalCellsSoFar;
  const nextMonthDaysToPad: number[] = [];
  for (let i = 1; i <= padNextCount; i++) {
    nextMonthDaysToPad.push(i);
  }

  const monthName = THAI_MONTHS_FULL[targetMonth - 1] || `เดือน ${targetMonth}`;

  return {
    year: targetYear,
    month: targetMonth,
    monthName,
    daysInMonth,
    firstDayOfWeek,
    prevMonthDaysToPad,
    nextMonthDaysToPad,
    monthlyNetTotal,
    monthlyRevenue,
    monthlyExpense,
    annualNetTotal,
    totalJobsCount: monthJobs.length,
    totalVolume,
    profitableDaysCount,
    lossDaysCount,
    activeDaysCount,
    winRate,
    bestDay,
    worstDay,
    avgDailyNet,
    days,
  };
}
