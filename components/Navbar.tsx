"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import RealtimeClock from "./RealtimeClock";
import { logout } from "@/actions/auth";

interface NavbarProps {
  user: {
    id: string;
    name: string;
    role: string;
  } | null; // 👈 1. รองรับกรณี user เป็น null
}

export default function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();

  // 👈 2. ถ้ายังไม่ล็อกอิน หรืออยู่ที่หน้า login ไม่ต้องแสดง Navbar
  if (!user || pathname === "/login") {
    return null;
  }

  const isAdmin = user.role === "ADMIN";

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      {/* 1. แถบข้อมูลด้านบน: โลโก้, เวลา Realtime, ข้อมูลผู้ใช้, ปุ่มออกจากระบบ */}
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex items-center justify-between gap-2 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-xl">🚛</span>
          <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg">
            NumMuengChon
          </span>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              isAdmin
                ? "bg-purple-50 text-purple-700 border-purple-200"
                : "bg-blue-50 text-blue-700 border-blue-200"
            }`}
          >
            {isAdmin ? "แอดมิน" : "พนักงาน"}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <RealtimeClock />

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-700 font-medium bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg">
            <span>👤</span>
            <span>{user.name}</span>
          </div>

          <button
            type="button"
            onClick={async () => {
              await logout();
              window.location.href = "/login";
            }}
            className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 rounded-lg transition border border-slate-200 font-medium cursor-pointer"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>

      {/* 2. แถบเมนูนำทาง (Navigation Tabs) */}
      <nav className="max-w-6xl mx-auto px-4 flex items-center justify-around sm:justify-start sm:gap-6 overflow-x-auto text-xs sm:text-sm font-medium">
        <Link
          href="/jobs/new"
          className={`flex items-center gap-1.5 py-2.5 px-2 border-b-2 transition whitespace-nowrap ${
            pathname === "/jobs/new"
              ? "text-blue-600 font-bold border-blue-600"
              : "text-slate-600 border-transparent hover:text-slate-900"
          }`}
        >
          <span>🚛</span>
          <span>ส่งงาน</span>
        </Link>

        <Link
          href="/jobs"
          className={`flex items-center gap-1.5 py-2.5 px-2 border-b-2 transition whitespace-nowrap ${
            pathname === "/jobs"
              ? "text-blue-600 font-bold border-blue-600"
              : "text-slate-600 border-transparent hover:text-slate-900"
          }`}
        >
          <span>📋</span>
          <span>รายการงาน</span>
        </Link>

        <Link
          href="/expenses"
          className={`flex items-center gap-1.5 py-2.5 px-2 border-b-2 transition whitespace-nowrap ${
            pathname.startsWith("/expenses")
              ? "text-rose-600 font-bold border-rose-600"
              : "text-slate-600 border-transparent hover:text-slate-900"
          }`}
        >
          <span>⛽</span>
          <span>รายจ่าย</span>
        </Link>

        <Link
          href="/attendance"
          className={`flex items-center gap-1.5 py-2.5 px-2 border-b-2 transition whitespace-nowrap ${
            pathname.startsWith("/attendance")
              ? "text-blue-600 font-bold border-blue-600"
              : "text-slate-600 border-transparent hover:text-slate-900"
          }`}
        >
          <span>⏰</span>
          <span>ลงเวลา</span>
        </Link>

        {isAdmin && (
          <>
            <div className="h-4 w-[1px] bg-slate-200 hidden sm:block" />

            <Link
              href="/admin/dashboard"
              className={`flex items-center gap-1.5 py-2.5 px-2 border-b-2 transition whitespace-nowrap ${
                pathname.startsWith("/admin/dashboard")
                  ? "text-purple-600 font-bold border-purple-600"
                  : "text-slate-600 border-transparent hover:text-slate-900"
              }`}
            >
              <span>📊</span>
              <span>แดชบอร์ด</span>
            </Link>

            <Link
              href="/admin/vehicles"
              className={`flex items-center gap-1.5 py-2.5 px-2 border-b-2 transition whitespace-nowrap ${
                pathname.startsWith("/admin/vehicles")
                  ? "text-purple-600 font-bold border-purple-600"
                  : "text-slate-600 border-transparent hover:text-slate-900"
              }`}
            >
              <span>🚚</span>
              <span>จัดการรถ</span>
            </Link>

            <Link
              href="/admin/staff"
              className={`flex items-center gap-1.5 py-2.5 px-2 border-b-2 transition whitespace-nowrap ${
                pathname.startsWith("/admin/staff")
                  ? "text-purple-600 font-bold border-purple-600"
                  : "text-slate-600 border-transparent hover:text-slate-900"
              }`}
            >
              <span>👥</span>
              <span>จัดการคน</span>
            </Link>
          </>
        )}
      </nav>
    </header>
  );
}