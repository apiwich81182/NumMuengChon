import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getThaiDateParts } from "@/lib/date-range";
import { getCalendarMonthData } from "@/lib/calendar-stats";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const nowParts = getThaiDateParts(new Date());

    const yearParam = Number(searchParams.get("year"));
    const monthParam = Number(searchParams.get("month"));

    const targetYear = !isNaN(yearParam) && yearParam >= 2000 && yearParam <= 2100 ? yearParam : nowParts.year;
    const targetMonth = !isNaN(monthParam) && monthParam >= 1 && monthParam <= 12 ? monthParam : nowParts.month;

    const data = await getCalendarMonthData(targetYear, targetMonth);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching calendar data:", error);
    return NextResponse.json({ error: "Failed to fetch calendar data" }, { status: 500 });
  }
}

