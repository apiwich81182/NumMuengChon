import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getDateRange, toDateFilter } from "@/lib/date-range";
import { createCsvResponse, escapeCsv, formatDateTh, formatTimeTh } from "@/lib/csv";
import { getExpenseCategoryLabel, getPaymentMethodLabel } from "@/lib/labels";
import { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

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
    const targetYear = Number(searchParams.get("year")) || new Date().getFullYear();
    const targetMonth = Number(searchParams.get("month")) || (new Date().getMonth() + 1);

    const dateRange = getDateRange({
      period,
      startDate: startDateParam,
      endDate: endDateParam,
      year: targetYear,
      month: targetMonth,
    });
    const dateFilter = toDateFilter(dateRange);

    // เงื่อนไขสำหรับ Jobs (รายรับ)
    const jobWhere: Prisma.JobWhereInput = {};
    if (vehicleId) jobWhere.vehicleId = vehicleId;
    if (dateFilter) {
      jobWhere.OR = [
        { completedAt: dateFilter },
        { createdAt: dateFilter },
      ];
    }

    // เงื่อนไขสำหรับ Expenses (รายจ่าย)
    const expenseWhere: Prisma.ExpenseWhereInput = {};
    if (vehicleId) expenseWhere.vehicleId = vehicleId;
    if (dateFilter) expenseWhere.createdAt = dateFilter;

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
      "สลิป/หลักฐาน", // 👈 เพิ่ม Header สลิป
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
      slipUrl: string | null; // 👈 กำหนด Type ให้รองรับ URL สลิป
    };

    const list: ReportRow[] = [];

    jobs.forEach((j) => {
      const pTh = getPaymentMethodLabel(j.paymentMethod);
      // ดึงสลิปของ Job (กรณีเงินโอน)
      const jobSlip = j.slipPhotoUrl || null;

      list.push({
        type: "รายรับ",
        timestamp: new Date(j.completedAt || j.createdAt),
        plate: j.vehicle?.plateNumber || "-",
        user: j.user?.name || "-",
        detail: j.customerName || "-",
        channel: pTh,
        rev: Number(j.price || 0),
        exp: 0,
        slipUrl: jobSlip,
      });
    });

    expenses.forEach((e) => {
      const catTh = getExpenseCategoryLabel(e.category);
      // ดึงสลิปของ Expense
      const expenseSlip = e.slipPhotoUrl || null;

      list.push({
        type: "รายจ่าย",
        timestamp: new Date(e.createdAt),
        plate: e.vehicle?.plateNumber || "-",
        user: e.user?.name || "-",
        detail: e.note || "-",
        channel: catTh,
        rev: 0,
        exp: Number(e.amount || 0),
        slipUrl: expenseSlip,
      });
    });

    list.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    const rows = list.map((item) => {
      // แปลงเป็นสูตร HYPERLINK ให้กดคลิกเปิดดูสลิปได้จาก Excel
      const slipCell = item.slipUrl
        ? `"=HYPERLINK(""${item.slipUrl}"", ""ดูสลิป"")"`
        : `"-"`;

      return [
        escapeCsv(item.type),
        escapeCsv(formatDateTh(item.timestamp)),
        escapeCsv(formatTimeTh(item.timestamp)),
        escapeCsv(item.plate),
        escapeCsv(item.user),
        escapeCsv(item.detail),
        escapeCsv(item.channel),
        item.rev,
        item.exp,
        slipCell,
      ];
    });

    const fileName = `income-expense-${targetYear}.csv`;
    return createCsvResponse(fileName, headers, rows, { "Cache-Control": "no-store, no-cache" });
  } catch (error) {
    console.error("Export Error:", error);
    return new NextResponse("Error generating CSV", {
      status: 500,
    });
  }
}