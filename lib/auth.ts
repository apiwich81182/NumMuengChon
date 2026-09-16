import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { cookies } from "next/headers";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "waste-truck-secret-key-super-secure-change-in-prod"
);

export interface UserSession extends JWTPayload{
  id: string;
  phone: string;
  name: string;
  role: "ADMIN" | "DRIVER";
}

// 1. เข้ารหัสสร้าง JWT Token
export async function encrypt(payload: UserSession) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d") // อายุล็อกอิน 7 วัน
    .sign(SECRET_KEY);
}

// 2. ถอดรหัสตรวจสอบ Token
export async function decrypt(token: string): Promise<UserSession | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY, {
      algorithms: ["HS256"],
    });
    return payload as unknown as UserSession;
  } catch {
    return null;
  }
}

// 3. บันทึก Cookie
export async function setSession(user: UserSession) {
  const token = await encrypt(user);
  const cookieStore = await cookies();
  cookieStore.set("session_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60, // 7 วัน
  });
}

// 4. ดึงข้อมูล User ปัจจุบันจาก Cookie
import { redirect } from "next/navigation";

export async function getCurrentUser(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  if (!token) return null;
  return await decrypt(token);
}

export async function requireUser(): Promise<UserSession> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("กรุณาเข้าสู่ระบบก่อนทำรายการ");
  }
  return user;
}

export async function requireAdmin(): Promise<UserSession> {
  const user = await requireUser();
  if (user.role !== "ADMIN") {
    throw new Error("ไม่มีสิทธิ์ดำเนินการ (เฉพาะผู้ดูแลระบบ)");
  }
  return user;
}

/**
 * Guard สำหรับ Server Actions: ตรวจสอบว่าล็อกอินหรือไม่
 */
export async function requireUserAction(): Promise<
  { success: true; user: UserSession } | { success: false; error: string }
> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" };
  }
  return { success: true, user };
}

/**
 * Guard สำหรับ Server Actions: ตรวจสอบว่ามีสิทธิ์ Admin หรือไม่
 */
export async function requireAdminAction(): Promise<
  { success: true; user: UserSession } | { success: false; error: string }
> {
  const auth = await requireUserAction();
  if (!auth.success) return auth;
  if (auth.user.role !== "ADMIN") {
    return { success: false, error: "ไม่มีสิทธิ์ดำเนินการ (เฉพาะผู้ดูแลระบบ)" };
  }
  return { success: true, user: auth.user };
}

/**
 * Guard สำหรับ Server Components: พาไปหน้า login หากยังไม่ล็อกอิน
 */
export async function requireUserPage(redirectUrl = "/login"): Promise<UserSession> {
  const user = await getCurrentUser();
  if (!user) {
    redirect(redirectUrl);
  }
  return user;
}

/**
 * Guard สำหรับ Server Components: พาไปหน้าเริ่มต้นหากไม่ใช่ Admin
 */
export async function requireAdminPage(redirectUrl = "/jobs"): Promise<UserSession> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    redirect(redirectUrl);
  }
  return user;
}

// 5. ออกจากระบบ (Logout)
export async function removeSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session_token");
}