import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

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
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    redirect("/jobs");
  }

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

  // คำนวณช่วงเวลาสำหรับการกรอง
  let start: Date | null = null;
  let end: Date | null = null;

  if (startDateParam || endDateParam) {
    if (startDateParam) start = new Date(`${startDateParam}T00:00:00`);
    if (endDateParam) end = new Date(`${endDateParam}T23:59:59.999`);
  } else if (period === "today") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (period === "this_month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (period === "this_year") {
    start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
    end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
  }

  // เงื่อนไข Filter สำหรับ Query
  const jobWhere: any = {};
  if (start || end) {
    const range: any = {};
    if (start) range.gte = start;
    if (end) range.lte = end;
    jobWhere.completedAt = range;
  }
  if (selectedVehicleId) {
    jobWhere.vehicleId = selectedVehicleId;
  }

  // ดึงข้อมูล Users, Vehicles, Jobs และ Attendance (การลา)
  const [users, vehicles, rawJobs, rawLeaves] = await Promise.all([
    prisma.user.findMany({
      where: { role: { in: ["DRIVER", "ADMIN"] } },
      orderBy: { name: "asc" },
    }),
    prisma.vehicle.findMany({
      where: { isActive: true },
      orderBy: { plateNumber: "asc" },
    }),
    prisma.job.findMany({
      where: jobWhere,
      include: { user: true, driver2: true, vehicle: true },
      orderBy: { completedAt: "asc" },
    }),
    (prisma as any).attendance
      ? (prisma as any).attendance
          .findMany({
            where: {
              ...(start || end
                ? {
                    createdAt: {
                      ...(start ? { gte: start } : {}),
                      ...(end ? { lte: end } : {}),
                    },
                  }
                : {}),
              status: { in: ["LEAVE", "SICK", "ลากิจ", "ลาป่วย"] },
            },
            include: { user: true },
            orderBy: { createdAt: "desc" },
          })
          .catch(() => [])
      : Promise.resolve([]),
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
    const dateKey = jobDate.toISOString().split("T")[0];
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
      dateText: w.dateObj.toLocaleDateString("th-TH", {
        day: "numeric",
        month: "numeric",
        year: "2-digit",
      }),
      rawDate: w.dateObj,
      checkInText: w.firstTime.toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      checkOutText:
        w.jobCount > 1
          ? w.lastTime.toLocaleTimeString("th-TH", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "-",
      note: `วิ่งงานจริง ${w.jobCount} เที่ยว${platesText ? ` (${platesText})` : ""}`,
      statusLabel: "ปกติ",
    });
  });

  // เพิ่มข้อมูลการลา (ถ้าไม่มีการเลือกกรองเจาะจงคันรถ)
  if (!selectedVehicleId) {
    rawLeaves.forEach((leave: any) => {
      const lDate = new Date(leave.date || leave.createdAt);
      const isSick =
        leave.status === "SICK" || String(leave.status).includes("ลาป่วย");
      combinedList.push({
        id: `leave_${leave.id}`,
        userId: leave.userId,
        userName: leave.user?.name || "-",
        type: isSick ? "SICK" : "LEAVE",
        typeLabel: isSick ? "ลาป่วย" : "ลากิจ",
        dateText: lDate.toLocaleDateString("th-TH", {
          day: "numeric",
          month: "numeric",
          year: "2-digit",
        }),
        rawDate: lDate,
        checkInText: "-",
        checkOutText: "-",
        note: leave.reason || leave.note || "-",
        statusLabel: leave.approved ? "อนุมัติแล้ว" : "รอดำเนินการ",
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
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ส่วนหัว */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              ⏰ บันทึกเวลาของพนักงาน
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              คำนวณการเข้างานอัตโนมัติจากงานที่วิ่งจริง (พบทั้งหมด {totalItems} รายการ)
            </p>
          </div>
          <Link
            href="/admin/dashboard"
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold border border-slate-200 transition shadow-sm"
          >
            📊 ดู Dashboard
          </Link>
        </div>

        {/* แถบตัวกรองแบบ 2 แถว ตามดีไซน์มาตรฐาน */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
          <form method="GET" className="space-y-4 text-xs">
            {/* แถวที่ 1: คันรถ / พนักงาน / หมวดหมู่ / เรียงลำดับ */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* คันรถ */}
              <div className="space-y-1.5">
                <label className="text-slate-500 font-medium">คันรถ</label>
                <select
                  name="vehicleId"
                  defaultValue={selectedVehicleId}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 outline-none focus:bg-white focus:border-blue-500"
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
              <div className="space-y-1.5">
                <label className="text-slate-500 font-medium">พนักงาน</label>
                <select
                  name="userId"
                  defaultValue={selectedUserId}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 outline-none focus:bg-white focus:border-blue-500"
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
              <div className="space-y-1.5">
                <label className="text-slate-500 font-medium">หมวดหมู่</label>
                <select
                  name="type"
                  defaultValue={selectedType}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 outline-none focus:bg-white focus:border-blue-500"
                >
                  <option value="ALL">ทั้งหมด</option>
                  <option value="WORK">เข้างานปกติ (จากงานที่วิ่ง)</option>
                  <option value="LEAVE">ลากิจ</option>
                  <option value="SICK">ลาป่วย</option>
                </select>
              </div>

              {/* เรียงลำดับ */}
              <div className="space-y-1.5">
                <label className="text-slate-500 font-medium">เรียงลำดับ</label>
                <select
                  name="sort"
                  defaultValue={selectedSort}
                  className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 outline-none focus:bg-white focus:border-blue-500"
                >
                  <option value="desc">ล่าสุด → เก่าสุด</option>
                  <option value="asc">เก่าสุด → ล่าสุด</option>
                </select>
              </div>
            </div>

            {/* แถวที่ 2: ปุ่มลัดช่วงเวลา + ระบุวันที่ + ปุ่มล้าง/ค้นหา */}
            <div className="pt-3 border-t border-slate-100 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-slate-500 font-medium">ช่วงเวลา:</span>
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
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
                      className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                        period === item.id && !startDateParam && !endDateParam
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>

                <input type="hidden" name="period" value={period} />

                {/* หรือระบุวันที่ */}
                <div className="flex items-center gap-1.5 text-slate-400">
                  <span className="text-xs">หรือระบุวันที่:</span>
                  <input
                    type="date"
                    name="startDate"
                    defaultValue={startDateParam}
                    className="p-1.5 px-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 outline-none focus:bg-white"
                  />
                  <span>ถึง</span>
                  <input
                    type="date"
                    name="endDate"
                    defaultValue={endDateParam}
                    className="p-1.5 px-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 outline-none focus:bg-white"
                  />
                </div>
              </div>

              {/* ปุ่มล้างตัวกรอง & ค้นหา */}
              <div className="flex items-center gap-2 self-end lg:self-auto">
                <Link
                  href="/admin/attendance"
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-medium transition"
                >
                  ล้างตัวกรอง
                </Link>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#0c1322] hover:bg-black text-white font-semibold rounded-xl transition shadow-sm cursor-pointer"
                >
                  ค้นหา
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* ตารางแสดงรายการ */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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
                        <span
                          className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
                            row.statusLabel === "ปกติ" || row.statusLabel === "อนุมัติแล้ว"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {row.statusLabel}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="p-4 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500">
            <div>
              แสดง {totalItems === 0 ? 0 : startIndex + 1} - {endIndex} จาก {totalItems} รายการ
            </div>

            <div className="flex items-center gap-2">
              {currentPage > 1 ? (
                <Link
                  href={getPageUrl(currentPage - 1)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition font-medium"
                >
                  ◀ ก่อนหน้า
                </Link>
              ) : (
                <span className="px-3 py-1.5 bg-slate-50 text-slate-300 rounded-lg cursor-not-allowed">
                  ◀ ก่อนหน้า
                </span>
              )}

              <span className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 shadow-sm">
                หน้า {currentPage} / {totalPages}
              </span>

              {currentPage < totalPages ? (
                <Link
                  href={getPageUrl(currentPage + 1)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition font-medium"
                >
                  ถัดไป ▶
                </Link>
              ) : (
                <span className="px-3 py-1.5 bg-slate-50 text-slate-300 rounded-lg cursor-not-allowed">
                  ถัดไป ▶
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}