"use server";

import { prisma } from "@/lib/prisma";
import { requireAdminAction } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { Prisma, Role } from "@prisma/client";
import { revalidateStaff, revalidateVehicles } from "@/lib/revalidation";

// --- จัดการรถสูบส้วม (Vehicles) ---

export async function createVehicle(formData: FormData) {
  const auth = await requireAdminAction();
  if (!auth.success) return auth;

  const plateNumber = formData.get("plateNumber") as string;
  const capacity = Number(formData.get("capacity") || 0);

  if (!plateNumber || capacity <= 0) {
    return { success: false, error: "กรุณากรอกทะเบียนรถและความจุถังให้ถูกต้อง" };
  }

  try {
    await prisma.vehicle.create({
      data: {
        plateNumber: plateNumber.trim(),
        capacityLiters: capacity,
        isActive: true,
      },
    });

    revalidateVehicles();
    return { success: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, error: "ทะเบียนรถนี้มีอยู่ในระบบแล้ว" };
    }
    return { success: false, error: "ไม่สามารถเพิ่มรถได้" };
  }
}

export async function toggleVehicleStatus(id: string, currentStatus: boolean) {
  const auth = await requireAdminAction();
  if (!auth.success) return auth;

  try {
    await prisma.vehicle.update({
      where: { id },
      data: { isActive: !currentStatus },
    });

    revalidateVehicles();
    return { success: true };
  } catch {
    return { success: false, error: "เกิดข้อผิดพลาดในการเปลี่ยนสถานะรถ" };
  }
}

// --- จัดการพนักงาน (Users / Staff) ---

export async function createUser(formData: FormData) {
  const auth = await requireAdminAction();
  if (!auth.success) return auth;

  const name = formData.get("name") as string;
  const phone = formData.get("phone") as string;
  const password = formData.get("password") as string;
  const role = (formData.get("role") as Role) || "DRIVER";

  if (!name || !phone || !password) {
    return { success: false, error: "กรุณากรอกข้อมูลให้ครบถ้วน" };
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    await prisma.user.create({
      data: {
        name: name.trim(),
        phone: phone.trim(),
        password: hashedPassword,
        role,
      },
    });

    revalidateStaff();
    return { success: true };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { success: false, error: "เบอร์โทรศัพท์นี้ถูกใช้งานแล้ว" };
    }
    return { success: false, error: "ไม่สามารถเพิ่มพนักงานได้" };
  }
}

// 1. รีเซ็ตรหัสผ่านพนักงาน
export async function resetUserPassword(userId: string, newPassword: string) {
  const auth = await requireAdminAction();
  if (!auth.success) return auth;

  if (!newPassword || newPassword.trim().length < 4) {
    return { success: false, error: "รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร" };
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    revalidateStaff();
    return { success: true };
  } catch {
    return { success: false, error: "ไม่สามารถรีเซ็ตรหัสผ่านได้" };
  }
}

// 2. ลบพนักงาน
export async function deleteUser(userId: string) {
  const auth = await requireAdminAction();
  if (!auth.success) return auth;

  // ป้องกันไม่ให้แอดมินลบบัญชีของตัวเอง
  if (auth.user.id === userId) {
    return { success: false, error: "ไม่สามารถลบบัญชีของตัวเองที่กำลังใช้งานอยู่ได้" };
  }

  try {
    // เช็กว่าพนักงานเคยมีประวัติงานหรือลงเวลาหรือไม่
    const jobCount = await prisma.job.count({
      where: {
        OR: [{ userId }, { driver2Id: userId }],
      },
    });

    if (jobCount > 0) {
      return {
        success: false,
        error: `ไม่สามารถลบได้ เนื่องจากพนักงานคนนี้มีประวัติการทำงานในระบบแล้ว ${jobCount} งาน (เพื่อป้องกันข้อมูลบัญชีและประวัติงานสูญหาย)`,
      };
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    revalidateStaff();
    return { success: true };
  } catch {
    return { success: false, error: "เกิดข้อผิดพลาดในการลบพนักงาน" };
  }
}