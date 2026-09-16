"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface BottomNavProps {
  user: {
    id: string;
    name: string;
    role: string;
  } | null;
}

export default function BottomNav({ user }: BottomNavProps) {
  const pathname = usePathname();

  if (!user || pathname === "/login") {
    return null;
  }

  const isAdmin = user.role === "ADMIN";

  const navItems = [
    {
      href: "/jobs/new",
      label: "ส่งงาน",
      icon: "🚛",
      isActive: pathname === "/jobs/new",
    },
    {
      href: "/jobs",
      label: "รายการงาน",
      icon: "📋",
      isActive: pathname === "/jobs",
    },
    {
      href: "/expenses",
      label: "รายจ่าย",
      icon: "⛽",
      isActive: pathname.startsWith("/expenses"),
    },
    ...(isAdmin
      ? [
          {
            href: "/admin/dashboard",
            label: "แอดมิน",
            icon: "📊",
            isActive: pathname.startsWith("/admin"),
          },
        ]
      : []),
  ];

  return (
    <nav
      aria-label="เมนูหลักบนมือถือ"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-slate-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] sm:hidden pb-[env(safe-area-inset-bottom)]"
    >
      <div className="flex items-stretch justify-around px-1 h-14">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex-1 flex flex-col items-center justify-center py-1 transition-all select-none ${
              item.isActive
                ? "text-blue-600 font-bold"
                : "text-slate-500 hover:text-slate-800 font-medium"
            }`}
          >
            <span className={`text-lg leading-none transition-transform ${item.isActive ? "scale-110" : ""}`}>
              {item.icon}
            </span>
            <span className={`text-[10px] mt-1 ${item.isActive ? "text-blue-600 font-bold" : "text-slate-600"}`}>
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}

