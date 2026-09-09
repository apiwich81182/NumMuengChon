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
  } catch (error) {
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
export async function getCurrentUser(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("session_token")?.value;
  if (!token) return null;
  return await decrypt(token);
}

// 5. ออกจากระบบ (Logout)
export async function removeSession() {
  const cookieStore = await cookies();
  cookieStore.delete("session_token");
}