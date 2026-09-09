"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { AttendanceType } from "@prisma/client";
import { revalidatePath } from "next/cache";

// 1. เช็กอินเข้างาน (Check-in)
export async function checkInAttendance(formData: FormData) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" };
    }

    const lat = formData.get("latitude") ? parseFloat(formData.get("latitude") as string) : null;
    const lng = formData.get("longitude") ? parseFloat(formData.get("longitude") as string) : null;

    // ตรวจสอบช่วงเวลาของวันนี้
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // เช็กว่าผู้ใช้คนนี้ได้กดเช็กอินไปแล้วหรือยังในวันนี้
    const existing = await prisma.attendance.findFirst({
      where: {
        userId: currentUser.id,
        type: "WORK",
        createdAt: { gte: todayStart },
      },
    });

    if (existing) {
      return { success: false, error: "วันนี้คุณได้ทำการเช็กอินเข้างานไปแล้ว" };
    }

    await prisma.attendance.create({
      data: {
        userId: currentUser.id,
        type: "WORK",
        checkInAt: new Date(),
        latitude: lat,
        longitude: lng,
      },
    });

    revalidatePath("/attendance");
    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Check-in error:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการเช็กอินเข้างาน" };
  }
}

// 2. ลงเวลาออกงาน (Check-out)
export async function checkOutAttendance() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" };
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // หารายการเช็กอินของวันนี้ที่ยังไม่ได้กดออกงาน
    const activeAttendance = await prisma.attendance.findFirst({
      where: {
        userId: currentUser.id,
        type: "WORK",
        checkOutAt: null,
        createdAt: { gte: todayStart },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!activeAttendance) {
      return { success: false, error: "ไม่พบรายการเช็กอินที่ค้างอยู่ของวันนี้" };
    }

    await prisma.attendance.update({
      where: { id: activeAttendance.id },
      data: {
        checkOutAt: new Date(),
      },
    });

    revalidatePath("/attendance");
    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Check-out error:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการลงเวลาออกงาน" };
  }
}

// 3. ยื่นคำขอลา (Leave Request)
export async function requestLeave(formData: FormData) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" };
    }

    const type = formData.get("type") as AttendanceType;
    const note = formData.get("note") as string;

    if (!type) {
      return { success: false, error: "กรุณาเลือกประเภทการลา" };
    }

    await prisma.attendance.create({
      data: {
        userId: currentUser.id,
        type,
        note: note || null,
        isApproved: false, // รอแอดมินอนุมัติ
      },
    });

    revalidatePath("/attendance");
    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error) {
    console.error("Leave request error:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการยื่นคำขอลา" };
  }
}

// แอดมินอนุมัติหรือปฏิเสธคำขอลา
export async function updateLeaveStatus(attendanceId: string, isApproved: boolean) {
  const currentUser = await getCurrentUser();
  if (currentUser?.role !== "ADMIN") {
    return { success: false, error: "เฉพาะผู้ดูแลระบบเท่านั้นที่มีสิทธิ์ดำเนินการ" };
  }

  try {
    await prisma.attendance.update({
      where: { id: attendanceId },
      data: { isApproved },
    });

    revalidatePath("/admin/attendance");
    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch {
    return { success: false, error: "เกิดข้อผิดพลาดในการเปลี่ยนสถานะการลา" };
  }
}