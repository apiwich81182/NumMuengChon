import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getDateRange, toDateFilter } from "@/lib/date-range";
import { createCsvResponse, escapeCsv, formatDateTh, formatPhoneForExcel, formatTimeTh } from "@/lib/csv";
import { getPaymentMethodLabel } from "@/lib/labels";
import { Prisma } from "@prisma/client";

export const revalidate = 0;

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const period = searchParams.get("period") || "this_month";
    const vehicleId = searchParams.get("vehicleId") || "";
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    const dateFilter = toDateFilter(
      getDateRange({ period, startDate: startDateParam, endDate: endDateParam })
    );

    const where: Prisma.JobWhereInput = {};

    // ถ้าไม่ใช่ ADMIN ให้ดูได้เฉพาะงานที่ตัวเองขับ
    if (currentUser.role !== "ADMIN") {
      where.OR = [
        { userId: currentUser.id },
        { driver2Id: currentUser.id },
      ];
    }

    if (vehicleId) where.vehicleId = vehicleId;
    if (dateFilter) where.completedAt = dateFilter;

    const jobs = await prisma.job.findMany({
      where,
      include: {
        vehicle: true,
        user: true,      // คนขับหลัก
        driver2: true,   // ผู้ช่วย / คนขับ 2
      },
      orderBy: { completedAt: "asc" },
    });

    // 12 คอลัมน์มาตรฐานตามตารางตัวอย่าง
    const headers = [
      "วันที่เสร็จงาน",
      "เวลา",
      "ทะเบียนรถ",
      "ชื่อลูกค้า/หน้างาน",
      "เบอร์โทร",
      "พนักงานขับรถหลัก",
      "ผู้ช่วย",
      "ปริมาณที่สูบ (ลิตร)",
      "ยอดเงิน (บาท)",
      "วิธีการชำระเงิน",
      "พิกัด GPS",
      "ลิงก์รูปสลิป",
    ];

    const rows = jobs.map((job) => {
      const jobDateObj = new Date(job.completedAt || job.createdAt);
      const dateTh = formatDateTh(jobDateObj);
      const timeTh = formatTimeTh(jobDateObj);

      const plateNumber = job.vehicle?.plateNumber || "-";
      const customerName = job.customerName || "-";
      const phoneCol = formatPhoneForExcel(job.customerPhone);
      const mainDriver = job.user?.name || "-";
      const helperDriver = job.driver2?.name || "-";
      const volume = job.volumePumped || 0;
      const price = Number(job.price || 0);
      const paymentMethodTh = getPaymentMethodLabel(job.paymentMethod);
      const gps = job.latitude !== null && job.longitude !== null
        ? `${job.latitude}, ${job.longitude}`
        : "-";
      const slipUrl = job.slipPhotoUrl || "-";

      return [
        escapeCsv(dateTh),
        escapeCsv(timeTh),
        escapeCsv(plateNumber),
        escapeCsv(customerName),
        phoneCol, // ข้อความแบบ ="0xxxxxxxxx" ไม่ต้อง escape ซ้ำ
        escapeCsv(mainDriver),
        escapeCsv(helperDriver),
        volume,
        price,
        escapeCsv(paymentMethodTh),
        escapeCsv(gps),
        escapeCsv(slipUrl),
      ];
    });

    // ใส่ \uFEFF (UTF-8 BOM) ด้านหน้าสุด
    const fileName = `jobs-export-${Date.now()}.csv`;
    return createCsvResponse(fileName, headers, rows);
  } catch (error) {
    console.error("Export jobs error:", error);
    return new NextResponse("Failed to export jobs", { status: 500 });
  }
}