"use server";

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { setSession, removeSession } from "@/lib/auth";

// 1. ฟังก์ชัน Login
export async function login(formData: FormData) {
  try {
    const phone = formData.get("phone") as string;
    const password = formData.get("password") as string;

    if (!phone || !password) {
      return { success: false, error: "กรุณากรอกเบอร์โทรและรหัสผ่าน" };
    }

    const user = await prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      return { success: false, error: "เบอร์โทรหรือรหัสผ่านไม่ถูกต้อง" };
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return { success: false, error: "เบอร์โทรหรือรหัสผ่านไม่ถูกต้อง" };
    }

    // เรียก setSession จาก lib/auth.ts (สร้าง JWT ด้วย jose + บันทึกคุกกี้ session_token)
    await setSession({
      id: user.id,
      phone: user.phone,
      name: user.name,
      role: user.role as "ADMIN" | "DRIVER",
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "เกิดข้อผิดพลาดในการเข้าสู่ระบบ",
    };
  }
}

// 2. ฟังก์ชัน Logout
export async function logout() {
  await removeSession();
  return { success: true };
}