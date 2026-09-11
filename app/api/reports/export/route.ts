import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const revalidate = 0;

const EXPENSE_CATEGORY_TH: Record<string, string> = {
  FUEL: "ค่าน้ำมัน",
  MAINTENANCE: "ค่าซ่อมบำรุง",
  DISPOSAL_FEE: "ค่าจุดทิ้งของเสีย",
  SALARY: "ค่าแรง / เงินเดือน",
  OTHER: "อื่นๆ",
};

// ฟังก์ชันครอบ Text ที่มีเครื่องหมายคอมม่า (,) หรือเครื่องหมายคำพูด (") เพื่อไม่ให้ CSV แตกแถว
function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).trim();
  return `"${str.replace(/"/g, '""')}"`;
}

// ฟังก์ชันแปลงวันที่เป็น พ.ศ. ให้เหมือนในระบบ (เช่น 11/09/2569 17:47)
function formatDateTimeTh(date: Date): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear() + 543;
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "monthly";
    const vehicleId = searchParams.get("vehicleId") || "";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;

    if (period === "weekly") {
      start = new Date(now);
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      end = new Date(now);
      end.setHours(23, 59, 59, 999);
    } else if (period === "monthly" || period === "this_month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (period === "yearly" || period === "this_year") {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    } else if (period === "custom" && (startDateParam || endDateParam)) {
      if (startDateParam) start = new Date(`${startDateParam}T00:00:00`);
      if (endDateParam) end = new Date(`${endDateParam}T23:59:59`);
    }

    // เงื่อนไขสำหรับ Jobs (รายรับ)
    const jobWhere: any = {};
    if (vehicleId) jobWhere.vehicleId = vehicleId;
    if (start && end) jobWhere.completedAt = { gte: start, lte: end };

    // เงื่อนไขสำหรับ Expenses (รายจ่าย)
    const expenseWhere: any = {};
    if (vehicleId) expenseWhere.vehicleId = vehicleId;
    if (start && end) expenseWhere.createdAt = { gte: start, lte: end };

    // ดึงทั้งรายรับและรายจ่ายพร้อมกัน
    const [jobs, expenses] = await Promise.all([
      prisma.job.findMany({
        where: jobWhere,
        include: {
          vehicle: true,
          user: true,
        },
        orderBy: { completedAt: "asc" },
      }),
      prisma.expense.findMany({
        where: expenseWhere,
        include: {
          vehicle: true,
          user: true,
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    // สร้าง Header ของ CSV ตามลำดับคอลัมน์ใน Excel ของคุณ
    const headers = [
      "ประเภท",
      "วันที่-เวลา",
      "ทะเบียนรถ",
      "ผู้บันทึก",
      "รายละเอียด/ลูกค้า",
      "ช่องทางชำระเงิน/หมวดหมู่",
      "รายรับ (บาท)",
      "รายจ่าย (บาท)",
    ];

    // รวมรายการทั้งสองฝั่งแล้วจัดเรียงตามลำดับเวลา
    type ReportItem = {
      type: "รายรับ" | "รายจ่าย";
      timestamp: Date;
      plateNumber: string;
      recordedBy: string;
      detail: string;
      channelOrCategory: string;
      revenue: number;
      expense: number;
    };

    const combinedList: ReportItem[] = [];

    // 1. แปลงฝั่งรายรับ (Job)
    jobs.forEach((j) => {
      const paymentTh = j.paymentMethod === "CASH" ? "เงินสด" : "โอนผ่านบัญชี";
      combinedList.push({
        type: "รายรับ",
        timestamp: new Date(j.completedAt || j.createdAt),
        plateNumber: j.vehicle?.plateNumber || "-",
        recordedBy: j.user?.name || "-",
        detail: j.customerName || "-",
        channelOrCategory: paymentTh,
        revenue: Number(j.price || 0),
        expense: 0,
      });
    });

    // 2. แปลงฝั่งรายจ่าย (Expense)
    expenses.forEach((e) => {
      const categoryTh = EXPENSE_CATEGORY_TH[e.category] || e.category;
      combinedList.push({
        type: "รายจ่าย",
        timestamp: new Date(e.createdAt),
        plateNumber: e.vehicle?.plateNumber || "-",
        recordedBy: e.user?.name || "-",
        detail: e.note || "-",
        channelOrCategory: categoryTh, // 👈 แปลง FUEL -> ค่าน้ำมัน, SALARY -> ค่าแรง / เงินเดือน
        revenue: 0,
        expense: Number(e.amount || 0),
      });
    });

    // เรียงตามเวลาจากเก่าไปใหม่
    combinedList.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    // ประกอบแถว CSV
    const rows = combinedList.map((item) => [
      escapeCsv(item.type),
      escapeCsv(formatDateTimeTh(item.timestamp)),
      escapeCsv(item.plateNumber),
      escapeCsv(item.recordedBy),
      escapeCsv(item.detail),
      escapeCsv(item.channelOrCategory),
      item.revenue,
      item.expense,
    ]);

    const csvContent =
      "\uFEFF" + // BOM ป้องกันภาษาไทยเพี้ยน
      [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    const fileName = `income-expense-report-${Date.now()}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error("Export report error:", error);
    return new NextResponse("Failed to export report", { status: 500 });
  }
}