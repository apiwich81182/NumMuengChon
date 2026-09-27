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

interface ExpenseFilterBarProps {
  vehicles: Vehicle[];
  users: User[];
  isAdmin: boolean;
  period: string;
  selectedVehicleId: string;
  selectedUserId: string;
  selectedCategory: string;
  selectedSort: string;
  startDateParam: string;
  endDateParam: string;
}

export default function ExpenseFilterBar({
  vehicles,
  users,
  isAdmin,
  period,
  selectedVehicleId,
  selectedUserId,
  selectedCategory,
  selectedSort,
  startDateParam,
  endDateParam,
}: ExpenseFilterBarProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const updateFilters = (updates: Record<string, string | undefined>) => {
    const p = new URLSearchParams(searchParams.toString());
    p.delete("page"); // Reset to page 1 on filter change

    Object.entries(updates).forEach(([key, val]) => {
      if (!val || val === "ALL" || (key === "sort" && val === "desc")) {
        p.delete(key);
      } else {
        p.set(key, val);
      }
    });

    startTransition(() => {
      router.push(`/expenses?${p.toString()}`, { scroll: false });
    });
  };

  const handlePeriodClick = (periodId: string) => {
    updateFilters({
      period: periodId,
      startDate: undefined,
      endDate: undefined,
    });
  };

  const hasAdvancedFilters = Boolean(
    selectedVehicleId ||
      selectedUserId ||
      (selectedCategory && selectedCategory !== "ALL") ||
      selectedSort !== "desc" ||
      startDateParam ||
      endDateParam
  );

  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
      {/* แถวบน: ปุ่มลัดช่วงเวลา + Loading Indicator */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 no-scrollbar">
        <div className="flex items-center gap-1.5 flex-nowrap">
          <span className="text-slate-500 font-medium whitespace-nowrap text-xs">ช่วงเวลา:</span>
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0 text-xs">
            {[
              { id: "today", label: "วันนี้" },
              { id: "this_month", label: "เดือนนี้" },
              { id: "this_year", label: "ปีนี้" },
              { id: "all", label: "ทั้งหมด" },
            ].map((item) => {
              const isActive =
                period === item.id && !startDateParam && !endDateParam;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handlePeriodClick(item.id)}
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
        </div>

        {isPending && (
          <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium animate-pulse shrink-0">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>กำลังกรอง...</span>
          </div>
        )}
      </div>

      {/* แถบตัวกรองละเอียด (พับเก็บได้) */}
      <details open={hasAdvancedFilters} className="group pt-2 border-t border-slate-100">
        <summary className="flex items-center justify-between cursor-pointer list-none py-1 text-slate-600 hover:text-slate-900 font-semibold select-none text-xs">
          <span className="flex items-center gap-1.5">
            <span>🔍</span>
            <span>ตัวกรองเพิ่มเติม</span>
            {hasAdvancedFilters && (
              <span className="text-[10px] px-2 py-0.5 bg-rose-50 text-rose-700 rounded-full font-bold">
                เปิดใช้งานอยู่
              </span>
            )}
          </span>
          <span className="text-slate-400 group-open:rotate-180 transition-transform text-xs">
            ▼
          </span>
        </summary>

        <div className="pt-3 space-y-4 text-xs">
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 ${
              isAdmin ? "lg:grid-cols-4" : "lg:grid-cols-3"
            } gap-3`}
          >
            {/* คันรถ */}
            <div className="space-y-1">
              <label className="text-slate-500 font-medium">คันรถ</label>
              <select
                value={selectedVehicleId}
                onChange={(e) => updateFilters({ vehicleId: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 outline-none focus:bg-white focus:border-rose-500 cursor-pointer"
              >
                <option value="">ทั้งหมด</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plateNumber}
                  </option>
                ))}
              </select>
            </div>

            {/* กรองพนักงาน (แสดงเฉพาะแอดมิน) */}
            {isAdmin && (
              <div className="space-y-1">
                <label className="text-slate-500 font-medium">พนักงาน</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => updateFilters({ userId: e.target.value })}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 outline-none focus:bg-white focus:border-rose-500 cursor-pointer"
                >
                  <option value="">ทั้งหมด</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* หมวดหมู่ */}
            <div className="space-y-1">
              <label className="text-slate-500 font-medium">หมวดหมู่</label>
              <select
                value={selectedCategory}
                onChange={(e) => updateFilters({ category: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 outline-none focus:bg-white focus:border-rose-500 cursor-pointer"
              >
                <option value="ALL">ทั้งหมด</option>
                <option value="FUEL">ค่าน้ำมัน</option>
                <option value="DISPOSAL_FEE">ค่าจุดทิ้งของเสีย</option>
                <option value="MAINTENANCE">ค่าซ่อมบำรุง</option>
                {isAdmin && <option value="SALARY">ค่าแรง / เงินเดือน</option>}
                <option value="OTHER">อื่นๆ</option>
              </select>
            </div>

            {/* เรียงลำดับ */}
            <div className="space-y-1">
              <label className="text-slate-500 font-medium">เรียงลำดับ</label>
              <select
                value={selectedSort}
                onChange={(e) => updateFilters({ sort: e.target.value })}
                className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 outline-none focus:bg-white focus:border-rose-500 cursor-pointer"
              >
                <option value="desc">ล่าสุด → เก่าสุด</option>
                <option value="asc">เก่าสุด → ล่าสุด</option>
              </select>
            </div>
          </div>

          {/* ระบุวันที่ + ปุ่มล้างตัวกรอง (เอาปุ่มค้นหาออก) */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-slate-500 flex-wrap">
              <span className="text-xs">ระบุวันที่:</span>
              <input
                type="date"
                value={startDateParam}
                onChange={(e) =>
                  updateFilters({
                    startDate: e.target.value,
                    period: undefined,
                  })
                }
                className="p-1.5 px-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 outline-none focus:bg-white text-xs cursor-pointer"
              />
              <span>ถึง</span>
              <input
                type="date"
                value={endDateParam}
                onChange={(e) =>
                  updateFilters({
                    endDate: e.target.value,
                    period: undefined,
                  })
                }
                className="p-1.5 px-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 outline-none focus:bg-white text-xs cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <Link
                href="/expenses"
                className="flex-1 sm:flex-none text-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-medium transition cursor-pointer"
              >
                ล้างตัวกรอง
              </Link>
            </div>
          </div>
        </div>
      </details>
    </div>
  );
}
