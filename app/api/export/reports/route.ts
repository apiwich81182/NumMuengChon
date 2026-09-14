import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

const EXPENSE_CATEGORY_TH: Record<string, string> = {
  FUEL: "ค่าน้ำมัน",
  MAINTENANCE: "ค่าซ่อมบำรุง",
  DISPOSAL_FEE: "ค่าจุดทิ้งของเสีย",
  SALARY: "ค่าแรง / เงินเดือน",
  MARKETING: "ค่าการตลาด",
  OTHER: "อื่นๆ",
};

function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).trim();
  return `"${str.replace(/"/g, '""')}"`;
}

// แปลงเป็นวันที่แบบ พ.ศ. (เช่น 14/09/2569)
function formatDateTh(dateInput: Date | string | number) {
  const d = new Date(dateInput);
  return d.toLocaleDateString("th-TH", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// แปลงเป็นเวลา (เช่น 19:14)
function formatTimeTh(dateInput: Date | string | number) {
  const d = new Date(dateInput);
  return d.toLocaleTimeString("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "yearly";
    const vehicleId = searchParams.get("vehicleId") || "";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const targetYear = Number(searchParams.get("year")) || 2025;
    const targetMonth = Number(searchParams.get("month")) || (new Date().getMonth() + 1);

    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;

    if (period === "today") {
      // 👈 เพิ่มเงื่อนไข "วันนี้" ตั้งแต่ 00:00:00 ถึง 23:59:59 ของวันนี้
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (period === "weekly") {
      start = new Date(now);
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end = new Date(now);
      end.setHours(23, 59, 59, 999);
    } else if (period === "monthly" || period === "this_month") {
      start = new Date(targetYear, targetMonth - 1, 1, 0, 0, 0);
      end = new Date(targetYear, targetMonth, 0, 23, 59, 59);
    } else if (period === "yearly" || period === "this_year") {
      start = new Date(targetYear, 0, 1, 0, 0, 0);
      end = new Date(targetYear, 11, 31, 23, 59, 59);
    } else if (period === "custom" && (startDateParam || endDateParam)) {
      if (startDateParam) start = new Date(`${startDateParam}T00:00:00`);
      if (endDateParam) end = new Date(`${endDateParam}T23:59:59`);
    } else if (period === "all") {
      // ทั้งหมด ไม่ต้องกำหนด start/end
      start = null;
      end = null;
    }

    // เงื่อนไขสำหรับ Jobs (รายรับ)
    const jobWhere: any = {};
    if (vehicleId) jobWhere.vehicleId = vehicleId;
    if (start && end) {
      jobWhere.OR = [
        { completedAt: { gte: start, lte: end } },
        { createdAt: { gte: start, lte: end } }
      ];
    }

    // เงื่อนไขสำหรับ Expenses (รายจ่าย)
    const expenseWhere: any = {};
    if (vehicleId) expenseWhere.vehicleId = vehicleId;
    if (start && end) {
      expenseWhere.createdAt = { gte: start, lte: end };
    }

    const [jobs, expenses] = await Promise.all([
      prisma.job.findMany({
        where: jobWhere,
        include: { vehicle: true, user: true },
        orderBy: { createdAt: "asc" },
      }),
      prisma.expense.findMany({
        where: expenseWhere,
        include: { vehicle: true, user: true },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    const headers = [
      "ประเภท",
      "วันที่",
      "เวลา",
      "ทะเบียนรถ",
      "ผู้บันทึก",
      "รายละเอียด/ลูกค้า",
      "ช่องทางชำระเงิน/หมวดหมู่",
      "รายรับ (บาท)",
      "รายจ่าย (บาท)",
    ];

    type ReportRow = {
      type: "รายรับ" | "รายจ่าย";
      timestamp: Date;
      plate: string;
      user: string;
      detail: string;
      channel: string;
      rev: number;
      exp: number;
    };

    const list: ReportRow[] = [];

    jobs.forEach((j) => {
      const pTh = j.paymentMethod === "CASH" ? "เงินสด" : "โอนผ่านบัญชี";
      list.push({
        type: "รายรับ",
        timestamp: new Date(j.completedAt || j.createdAt),
        plate: j.vehicle?.plateNumber || "-",
        user: j.user?.name || "-",
        detail: j.customerName || "-",
        channel: pTh,
        rev: Number(j.price || 0),
        exp: 0,
      });
    });

    expenses.forEach((e) => {
      const catTh = EXPENSE_CATEGORY_TH[e.category] || e.category;
      list.push({
        type: "รายจ่าย",
        timestamp: new Date(e.createdAt),
        plate: e.vehicle?.plateNumber || "-",
        user: e.user?.name || "-",
        detail: e.note || "-",
        channel: catTh,
        rev: 0,
        exp: Number(e.amount || 0),
      });
    });

    list.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const rows = list.map((item) => [
      escapeCsv(item.type),
      escapeCsv(formatDateTh(item.timestamp)),
      escapeCsv(formatTimeTh(item.timestamp)),
      escapeCsv(item.plate),
      escapeCsv(item.user),
      escapeCsv(item.detail),
      escapeCsv(item.channel),
      item.rev,
      item.exp,
    ]);

    const csvBody =
      "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    const fileName = `income-expense-${targetYear}.csv`;

    return new Response(csvBody, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store, no-cache",
      },
    });
  } catch (error: any) {
    console.error("Export Error:", error);
    return new NextResponse(`Error generating CSV: ${error.message}`, {
      status: 500,
    });
  }
}