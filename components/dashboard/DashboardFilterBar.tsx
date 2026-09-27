"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface DashboardFilterBarProps {
  period: string;
  startDate: string;
  endDate: string;
}

export default function DashboardFilterBar({
  period,
  startDate,
  endDate,
}: DashboardFilterBarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handlePeriodChange = (newPeriod: string) => {
    startTransition(() => {
      router.push(`/admin/dashboard?period=${newPeriod}`, { scroll: false });
    });
  };

  const handleDateChange = (newStart?: string, newEnd?: string) => {
    const s = newStart !== undefined ? newStart : startDate;
    const e = newEnd !== undefined ? newEnd : endDate;

    const p = new URLSearchParams();
    if (s) p.set("startDate", s);
    if (e) p.set("endDate", e);

    startTransition(() => {
      router.push(`/admin/dashboard?${p.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 text-xs">
        {/* ปุ่มช่วงเวลาลัด */}
        <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 no-scrollbar">
          <span className="text-slate-500 font-bold whitespace-nowrap">ช่วงเวลา:</span>
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
            {[
              { id: "today", label: "วันนี้" },
              { id: "this_month", label: "เดือนนี้" },
              { id: "this_year", label: "ปีนี้" },
              { id: "all", label: "ทั้งหมด" },
            ].map((item) => {
              const isActive = period === item.id && !startDate && !endDate;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handlePeriodChange(item.id)}
                  className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg font-semibold transition whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
          {isPending && (
            <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium animate-pulse shrink-0 ml-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>กำลังโหลด...</span>
            </div>
          )}
        </div>

        {/* ช่องระบุวันที่เอง (กรองอัตโนมัติ ไม่มีปุ่มค้นหา) */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-end flex-wrap pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
          <span className="text-slate-400 text-xs">หรือระบุวันที่:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => handleDateChange(e.target.value, undefined)}
            className="p-1.5 px-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 outline-none focus:border-blue-500 focus:bg-white text-xs cursor-pointer"
          />
          <span className="text-slate-400">ถึง</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => handleDateChange(undefined, e.target.value)}
            className="p-1.5 px-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 outline-none focus:border-blue-500 focus:bg-white text-xs cursor-pointer"
          />
          {(startDate || endDate) && (
            <button
              type="button"
              onClick={() => handlePeriodChange("today")}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-medium transition cursor-pointer text-xs"
            >
              ล้างวันที่
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
