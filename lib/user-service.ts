import { prisma } from "@/lib/prisma";

/**
 * ดึงรายการพนักงานขับรถ (DRIVER)
 */
export async function getActiveDrivers() {
  return await prisma.user.findMany({
    where: { role: "DRIVER" },
    orderBy: { name: "asc" },
  });
}

/**
 * ดึงรายการผู้ใช้งานสำหรับตัวกรอง (DRIVER + ADMIN)
 */
export async function getStaffAndDrivers() {
  return await prisma.user.findMany({
    where: { role: { in: ["DRIVER", "ADMIN"] } },
    orderBy: { name: "asc" },
  });
}

/**
 * ดึงรายการพนักงานทั้งหมดพร้อมยอดงานสะสมสำหรับหน้าจัดการพนักงาน
 */
export async function getAllStaffWithJobCounts() {
  return await prisma.user.findMany({
    include: {
      _count: {
        select: {
          jobsAsDriver1: true,
          jobsAsDriver2: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

