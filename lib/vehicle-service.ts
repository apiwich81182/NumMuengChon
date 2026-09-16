import { prisma } from "@/lib/prisma";

/**
 * ดึงรายการรถที่พร้อมใช้งาน (isActive: true) เรียงตามเลขทะเบียน
 */
export async function getActiveVehicles() {
  return await prisma.vehicle.findMany({
    where: { isActive: true },
    orderBy: { plateNumber: "asc" },
  });
}

/**
 * ดึงรายการรถทั้งหมดสำหรับหน้าจัดการรถของแอดมิน
 */
export async function getAllVehicles() {
  return await prisma.vehicle.findMany({
    include: {
      _count: {
        select: { jobs: true },
      },
    },
    orderBy: { plateNumber: "asc" },
  });
}

