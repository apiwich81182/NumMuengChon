"use client";

import { usePathname } from "next/navigation";
import Sidebar from "@/components/Sidebar";

interface AppShellProps {
  user: {
    id: string;
    name: string;
    role: string;
  } | null;
  children: React.ReactNode;
}

export default function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();

  // หน้า Landing page และ Login จะแสดงแบบเต็มจอ Full-width เสมอ ไม่มีแถบ Sidebar ด้านข้าง
  const isPublicStandalone = pathname === "/" || pathname === "/login";

  if (!user || isPublicStandalone) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col min-w-0 pb-8">
        {children}
      </div>
    </div>
  );
}
