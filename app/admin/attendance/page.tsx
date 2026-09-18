import { prisma } from "@/lib/prisma";
import { requireAdminPage } from "@/lib/auth";
import Link from "next/link";
import { getDateRange, toDateFilter, toLocalDateKey } from "@/lib/date-range";
import { Prisma } from "@prisma/client";
import Pagination from "@/components/Pagination";
import { getActiveVehicles } from "@/lib/vehicle-service";
import { getStaffAndDrivers } from "@/lib/user-service";
import { formatDateTh, formatTimeTh } from "@/lib/formatters";
import LeaveActionButtons from "./LeaveActionButtons";

export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{
    period?: string; // "today" | "this_month" | "this_year" | "all" | "custom"
    vehicleId?: string;
    userId?: string;
    type?: string; // "ALL" | "WORK" | "LEAVE" | "SICK"
    sort?: string; // "desc" | "asc"
    startDate?: string;
    endDate?: string;
    page?: string;
  }>;
}

export default async function AdminAttendancePage({ searchParams }: PageProps) {
  await requireAdminPage("/jobs");

  const params = await searchParams;
  const now = new Date();
  const period = params.period || (!params.startDate && !params.endDate ? "all" : "custom");
  const selectedVehicleId = params.vehicleId || "";
  const selectedUserId = params.userId || "";
  const selectedType = params.type || "ALL";
  const selectedSort = params.sort || "desc";
  const startDateParam = params.startDate || "";
  const endDateParam = params.endDate || "";
  const currentPage = Math.max(1, Number(params.page) || 1);
  const pageSize = 12;

  const { start, end } = getDateRange({
    period,
    startDate: startDateParam,
    endDate: endDateParam,
    now,
  });

  // เงื่อนไข Filter สำหรับ Query
  const jobWhere: Prisma.JobWhereInput = {};
  const dateFilter = toDateFilter({ start, end });
  if (dateFilter) jobWhere.completedAt = dateFilter;
  if (selectedVehicleId) {
    jobWhere.vehicleId = selectedVehicleId;
  }

  // ดึงข้อมูล Users, Vehicles, Jobs และ Attendance (การลา)
  const [users, vehicles, rawJobs, rawLeaves] = await Promise.all([
    getStaffAndDrivers(),
    getActiveVehicles(),
    prisma.job.findMany({
      where: jobWhere,
      include: { user: true, driver2: true, vehicle: true },
      orderBy: { completedAt: "asc" },
    }),
    prisma.attendance.findMany({
      where: {
        type: { in: ["SICK_LEAVE", "BUSINESS_LEAVE"] },
        ...(dateFilter ? { createdAt: dateFilter } : {}),
      },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // 1. จัดกลุ่มงาน (Jobs) รายวันแยกตามคนขับ
  type DailyWorkRecord = {
    userId: string;
    userName: string;
    dateKey: string;
    dateObj: Date;
    firstTime: Date;
    lastTime: Date;
    jobCount: number;
    vehicles: Set<string>;
  };

  const workMap = new Map<string, DailyWorkRecord>();

  rawJobs.forEach((job) => {
    const jobDate = new Date(job.completedAt || job.createdAt);
    const dateKey = toLocalDateKey(jobDate);
    const plate = job.vehicle?.plateNumber || "";

    // คนขับหลัก
    if (job.userId && job.user) {
      const key = `${job.userId}_${dateKey}`;
      const existing = workMap.get(key);
      if (!existing) {
        workMap.set(key, {
          userId: job.userId,
          userName: job.user.name,
          dateKey,
          dateObj: jobDate,
          firstTime: jobDate,
          lastTime: jobDate,
          jobCount: 1,
          vehicles: new Set(plate ? [plate] : []),
        });
      } else {
        existing.jobCount += 1;
        if (plate) existing.vehicles.add(plate);
        if (jobDate < existing.firstTime) existing.firstTime = jobDate;
        if (jobDate > existing.lastTime) existing.lastTime = jobDate;
      }
    }

    // คนขับผู้ช่วย
    if (job.driver2Id && job.driver2) {
      const key2 = `${job.driver2Id}_${dateKey}`;
      const existing2 = workMap.get(key2);
      if (!existing2) {
        workMap.set(key2, {
          userId: job.driver2Id,
          userName: job.driver2.name,
          dateKey,
          dateObj: jobDate,
          firstTime: jobDate,
          lastTime: jobDate,
          jobCount: 1,
          vehicles: new Set(plate ? [plate] : []),
        });
      } else {
        existing2.jobCount += 1;
        if (plate) existing2.vehicles.add(plate);
        if (jobDate < existing2.firstTime) existing2.firstTime = jobDate;
        if (jobDate > existing2.lastTime) existing2.lastTime = jobDate;
      }
    }
  });

  // 2. รวมตารางงานวิ่ง + รายการลา
  type AttendanceRow = {
    id: string;
    userId: string;
    userName: string;
    type: "WORK" | "LEAVE" | "SICK";
    typeLabel: string;
    dateText: string;
    rawDate: Date;
    checkInText: string;
    checkOutText: string;
    note: string;
    statusLabel: string;
    leaveId?: string;
    isApproved?: boolean;
  };

  const combinedList: AttendanceRow[] = [];

  // เพิ่มข้อมูลที่มาจากการวิ่งงาน
  workMap.forEach((w, key) => {
    const platesText = Array.from(w.vehicles).join(", ");
    combinedList.push({
      id: `work_${key}`,
      userId: w.userId,
      userName: w.userName,
      type: "WORK",
      typeLabel: "เข้างานปกติ",
      dateText: formatDateTh(w.dateObj, { format: "short" }),
      rawDate: w.dateObj,
      checkInText: formatTimeTh(w.firstTime),
      checkOutText:
        w.jobCount > 1
          ? formatTimeTh(w.lastTime)
          : "-",
      note: `วิ่งงานจริง ${w.jobCount} เที่ยว${platesText ? ` (${platesText})` : ""}`,
      statusLabel: "ปกติ",
    });
  });

  // เพิ่มข้อมูลการลา (ถ้าไม่มีการเลือกกรองเจาะจงคันรถ)
  if (!selectedVehicleId) {
    rawLeaves.forEach((leave) => {
      const lDate = new Date(leave.createdAt);
      const isSick = leave.type === "SICK_LEAVE";
      combinedList.push({
        id: `leave_${leave.id}`,
        userId: leave.userId,
        userName: leave.user?.name || "-",
        type: isSick ? "SICK" : "LEAVE",
        typeLabel: isSick ? "ลาป่วย" : "ลากิจ",
        dateText: formatDateTh(lDate, { format: "short" }),
        rawDate: lDate,
        checkInText: "-",
        checkOutText: "-",
        note: leave.note || "-",
        statusLabel: leave.isApproved ? "อนุมัติแล้ว" : "รอดำเนินการ",
        leaveId: leave.id,
        isApproved: leave.isApproved,
      });
    });
  }

  // 3. กรองตาม User, Type และการ Sort
  const filteredList = combinedList
    .filter((item) => {
      if (selectedUserId && item.userId !== selectedUserId) return false;
      if (selectedType !== "ALL" && item.type !== selectedType) return false;
      return true;
    })
    .sort((a, b) => {
      if (selectedSort === "asc") {
        return a.rawDate.getTime() - b.rawDate.getTime();
      }
      return b.rawDate.getTime() - a.rawDate.getTime();
    });

  // 4. Pagination
  const totalItems = filteredList.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const paginatedList = filteredList.slice(startIndex, endIndex);

  const getPageUrl = (pageNumber: number) => {
    const p = new URLSearchParams();
    if (period) p.set("period", period);
    if (selectedVehicleId) p.set("vehicleId", selectedVehicleId);
    if (selectedUserId) p.set("userId", selectedUserId);
    if (selectedType !== "ALL") p.set("type", selectedType);
    if (selectedSort !== "desc") p.set("sort", selectedSort);
    if (startDateParam) p.set("startDate", startDateParam);
    if (endDateParam) p.set("endDate", endDateParam);
    p.set("page", String(pageNumber));
    return `/admin/attendance?${p.toString()}`;
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-800">
      <div className="max-w-6xl mx-auto space-y-5 sm:space-y-6">
        {/* ส่วนหัว */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
              ⏰ บันทึกเวลาของพนักงาน
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              คำนวณการเข้างานอัตโนมัติจากงานที่วิ่งจริง (พบทั้งหมด {totalItems} รายการ)
            </p>
          </div>
          <Link
            href="/admin/dashboard"
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold border border-slate-200 transition shadow-sm text-center flex items-center justify-center gap-1.5"
          >
            📊 ดู Dashboard
          </Link>
        </div>

        {/* แถบตัวกรอง */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <form method="GET" className="space-y-4 text-xs">
            {/* แถวที่ 1: คันรถ / พนักงาน / หมวดหมู่ / เรียงลำดับ (2 คอลัมน์บนมือถือ, 4 คอลัมน์บนจอใหญ่) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
              {/* คันรถ */}
              <div className="space-y-1">
                <label className="text-slate-500 font-medium text-[11px] sm:text-xs">คันรถ</label>
                <select
                  name="vehicleId"
                  defaultValue={selectedVehicleId}
                  className="w-full p-2 sm:p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 outline-none focus:bg-white focus:border-blue-500"
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
                  name="userId"
                  defaultValue={selectedUserId}
                  className="w-full p-2 sm:p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 outline-none focus:bg-white focus:border-blue-500"
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
                  name="type"
                  defaultValue={selectedType}
                  className="w-full p-2 sm:p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 outline-none focus:bg-white focus:border-blue-500"
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
                  name="sort"
                  defaultValue={selectedSort}
                  className="w-full p-2 sm:p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 outline-none focus:bg-white focus:border-blue-500"
                >
                  <option value="desc">ล่าสุด → เก่าสุด</option>
                  <option value="asc">เก่าสุด → ล่าสุด</option>
                </select>
              </div>
            </div>

            {/* แถวที่ 2: ปุ่มลัดช่วงเวลา + ระบุวันที่ + ปุ่มล้าง/ค้นหา */}
            <div className="pt-3 border-t border-slate-100 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 sm:gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-medium whitespace-nowrap text-xs">ช่วงเวลา:</span>
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 overflow-x-auto no-scrollbar w-full sm:w-auto">
                    {[
                      { id: "today", label: "วันนี้" },
                      { id: "this_month", label: "เดือนนี้" },
                      { id: "this_year", label: "ปีนี้" },
                      { id: "all", label: "ทั้งหมด" },
                    ].map((item) => (
                      <Link
                        key={item.id}
                        href={`/admin/attendance?period=${item.id}${
                          selectedVehicleId ? `&vehicleId=${selectedVehicleId}` : ""
                        }${selectedUserId ? `&userId=${selectedUserId}` : ""}${
                          selectedType !== "ALL" ? `&type=${selectedType}` : ""
                        }${selectedSort !== "desc" ? `&sort=${selectedSort}` : ""}`}
                        className={`px-2.5 sm:px-3 py-1.5 rounded-lg font-semibold transition whitespace-nowrap text-center flex-1 sm:flex-initial ${
                          period === item.id && !startDateParam && !endDateParam
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>

                <input type="hidden" name="period" value={period} />

                {/* หรือระบุวันที่ */}
                <div className="flex items-center gap-1.5 text-slate-400 flex-wrap">
                  <span className="text-xs whitespace-nowrap">หรือวันที่:</span>
                  <input
                    type="date"
                    name="startDate"
                    defaultValue={startDateParam}
                    className="p-1.5 px-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 outline-none focus:bg-white text-xs flex-1 sm:flex-initial"
                  />
                  <span>-</span>
                  <input
                    type="date"
                    name="endDate"
                    defaultValue={endDateParam}
                    className="p-1.5 px-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 outline-none focus:bg-white text-xs flex-1 sm:flex-initial"
                  />
                </div>
              </div>

              {/* ปุ่มล้างตัวกรอง & ค้นหา */}
              <div className="grid grid-cols-2 sm:flex items-center gap-2 pt-1 lg:pt-0">
                <Link
                  href="/admin/attendance"
                  className="px-4 py-2.5 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-medium transition text-center flex items-center justify-center"
                >
                  ล้างตัวกรอง
                </Link>
                <button
                  type="submit"
                  className="px-5 py-2.5 sm:py-2 bg-[#0c1322] hover:bg-black text-white font-semibold rounded-xl transition shadow-sm cursor-pointer text-center flex items-center justify-center"
                >
                  ค้นหา
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* มุมมองมือถือ: การ์ดบันทึกเวลา (< md) */}
        <div className="block md:hidden space-y-3">
          {paginatedList.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-400 text-xs">
              ไม่พบประวัติการเข้างานหรือการลาตามเงื่อนไขที่เลือก
            </div>
          ) : (
            paginatedList.map((row) => (
              <div
                key={row.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-4 shadow-sm space-y-3"
              >
                {/* แถวบน: ชื่อพนักงาน + วันที่ + ประเภท */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div>
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      👤 {row.userName}
                    </div>
                    <div className="text-[11px] text-slate-400 font-medium mt-0.5">
                      📅 {row.dateText}
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold whitespace-nowrap ${
                      row.type === "WORK"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : row.type === "LEAVE"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-rose-50 text-rose-700 border border-rose-200"
                    }`}
                  >
                    {row.typeLabel}
                  </span>
                </div>

                {/* แถวกลาง: เวลาเข้า-ออกงาน (กรณีเข้างาน) หรือเหตุผลการลา */}
                {row.type === "WORK" ? (
                  <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 block font-medium">เข้างาน (เที่ยวแรก)</span>
                      <span className="font-mono font-bold text-emerald-600 text-sm">
                        {row.checkInText}
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[10px] text-slate-400 block font-medium">ออกงาน (เที่ยวสุดท้าย)</span>
                      <span className="font-mono font-bold text-rose-500 text-sm">
                        {row.checkOutText}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-50/50 p-2.5 rounded-xl border border-amber-100/80 text-xs space-y-1">
                    <span className="text-[10px] text-amber-600 font-medium block">เหตุผลการลา:</span>
                    <p className="text-slate-700">{row.note}</p>
                  </div>
                )}

                {/* หมายเหตุงานวิ่ง (ถ้ามี) */}
                {row.type === "WORK" && (
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <span className="text-slate-400">🚛</span>
                    <span>{row.note}</span>
                  </div>
                )}

                {/* แถวล่าง: สถานะการอนุมัติ / ปุ่มจัดการการลา */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                  <span className="text-slate-400 text-[11px]">สถานะ:</span>
                  {row.leaveId ? (
                    <LeaveActionButtons
                      attendanceId={row.leaveId}
                      isApproved={Boolean(row.isApproved)}
                    />
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold border bg-emerald-50 text-emerald-700 border-emerald-200">
                      {row.statusLabel}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* มุมมอง Desktop: ตารางเต็ม (>= md) */}
        <div className="hidden md:block bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 whitespace-nowrap">พนักงาน</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">ประเภท</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">วันที่/เวลาบันทึก</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap text-emerald-600">เข้างาน</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap text-rose-500">ออกงาน</th>
                  <th className="py-3.5 px-4 whitespace-nowrap">หมายเหตุ / เหตุผล</th>
                  <th className="py-3.5 px-4 text-center whitespace-nowrap">สถานะ / การอนุมัติ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paginatedList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-400">
                      ไม่พบประวัติการเข้างานหรือการลาตามเงื่อนไขที่เลือก
                    </td>
                  </tr>
                ) : (
                  paginatedList.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4 font-bold text-slate-800 whitespace-nowrap">
                        {row.userName}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                            row.type === "WORK"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : row.type === "LEAVE"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {row.typeLabel}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {row.dateText}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-600 whitespace-nowrap">
                        {row.checkInText}
                      </td>
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-rose-500 whitespace-nowrap">
                        {row.checkOutText}
                      </td>
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {row.note}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {row.leaveId ? (
                          <div className="flex justify-center">
                            <LeaveActionButtons
                              attendanceId={row.leaveId}
                              isApproved={Boolean(row.isApproved)}
                            />
                          </div>
                        ) : (
                          <span
                            className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
                              row.statusLabel === "ปกติ" || row.statusLabel === "อนุมัติแล้ว"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {row.statusLabel}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination Footer */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-3 sm:p-4">
          <Pagination
            className="flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500"
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            startIndex={startIndex}
            endIndex={endIndex}
            buildPageUrl={getPageUrl}
          />
        </div>
      </div>
    </main>
  );
}