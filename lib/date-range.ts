export type DateRange = {
  start: Date | null;
  end: Date | null;
};

type DateRangeOptions = {
  period?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  year?: number;
  month?: number;
  now?: Date;
};

/**
 * ดึง { year, month (1-12), day (1-31), dateStr: "YYYY-MM-DD" } ตามเวลาประเทศไทย (Asia/Bangkok)
 */
export function getThaiDateParts(dateInput: Date | string | number = new Date()) {
  const date = typeof dateInput === "object" ? dateInput : new Date(dateInput);
  const thaiDateStr = date.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
  const [year, month, day] = thaiDateStr.split("-").map(Number);
  return { year, month, day, dateStr: thaiDateStr };
}

function parseDateWithTimezone(value: string, endOfDay: boolean): Date {
  return new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+07:00`);
}

export function getDateRange({
  period,
  startDate,
  endDate,
  year,
  month,
  now = new Date(),
}: DateRangeOptions): DateRange {
  if (startDate || endDate) {
    const firstDate = startDate || endDate;
    const lastDate = endDate || startDate;
    return {
      start: firstDate ? parseDateWithTimezone(firstDate, false) : null,
      end: lastDate ? parseDateWithTimezone(lastDate, true) : null,
    };
  }

  const { year: tYear, month: tMonth, dateStr: tDateStr } = getThaiDateParts(now);

  switch (period) {
    case "today": {
      return {
        start: new Date(`${tDateStr}T00:00:00.000+07:00`),
        end: new Date(`${tDateStr}T23:59:59.999+07:00`),
      };
    }
    case "weekly": {
      const startDay = new Date(`${tDateStr}T00:00:00.000+07:00`);
      startDay.setDate(startDay.getDate() - 6);
      return {
        start: startDay,
        end: new Date(`${tDateStr}T23:59:59.999+07:00`),
      };
    }
    case "monthly":
    case "this_month": {
      const targetYear = year ?? tYear;
      const targetMonth = month ?? tMonth;
      const lastDayOfMonth = new Date(targetYear, targetMonth, 0).getDate();
      const mStr = String(targetMonth).padStart(2, "0");
      return {
        start: new Date(`${targetYear}-${mStr}-01T00:00:00.000+07:00`),
        end: new Date(`${targetYear}-${mStr}-${String(lastDayOfMonth).padStart(2, "0")}T23:59:59.999+07:00`),
      };
    }
    case "yearly":
    case "this_year": {
      const targetYear = year ?? tYear;
      return {
        start: new Date(`${targetYear}-01-01T00:00:00.000+07:00`),
        end: new Date(`${targetYear}-12-31T23:59:59.999+07:00`),
      };
    }
    case "all":
    default:
      return { start: null, end: null };
  }
}

export function getTodayRange(now = new Date()): { start: Date; end: Date } {
  const range = getDateRange({ period: "today", now });
  return { start: range.start!, end: range.end! };
}

export function toDateFilter(range: DateRange) {
  if (!range.start && !range.end) return undefined;

  return {
    ...(range.start ? { gte: range.start } : {}),
    ...(range.end ? { lte: range.end } : {}),
  };
}

export function toLocalDateKey(date: Date): string {
  const thaiDateStr = date.toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" });
  return thaiDateStr;
}

/**
 * Helper สกัด Params และสร้าง DateFilter พร้อมใช้งานสำหรับ Prisma Query
 */
export function parseDateFilterParams(
  params: {
    period?: string;
    startDate?: string;
    endDate?: string;
    year?: string | number;
    month?: string | number;
  },
  defaultPeriod = "today"
) {
  const period = params.period || (!params.startDate && !params.endDate ? defaultPeriod : "custom");
  const startDate = params.startDate || "";
  const endDate = params.endDate || "";
  const targetYear = params.year ? Number(params.year) : undefined;
  const targetMonth = params.month ? Number(params.month) : undefined;

  const range = getDateRange({
    period,
    startDate,
    endDate,
    year: targetYear,
    month: targetMonth,
  });

  return {
    period,
    startDate,
    endDate,
    range,
    dateFilter: toDateFilter(range),
  };
}
