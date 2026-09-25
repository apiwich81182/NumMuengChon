"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { logout } from "@/actions/auth";
import { toast } from "@/components/Toast";
import RealtimeClock from "./RealtimeClock";
import {
  Truck,
  ClipboardList,
  Fuel,
  Clock,
  LayoutDashboard,
  CalendarCheck,
  Users,
  BarChart3,
  UserCog,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  LogOut,
  User,
  ShieldCheck,
} from "lucide-react";

interface SidebarProps {
  user: {
    id: string;
    name: string;
    role: string;
  } | null;
}

interface MenuItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  badge?: string;
  badgeColor?: string;
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

export default function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  // สถานะพับ/ขยาย Sidebar บนคอมพิวเตอร์
  const [isCollapsed, setIsCollapsed] = useState(false);
  // สถานะเปิด/ปิด Drawer บนมือถือ
  const [mobileOpen, setMobileOpen] = useState(false);

  // อ่านการตั้งค่าจาก localStorage ตอนเปิดเว็บ
  useEffect(() => {
    try {
      const saved = localStorage.getItem("waste_truck_sidebar_collapsed");
      if (saved !== null) {
        setIsCollapsed(saved === "true");
      }
    } catch {
      // ignore
    }
  }, []);

  // บันทึกลง localStorage เมื่อมีการสลับ
  function toggleCollapse() {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("waste_truck_sidebar_collapsed", String(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  // ปิด Drawer มือถือทุกครั้งที่เปลี่ยนหน้า
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (!user || pathname === "/login") {
    return null;
  }

  const isAdmin = user.role === "ADMIN";

  // โครงสร้างเมนูแบ่งกลุ่ม
  const menuGroups: MenuGroup[] = [
    {
      title: "งานหน้างาน",
      items: [
        {
          href: "/jobs/new",
          label: "ส่งงานทันที",
          icon: <Truck className="w-5 h-5 shrink-0" />,
          isActive: pathname === "/jobs/new",
        },
        {
          href: "/jobs",
          label: "รายการงาน",
          icon: <ClipboardList className="w-5 h-5 shrink-0" />,
          isActive: pathname === "/jobs" || (pathname.startsWith("/jobs/") && pathname !== "/jobs/new"),
        },
        {
          href: "/expenses",
          label: "บันทึกรายจ่าย",
          icon: <Fuel className="w-5 h-5 shrink-0" />,
          isActive: pathname.startsWith("/expenses"),
        },
      ],
    },
    ...(isAdmin
      ? [
          {
            title: "บริหาร & จัดการ",
            items: [
              {
                href: "/admin/dashboard",
                label: "แดชบอร์ดสรุปผล",
                icon: <LayoutDashboard className="w-5 h-5 shrink-0" />,
                isActive: pathname === "/admin/dashboard",
              },
              {
                href: "/admin/jobs/assign",
                label: "จ่ายงาน",
                icon: <CalendarCheck className="w-5 h-5 shrink-0" />,
                isActive: pathname.startsWith("/admin/jobs/assign"),
              },
              {
                href: "/admin/customers",
                label: "สมุดรายชื่อลูกค้า",
                icon: <Users className="w-5 h-5 shrink-0" />,
                isActive: pathname.startsWith("/admin/customers"),
              },
              {
                href: "/admin/reports",
                label: "รายงาน & สถิติ",
                icon: <BarChart3 className="w-5 h-5 shrink-0" />,
                isActive: pathname.startsWith("/admin/reports"),
              },
            ],
          },
          {
            title: "ระบบ & บุคลากร",
            items: [
              {
                href: "/admin/vehicles",
                label: "จัดการรถดูดส้วม",
                icon: <Truck className="w-5 h-5 shrink-0" />,
                isActive: pathname.startsWith("/admin/vehicles"),
              },
              {
                href: "/admin/staff",
                label: "จัดการพนักงาน",
                icon: <UserCog className="w-5 h-5 shrink-0" />,
                isActive: pathname.startsWith("/admin/staff"),
              },
              {
                href: "/admin/attendance",
                label: "ตรวจเวลาทำงาน",
                icon: <ClipboardList className="w-5 h-5 shrink-0" />,
                isActive: pathname.startsWith("/admin/attendance"),
              },
            ],
          },
        ]
      : []),
  ];

  async function handleLogout() {
    await logout();
    toast.success("ออกจากระบบเรียบร้อยแล้ว");
    router.push("/login");
    router.refresh();
  }

  // เนื้อหาภายใน Sidebar (ใช้ร่วมกันทั้ง Desktop และ Mobile Drawer)
  const renderSidebarContent = (isMobileView = false) => {
    const collapsed = isMobileView ? false : isCollapsed;

    return (
      <div className="flex flex-col h-full bg-[#0c1322] text-slate-300 select-none">
        {/* 1. ส่วนหัว Sidebar (Logo & Brand Name) */}
        <div
          className={`h-16 flex items-center border-b border-slate-800/80 px-4 transition-all duration-300 ${
            collapsed ? "justify-center" : "justify-between"
          }`}
        >
          <Link
            href={isAdmin ? "/admin/dashboard" : "/jobs"}
            className="flex items-center gap-3 overflow-hidden group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-xl shadow-md text-white shrink-0 group-hover:scale-105 transition-transform">
              🚛
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-extrabold text-white text-base tracking-tight truncate leading-tight">
                  หนุ่มเมืองชน
                </span>
                <span className="text-[10px] text-slate-400 font-medium truncate flex items-center gap-1">
                  <span>Waste Truck System</span>
                </span>
              </div>
            )}
          </Link>

          {/* ปุ่มสลับย่อ/ขยาย บนจอคอมพิวเตอร์ */}
          {!isMobileView && (
            <button
              onClick={toggleCollapse}
              className={`p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer ${
                collapsed ? "hidden" : "block"
              }`}
              title={collapsed ? "ขยายแถบเมนู" : "ย่อแถบเมนู"}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          {/* ปุ่มปิด Drawer บนจอมือถือ */}
          {isMobileView && (
            <button
              onClick={() => setMobileOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* ปุ่มย่อแถบเมนูเมื่ออยู่ในโหมด Collapsed */}
        {!isMobileView && collapsed && (
          <div className="py-2 flex justify-center border-b border-slate-800/50">
            <button
              onClick={toggleCollapse}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              title="ขยายแถบเมนู"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 2. รายการเมนูหลัก (Scrollable Navigation) */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 no-scrollbar">
          {menuGroups.map((group, groupIdx) => (
            <div key={group.title || groupIdx} className="space-y-1.5">
              {/* ชื่อหมวดหมู่ */}
              {!collapsed ? (
                <div className="px-3 text-[11px] font-bold text-slate-500 tracking-wider uppercase">
                  {group.title}
                </div>
              ) : (
                <div className="w-6 h-[1px] bg-slate-800 mx-auto my-2" />
              )}

              {/* รายการปุ่มลิงก์ */}
              <div className="space-y-1">
                {group.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 ${
                      item.isActive
                        ? "bg-white text-slate-900 font-bold shadow-md shadow-black/10"
                        : "text-slate-400 hover:text-white hover:bg-slate-800/60 font-medium"
                    } ${collapsed ? "justify-center px-2" : ""}`}
                    title={collapsed ? item.label : undefined}
                  >
                    <span
                      className={`transition-transform group-hover:scale-110 ${
                        item.isActive ? "text-blue-600" : "text-slate-400 group-hover:text-white"
                      }`}
                    >
                      {item.icon}
                    </span>

                    {!collapsed && (
                      <span className="text-sm truncate flex-1">{item.label}</span>
                    )}

                    {!collapsed && item.isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0" />
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* 3. ส่วนท้าย (Footer): ข้อมูลผู้ใช้, นาฬิกา, ปุ่มออกจากระบบ */}
        <div className="p-3 border-t border-slate-800/80 bg-[#090e1a]/80 space-y-3">
          {/* นาฬิกา Realtime (แสดงเมื่อขยาย) */}
          {!collapsed && (
            <div className="px-1">
              <div className="py-2.5 px-3 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-center">
                <RealtimeClock />
              </div>
            </div>
          )}

          {/* การ์ดโปรไฟล์ผู้ใช้ */}
          <div
            className={`flex items-center gap-2.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800/80 ${
              collapsed ? "justify-center p-1.5" : "justify-between"
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-sm shrink-0">
                {user.name ? user.name.slice(0, 1).toUpperCase() : <User className="w-4 h-4" />}
              </div>

              {!collapsed && (
                <div className="flex flex-col min-w-0">
                  <span className="text-xs font-bold text-white truncate">{user.name}</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <ShieldCheck className="w-3 h-3 text-purple-400 shrink-0" />
                    <span className="text-[10px] text-purple-300 font-semibold truncate">
                      {isAdmin ? "ผู้ดูแลระบบ" : "พนักงาน"}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* ปุ่มออกจากระบบ (แสดงปุ่มไอคอนเมื่อขยาย) */}
            {!collapsed && (
              <button
                type="button"
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer shrink-0"
                title="ออกจากระบบ"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* ปุ่มออกจากระบบโหมดพับไอคอน */}
          {collapsed && (
            <button
              type="button"
              onClick={handleLogout}
              className="w-full py-2 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
              title="ออกจากระบบ"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      {/* 🌟 1. Top Header ขนาดกะทัดรัดบนมือถือ/แท็บเล็ต (หน้าจอ < lg) */}
      <header className="lg:hidden sticky top-0 z-30 h-14 bg-[#0c1322] border-b border-slate-800 text-white flex items-center justify-between px-4 shadow-sm">
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-2 -ml-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
            aria-label="เปิดเมนู"
          >
            <Menu className="w-5 h-5" />
          </button>

          <Link href={isAdmin ? "/admin/dashboard" : "/jobs"} className="flex items-center gap-2">
            <span className="text-xl">🚛</span>
            <span className="font-extrabold text-white text-base tracking-tight">หนุ่มเมืองชน</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
              isAdmin
                ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                : "bg-blue-500/20 text-blue-300 border-blue-500/30"
            }`}
          >
            {isAdmin ? "แอดมิน" : "พนักงาน"}
          </span>

          <button
            type="button"
            onClick={handleLogout}
            className="p-1.5 text-slate-400 hover:text-rose-400 transition cursor-pointer"
            title="ออกจากระบบ"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 🌟 2. Mobile Drawer (สไลด์ออกมาจากซ้ายบนหน้าจอ < lg) */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* พื้นหลังมืดโปร่งแสง (Backdrop) */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in"
            onClick={() => setMobileOpen(false)}
          />

          {/* ตัว Sidebar Drawer */}
          <div className="relative w-72 max-w-[85vw] h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}

      {/* 🌟 3. Desktop Sticky Sidebar (หน้าจอ >= lg) */}
      <aside
        className={`hidden lg:block shrink-0 sticky top-0 h-screen z-30 transition-all duration-300 ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {renderSidebarContent(false)}
      </aside>
    </>
  );
}
