import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  // ตรวจสอบสิทธิ์ Admin
  const currentUser = await getCurrentUser();
  if (currentUser?.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") || "this_month";
  const paramStartDate = searchParams.get("startDate");
  const paramEndDate = searchParams.get("endDate");

  const now = new Date();
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
  } else if (period === "custom" && paramStartDate && paramEndDate) {
    start = new Date(`${paramStartDate}T00:00:00`);
    end = new Date(`${paramEndDate}T23:59:59`);
  }

  // ดึงรายการงานตามช่วงเวลา
  const jobs = await prisma.job.findMany({
    where: {
      completedAt: { gte: start, lte: end },
    },
    include: {
      user: true,
      driver2: true,
      vehicle: true,
    },
    orderBy: { completedAt: "asc" },
  });

  // หัวตาราง CSV
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

  // ฟังก์ชัน Clean ข้อความป้องกันปัญหารูปแบบ CSV
  const cleanField = (text: string | number | null | undefined) => {
    if (text === null || text === undefined) return '""';
    const str = String(text).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = jobs.map((job) => {
    const d = new Date(job.completedAt);
    const dateStr = d.toLocaleDateString("th-TH");
    const timeStr = d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
    const paymentMethodText = job.paymentMethod === "CASH" ? "เงินสด" : "โอนเงิน";
    const gps = job.latitude && job.longitude ? `${job.latitude}, ${job.longitude}` : "-";

    return [
      cleanField(dateStr),
      cleanField(timeStr),
      cleanField(job.vehicle.plateNumber),
      cleanField(job.customerName),
      cleanField(job.customerPhone || "-"),
      cleanField(job.user.name),
      cleanField(job.driver2?.name || "-"),
      cleanField(job.volumePumped),
      cleanField(Number(job.price)),
      cleanField(paymentMethodText),
      cleanField(gps),
      cleanField(job.slipPhotoUrl || "-"),
    ].join(",");
  });

  // ใส่ \uFEFF (UTF-8 BOM) เพื่อให้เปิดใน Excel ภาษาไทยไม่เพี้ยน
  const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");

  const fileName = `waste-jobs-report-${start.toISOString().split("T")[0]}_to_${end.toISOString().split("T")[0]}.csv`;

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}