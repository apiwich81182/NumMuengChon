"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";

interface Vehicle {
  id: string;
  plateNumber: string;
}

interface User {
  id: string;
  name: string;
}

interface AttendanceFilterBarProps {
  vehicles: Vehicle[];
  users: User[];
  period: string;
  selectedVehicleId: string;
  selectedUserId: string;
  selectedType: string;
  selectedSort: string;
  startDateParam: string;
  endDateParam: string;
}

export default function AttendanceFilterBar({
  vehicles,
  users,
  period,
  selectedVehicleId,
  selectedUserId,
  selectedType,
  selectedSort,
  startDateParam,
  endDateParam,
}: AttendanceFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateFilters = (updates: Record<string, string | undefined>) => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("page"); // เปลี่ยนตัวกรองให้กลับไปหน้าที่ 1

    Object.entries(updates).forEach(([key, val]) => {
      if (!val || val === "ALL" || (key === "sort" && val === "desc")) {
        p.delete(key);
      } else {
        p.set(key, val);
      }
    });

    startTransition(() => {
      router.push(`/admin/attendance?${p.toString()}`, { scroll: false });
    });
  };

  const handlePeriodClick = (periodId: string) => {
    updateFilters({
      period: periodId,
      startDate: undefined,
      endDate: undefined,
    });
  };

  const periodOptions = [
    { id: "today", label: "วันนี้" },
    { id: "this_month", label: "เดือนนี้" },
    { id: "this_year", label: "ปีนี้" },
    { id: "all", label: "ทั้งหมด" },
  ];

  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4 text-xs">
      {/* แถวที่ 1: คันรถ / พนักงาน / หมวดหมู่ / เรียงลำดับ (2 คอลัมน์บนมือถือ, 4 คอลัมน์บนจอใหญ่) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* คันรถ */}
        <div className="space-y-1">
          <label className="text-slate-500 font-medium text-[11px] sm:text-xs">คันรถ</label>
          <select
            value={selectedVehicleId}
            onChange={(e) => updateFilters({ vehicleId: e.target.value })}
            className="w-full p-2 sm:p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
          >
            <option value="">ทั้งหมด</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.plateNumber}
              </option>
            ))}
          </select>
        </div>

        {/* พนักงาน */}
        <div className="space-y-1">
          <label className="text-slate-500 font-medium text-[11px] sm:text-xs">พนักงาน</label>
          <select
            value={selectedUserId}
            onChange={(e) => updateFilters({ userId: e.target.value })}
            className="w-full p-2 sm:p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
          >
            <option value="">ทั้งหมด</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        {/* หมวดหมู่ / ประเภท */}
        <div className="space-y-1">
          <label className="text-slate-500 font-medium text-[11px] sm:text-xs">หมวดหมู่</label>
          <select
            value={selectedType}
            onChange={(e) => updateFilters({ type: e.target.value })}
            className="w-full p-2 sm:p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
          >
            <option value="ALL">ทั้งหมด</option>
            <option value="WORK">เข้างานปกติ</option>
            <option value="LEAVE">ลากิจ</option>
            <option value="SICK">ลาป่วย</option>
          </select>
        </div>

        {/* เรียงลำดับ */}
        <div className="space-y-1">
          <label className="text-slate-500 font-medium text-[11px] sm:text-xs">เรียงลำดับ</label>
          <select
            value={selectedSort}
            onChange={(e) => updateFilters({ sort: e.target.value })}
            className="w-full p-2 sm:p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 outline-none focus:bg-white focus:border-blue-500 cursor-pointer"
          >
            <option value="desc">ล่าสุด → เก่าสุด</option>
            <option value="asc">เก่าสุด → ล่าสุด</option>
          </select>
        </div>
      </div>

      {/* แถวที่ 2: ปุ่มลัดช่วงเวลา + ระบุวันที่ + ปุ่มล้างตัวกรอง & กำลังค้นหา (ค้นหาอัตโนมัติ ไม่มีปุ่มค้นหา) */}
      <div className="pt-3 border-t border-slate-100 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 font-medium whitespace-nowrap text-xs">ช่วงเวลา:</span>
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto no-scrollbar w-full sm:w-auto">
              {periodOptions.map((item) => {
                const isActive =
                  period === item.id && !startDateParam && !endDateParam;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handlePeriodClick(item.id)}
                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap text-center flex-1 sm:flex-initial cursor-pointer ${
                      isActive
                        ? "bg-blue-600 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* หรือระบุวันที่ */}
          <div className="flex items-center gap-1.5 text-slate-400 flex-wrap">
            <span className="text-xs whitespace-nowrap">หรือวันที่:</span>
            <input
              type="date"
              value={startDateParam}
              onChange={(e) =>
                updateFilters({
                  startDate: e.target.value,
                  period: undefined,
                })
              }
              className="p-1.5 px-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 outline-none focus:bg-white text-xs flex-1 sm:flex-initial cursor-pointer"
            />
            <span>-</span>
            <input
              type="date"
              value={endDateParam}
              onChange={(e) =>
                updateFilters({
                  endDate: e.target.value,
                  period: undefined,
                })
              }
              className="p-1.5 px-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 outline-none focus:bg-white text-xs flex-1 sm:flex-initial cursor-pointer"
            />
          </div>
        </div>

        {/* สถานะกำลังค้นหา & ปุ่มล้างตัวกรอง */}
        <div className="flex items-center justify-end gap-3 pt-1 lg:pt-0">
          {isPending && (
            <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium animate-pulse shrink-0">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>กำลังค้นหา...</span>
            </div>
          )}

          <Link
            href="/admin/attendance"
            className="w-full sm:w-auto px-4 py-2 sm:py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-medium transition text-center flex items-center justify-center shrink-0 cursor-pointer"
          >
            ล้างตัวกรอง
          </Link>
        </div>
      </div>
    </div>
  );
}
