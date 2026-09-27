"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

interface Vehicle {
  id: string;
  plateNumber: string;
}

interface ReportsFilterBarProps {
  vehicles: Vehicle[];
  period: string;
  vehicleId: string;
  targetYear: number;
  targetMonth: number;
  startDateParam: string;
  endDateParam: string;
  monthNames: readonly string[];
}

export default function ReportsFilterBar({
  vehicles,
  period,
  vehicleId,
  targetYear,
  targetMonth,
  startDateParam,
  endDateParam,
  monthNames,
}: ReportsFilterBarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const updateFilters = (updates: Record<string, string | number | undefined>) => {
    const current: Record<string, string> = {
      period,
    };
    if (vehicleId) current.vehicleId = vehicleId;
    if (period === "yearly") current.year = String(targetYear);
    if (period === "monthly") {
      current.year = String(targetYear);
      current.month = String(targetMonth);
    }
    if (period === "custom") {
      if (startDateParam) current.startDate = startDateParam;
      if (endDateParam) current.endDate = endDateParam;
    }

    const merged = { ...current, ...updates };
    const p = new URLSearchParams();

    Object.entries(merged).forEach(([key, val]) => {
      if (val !== undefined && val !== "") {
        p.set(key, String(val));
      }
    });

    startTransition(() => {
      router.push(`/admin/reports?${p.toString()}`, { scroll: false });
    });
  };

  const handlePeriodChange = (newPeriod: string) => {
    const p = new URLSearchParams();
    p.set("period", newPeriod);
    if (vehicleId) p.set("vehicleId", vehicleId);

    if (newPeriod === "yearly") {
      p.set("year", String(targetYear));
    } else if (newPeriod === "monthly") {
      p.set("year", String(targetYear));
      p.set("month", String(targetMonth));
    } else if (newPeriod === "custom") {
      if (startDateParam) p.set("startDate", startDateParam);
      if (endDateParam) p.set("endDate", endDateParam);
    }

    startTransition(() => {
      router.push(`/admin/reports?${p.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs">
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* แถบเลือกประเภทช่วงเวลา */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 font-semibold overflow-x-auto no-scrollbar w-full md:w-fit">
          {[
            { id: "weekly", label: "📅 รายสัปดาห์" },
            { id: "monthly", label: "🗓️ รายเดือน" },
            { id: "yearly", label: "📆 รายปี" },
            { id: "custom", label: "⚙️ เลือกช่วงเอง" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handlePeriodChange(item.id)}
              className={`flex-1 sm:flex-initial text-center px-3 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer ${
                period === item.id
                  ? "bg-white text-slate-900 shadow-sm font-bold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* เลือกรถ */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          {isPending && (
            <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium animate-pulse shrink-0">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span className="hidden sm:inline">กำลังประมวลผล...</span>
            </div>
          )}
          <select
            value={vehicleId}
            onChange={(e) => updateFilters({ vehicleId: e.target.value })}
            className="w-full md:w-56 p-2.5 sm:p-2 border border-slate-200 rounded-xl bg-slate-50 font-medium text-slate-800 outline-none focus:border-blue-500 cursor-pointer"
          >
            <option value="">ทุกคันรถ (ภาพรวม)</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plateNumber}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* แถวล่าง: ระบุเงื่อนไขตามประเภทช่วงเวลา (กรองอัตโนมัติ ไม่มีปุ่มกรองข้อมูล) */}
      <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="w-full sm:w-auto">
          {period === "weekly" && (
            <span className="text-slate-500 font-medium">ย้อนหลัง 7 วัน นับจากปัจจุบัน (อัปเดตอัตโนมัติ)</span>
          )}

          {period === "monthly" && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-600 font-medium">ระบุเดือน/ปี:</span>
              <select
                value={targetMonth}
                onChange={(e) => updateFilters({ month: Number(e.target.value) })}
                className="p-2 sm:p-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 outline-none flex-1 sm:flex-none cursor-pointer"
              >
                {monthNames.map((m, idx) => (
                  <option key={idx + 1} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <input
                type="number"
                value={targetYear}
                onChange={(e) => updateFilters({ year: Number(e.target.value) || targetYear })}
                className="w-24 sm:w-20 p-2 sm:p-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 outline-none flex-1 sm:flex-none cursor-pointer"
              />
            </div>
          )}

          {period === "yearly" && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-600 font-medium">ระบุปี (ค.ศ.):</span>
              <input
                type="number"
                value={targetYear}
                onChange={(e) => updateFilters({ year: Number(e.target.value) || targetYear })}
                className="w-24 p-2 sm:p-1.5 border border-slate-200 rounded-lg bg-slate-50 font-medium text-slate-800 outline-none cursor-pointer"
              />
              <span className="text-slate-400">(พ.ศ. {targetYear + 543})</span>
            </div>
          )}

          {period === "custom" && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-slate-600 font-medium whitespace-nowrap">จาก:</span>
                <input
                  type="date"
                  value={startDateParam}
                  onChange={(e) => updateFilters({ startDate: e.target.value })}
                  className="p-2 sm:p-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 outline-none w-full sm:w-auto cursor-pointer"
                />
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-slate-400 whitespace-nowrap sm:inline">ถึง:</span>
                <input
                  type="date"
                  value={endDateParam}
                  onChange={(e) => updateFilters({ endDate: e.target.value })}
                  className="p-2 sm:p-1.5 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 outline-none w-full sm:w-auto cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
