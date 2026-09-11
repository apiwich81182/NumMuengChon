import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const revalidate = 0;

// จัดการ escape ข้อความที่มีเครื่องหมายคอมม่า (,) หรือเครื่องหมายคำพูด (")
function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).trim();
  return `"${str.replace(/"/g, '""')}"`;
}

// ฟังก์ชันแปลงเบอร์โทรศัพท์ให้มีเลข 0 นำหน้าเสมอเมื่อเปิดใน Excel
function formatPhoneForExcel(phone: string | null | undefined): string {
  if (!phone) return "-";
  const cleanPhone = phone.trim().replace(/[-\s]/g, "");
  if (!cleanPhone) return "-";

  // หากเบอร์มี 9 หลักและไม่มี 0 นำหน้า ให้เติม 0 ให้ครบ 10 หลัก
  const fullPhone =
    cleanPhone.length === 9 && !cleanPhone.startsWith("0")
      ? `0${cleanPhone}`
      : cleanPhone;

  // ครอบด้วย ="..." เพื่อบังคับให้ Excel แสดงผลเป็น Text ที่มี 0 นำหน้า
  return `="${fullPhone}"`;
}

// แยกวันที่เป็น วัน/เดือน/ปี พ.ศ. (เช่น 11/09/2569)
function formatDateTh(date: Date): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear() + 543;
  return `${day}/${month}/${year}`;
}

// แยกเวลาเป็น ชั่วโมง:นาที (เช่น 17:47)
function formatTimeTh(date: Date): string {
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

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

    const now = new Date();
    let start: Date | null = null;
    let end: Date | null = null;

    if (period === "today") {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    } else if (period === "this_month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (period === "this_year") {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
    } else if (period === "custom" && (startDateParam || endDateParam)) {
      if (startDateParam) start = new Date(`${startDateParam}T00:00:00`);
      if (endDateParam) end = new Date(`${endDateParam}T23:59:59`);
    }

    const where: any = {};

    // ถ้าไม่ใช่ ADMIN ให้ดูได้เฉพาะงานที่ตัวเองขับ
    if (currentUser.role !== "ADMIN") {
      where.OR = [
        { userId: currentUser.id },
        { driver2Id: currentUser.id },
      ];
    }

    if (vehicleId) where.vehicleId = vehicleId;
    if (start && end) where.completedAt = { gte: start, lte: end };

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
      const phoneCol = formatPhoneForExcel((job as any).customerPhone || (job as any).phone);
      const mainDriver = job.user?.name || "-";
      const helperDriver = job.driver2?.name || "-";
      const volume = job.volumePumped || 0;
      const price = Number(job.price || 0);
      const paymentMethodTh = job.paymentMethod === "CASH" ? "เงินสด" : "โอนผ่านบัญชี";
      const gps = (job as any).gpsLocation || (job as any).location || "-";
      const slipUrl = (job as any).slipPhotoUrl || "-";

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
      ].join(",");
    });

    // ใส่ \uFEFF (UTF-8 BOM) ด้านหน้าสุด
    const csvContent =
      "\uFEFF" + [headers.join(","), ...rows].join("\r\n");

    const fileName = `jobs-export-${Date.now()}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (error: any) {
    console.error("Export jobs error:", error);
    return new NextResponse("Failed to export jobs", { status: 500 });
  }
}