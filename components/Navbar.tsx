"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import RealtimeClock from "./RealtimeClock";
import { logout } from "@/actions/auth";
import { toast } from "@/components/Toast";

interface NavbarProps {
  user: {
    id: string;
    name: string;
    role: string;
  } | null;
}

export default function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

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
            หนุ่มเมืองชน
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
              toast.success("ออกจากระบบเรียบร้อยแล้ว");
              router.push("/login");
              router.refresh();
            }}
            className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 rounded-lg transition border border-slate-200 font-medium cursor-pointer"
          >
            ออกจากระบบ
          </button>
        </div>
      </div>

      {/* 2. แถบเมนูนำทาง Desktop (Desktop Navigation Tabs) */}
      <nav className="hidden sm:flex max-w-6xl mx-auto px-4 items-center justify-start gap-6 overflow-x-auto text-xs sm:text-sm font-medium">
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

        {isAdmin && (
          <>
            <div className="h-4 w-[1px] bg-slate-200 hidden sm:block" />

            <Link
              href="/admin/dashboard"
              className={`flex items-center gap-1.5 py-2.5 px-2 border-b-2 transition whitespace-nowrap ${
                pathname === "/admin/dashboard"
                  ? "text-purple-600 font-bold border-purple-600"
                  : "text-slate-600 border-transparent hover:text-slate-900"
              }`}
            >
              <span>📊</span>
              <span>แดชบอร์ด</span>
            </Link>

            <Link
              href="/admin/reports"
              className={`flex items-center gap-1.5 py-2.5 px-2 border-b-2 transition whitespace-nowrap ${
                pathname.startsWith("/admin/reports")
                  ? "text-purple-600 font-bold border-purple-600"
                  : "text-slate-600 border-transparent hover:text-slate-900"
              }`}
            >
              <span>📈</span>
              <span>รายงาน</span>
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

            <Link
              href="/admin/attendance"
              className={`flex items-center gap-1.5 py-2.5 px-2 border-b-2 transition whitespace-nowrap ${
                pathname.startsWith("/admin/attendance")
                  ? "text-purple-600 font-bold border-purple-600"
                  : "text-slate-600 border-transparent hover:text-slate-900"
              }`}
            >
              <span>📋</span>
              <span>ตรวจเวลาทำงาน</span>
            </Link>

            <Link
              href="/admin/customers"
              className={`flex items-center gap-1.5 py-2.5 px-2 border-b-2 transition whitespace-nowrap ${
                pathname.startsWith("/admin/customers")
                  ? "text-purple-600 font-bold border-purple-600"
                  : "text-slate-600 border-transparent hover:text-slate-900"
              }`}
            >
              <span>👤</span>
              <span>ลูกค้า</span>
            </Link>

            <Link
              href="/admin/jobs/assign"
              className={`flex items-center gap-1.5 py-2.5 px-2 border-b-2 transition whitespace-nowrap ${
                pathname.startsWith("/admin/jobs/assign")
                  ? "text-purple-600 font-bold border-purple-600"
                  : "text-slate-600 border-transparent hover:text-slate-900"
              }`}
            >
              <span>📝</span>
              <span>จ่ายงาน</span>
            </Link>
          </>
        )}
      </nav>

      {/* 3. แถบเมนูย่อยของแอดมินบนมือถือ (Mobile Admin Sub-bar) แสดงเฉพาะเมื่ออยู่ในหน้า /admin/* */}
      {isAdmin && pathname.startsWith("/admin") && (
        <div className="sm:hidden flex items-center gap-2 overflow-x-auto px-3 py-2 bg-purple-50/70 border-b border-purple-100 text-xs font-semibold no-scrollbar">
          <Link
            href="/admin/dashboard"
            className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition ${
              pathname === "/admin/dashboard"
                ? "bg-purple-600 text-white shadow-xs"
                : "text-purple-800 hover:bg-purple-100"
            }`}
          >
            📊 แดชบอร์ด
          </Link>
          <Link
            href="/admin/reports"
            className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition ${
              pathname.startsWith("/admin/reports")
                ? "bg-purple-600 text-white shadow-xs"
                : "text-purple-800 hover:bg-purple-100"
            }`}
          >
            📈 รายงาน
          </Link>
          <Link
            href="/admin/vehicles"
            className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition ${
              pathname.startsWith("/admin/vehicles")
                ? "bg-purple-600 text-white shadow-xs"
                : "text-purple-800 hover:bg-purple-100"
            }`}
          >
            🚚 จัดการรถ
          </Link>
          <Link
            href="/admin/staff"
            className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition ${
              pathname.startsWith("/admin/staff")
                ? "bg-purple-600 text-white shadow-xs"
                : "text-purple-800 hover:bg-purple-100"
            }`}
          >
            👥 จัดการคน
          </Link>
          <Link
            href="/admin/attendance"
            className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition ${
              pathname.startsWith("/admin/attendance")
                ? "bg-purple-600 text-white shadow-xs"
                : "text-purple-800 hover:bg-purple-100"
            }`}
          >
            📋 ตรวจเวลา
          </Link>
          <Link
            href="/admin/customers"
            className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition ${
              pathname.startsWith("/admin/customers")
                ? "bg-purple-600 text-white shadow-xs"
                : "text-purple-800 hover:bg-purple-100"
            }`}
          >
            👤 ลูกค้า
          </Link>
          <Link
            href="/admin/jobs/assign"
            className={`px-2.5 py-1 rounded-lg whitespace-nowrap transition ${
              pathname.startsWith("/admin/jobs/assign")
                ? "bg-purple-600 text-white shadow-xs"
                : "text-purple-800 hover:bg-purple-100"
            }`}
          >
            📝 จ่ายงาน
          </Link>
        </div>
      )}
    </header>
  );
}