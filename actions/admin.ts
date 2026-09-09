"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

// --- จัดการรถสูบส้วม (Vehicles) ---

export async function createVehicle(formData: FormData) {
  const currentUser = await getCurrentUser();
  if (currentUser?.role !== "ADMIN") {
    return { success: false, error: "ไม่มีสิทธิ์ดำเนินการ (เฉพาะผู้ดูแลระบบ)" };
  }

  const plateNumber = formData.get("plateNumber") as string;
  const capacity = Number(formData.get("capacity") || 0);

  if (!plateNumber || capacity <= 0) {
    return { success: false, error: "กรุณากรอกทะเบียนรถและความจุถังให้ถูกต้อง" };
  }

  try {
    await prisma.vehicle.create({
      data: {
        plateNumber: plateNumber.trim(),
        capacityLiters: capacity, // <-- เปลี่ยนจาก capacity เป็น capacityLiters
        isActive: true,
      },
    });

    revalidatePath("/admin/vehicles");
    revalidatePath("/admin/dashboard");
    revalidatePath("/jobs/new");
    return { success: true };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { success: false, error: "ทะเบียนรถนี้มีอยู่ในระบบแล้ว" };
    }
    return { success: false, error: "ไม่สามารถเพิ่มรถได้" };
  }
}

export async function toggleVehicleStatus(id: string, currentStatus: boolean) {
  const currentUser = await getCurrentUser();
  if (currentUser?.role !== "ADMIN") {
    return { success: false, error: "ไม่มีสิทธิ์ดำเนินการ" };
  }

  try {
    await prisma.vehicle.update({
      where: { id },
      data: { isActive: !currentStatus },
    });

    revalidatePath("/admin/vehicles");
    revalidatePath("/jobs/new");
    return { success: true };
  } catch {
    return { success: false, error: "เกิดข้อผิดพลาดในการเปลี่ยนสถานะรถ" };
  }
}

// --- จัดการพนักงาน (Users / Staff) ---

export async function createUser(formData: FormData) {
  const currentUser = await getCurrentUser();
  if (currentUser?.role !== "ADMIN") {
    return { success: false, error: "ไม่มีสิทธิ์ดำเนินการ (เฉพาะผู้ดูแลระบบ)" };
  }

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

    revalidatePath("/admin/staff");
    revalidatePath("/jobs/new");
    return { success: true };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { success: false, error: "เบอร์โทรศัพท์นี้ถูกใช้งานแล้ว" };
    }
    return { success: false, error: "ไม่สามารถเพิ่มพนักงานได้" };
  }
}

// 1. รีเซ็ตรหัสผ่านพนักงาน
export async function resetUserPassword(userId: string, newPassword: string) {
  const currentUser = await getCurrentUser();
  if (currentUser?.role !== "ADMIN") {
    return { success: false, error: "ไม่มีสิทธิ์ดำเนินการ" };
  }

  if (!newPassword || newPassword.trim().length < 4) {
    return { success: false, error: "รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร" };
  }

  try {
    const hashedPassword = await bcrypt.hash(newPassword.trim(), 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    revalidatePath("/admin/staff");
    return { success: true };
  } catch (error) {
    return { success: false, error: "ไม่สามารถรีเซ็ตรหัสผ่านได้" };
  }
}

// 2. ลบพนักงาน
export async function deleteUser(userId: string) {
  const currentUser = await getCurrentUser();
  if (currentUser?.role !== "ADMIN") {
    return { success: false, error: "ไม่มีสิทธิ์ดำเนินการ" };
  }

  // ป้องกันไม่ให้แอดมินลบบัญชีของตัวเอง
  if (currentUser.id === userId) {
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

    revalidatePath("/admin/staff");
    return { success: true };
  } catch (error) {
    return { success: false, error: "เกิดข้อผิดพลาดในการลบพนักงาน" };
  }
}