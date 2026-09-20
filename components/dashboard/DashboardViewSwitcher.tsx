"use client";

import React from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface DashboardViewSwitcherProps {
  overviewContent: React.ReactNode;
  calendarContent: React.ReactNode;
  defaultTab?: "overview" | "calendar";
}

export default function DashboardViewSwitcher({
  overviewContent,
  calendarContent,
  defaultTab = "overview",
}: DashboardViewSwitcherProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const tabParam = searchParams.get("tab") as "overview" | "calendar" | null;
  const activeTab: "overview" | "calendar" =
    tabParam === "calendar" || tabParam === "overview" ? tabParam : defaultTab;

  const handleTabChange = (newTab: "overview" | "calendar") => {
    const params = new URLSearchParams(searchParams.toString());
    if (newTab === "calendar") {
      params.set("tab", "calendar");
    } else {
      params.delete("tab");
    }
    const newQuery = params.toString();
    router.replace(`/admin/dashboard${newQuery ? `?${newQuery}` : ""}`, { scroll: false });
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* 🌟 Segmented Tab Switcher Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        <div className="inline-flex bg-slate-200/80 p-1 rounded-2xl w-full sm:w-auto shadow-inner">
          <button
            type="button"
            onClick={() => handleTabChange("overview")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 py-2 px-4 sm:px-6 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === "overview"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>📊</span>
            <span>ภาพรวมและหน้างาน</span>
          </button>
          <button
            type="button"
            onClick={() => handleTabChange("calendar")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 py-2 px-4 sm:px-6 rounded-xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              activeTab === "calendar"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>📅</span>
            <span>ปฏิทินรายได้สุทธิ</span>
          </button>
        </div>

        {/* Tab Context Hint */}
        <div className="text-xs text-slate-500 hidden sm:block">
          {activeTab === "overview"
            ? "สรุปตัวเลขภาพรวม รายได้แยกคัน ประสิทธิภาพพนักงาน และลงเวลา"
            : "วิเคราะห์ผลประกอบการกำไร-ขาดทุน และจำนวนงานรายวันตามปฏิทิน"}
        </div>
      </div>

      {/* 🌟 Tab Contents */}
      <div key="tab-content-overview" className={activeTab === "overview" ? "block" : "hidden"}>
        {overviewContent}
      </div>
      <div key="tab-content-calendar" className={activeTab === "calendar" ? "block" : "hidden"}>
        {calendarContent}
      </div>
    </div>
  );
}
