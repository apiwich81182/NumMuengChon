import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET_KEY = new TextEncoder().encode(
  process.env.JWT_SECRET || "waste-truck-secret-key-super-secure-change-in-prod"
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("session_token")?.value;

  // ตรวจสอบ JWT Token
  let session: any = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, SECRET_KEY);
      session = payload;
    } catch {
      session = null;
    }
  }

  // 1. ถ้ายังไม่ล็อกอิน แล้วพยายามเข้าหน้าอื่นๆ (ยกเว้นหน้า /login) ให้พาไปหน้า /login
  const isPublicRoute = pathname.startsWith("/login");
  if (!session && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // 2. ถ้าล็อกอินแล้ว แต่พยายามเข้าหน้า /login ซ้ำ ให้ส่งไปหน้าเริ่มต้น
  if (session && isPublicRoute) {
    return NextResponse.redirect(
      new URL(session.role === "ADMIN" ? "/admin/dashboard" : "/jobs/new", request.url)
    );
  }

  // 3. ป้องกันหน้า `/admin` สำหรับพนักงานทั่วไป (DRIVER)
  if (pathname.startsWith("/admin") && session?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/jobs/new", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match ทุก Route ยกเว้นไฟล์ static, api, icon
     */
    "/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icon.png).*)",
  ],
};