import { prisma } from "@/lib/prisma";
import { requireUserPage } from "@/lib/auth";
import Link from "next/link";
import ReconcileCashButton from "@/components/ReconcileCashButton";
import { getDateRange, toDateFilter } from "@/lib/date-range";
import { Prisma, PaymentMethod } from "@prisma/client";
import Pagination from "@/components/Pagination";
import { formatCurrency, formatDateTh, formatTimeTh } from "@/lib/formatters";
import { getActiveVehicles } from "@/lib/vehicle-service";
import { getStaffAndDrivers } from "@/lib/user-service";
import {
  Phone,
  Navigation,
  Clock,
  MapPin,
  Truck,
  User as UserIcon,
  CheckCircle2,
} from "lucide-react";

export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{
    tab?: string; // "all" | "assigned" | "completed"
    period?: string; // "today" | "this_month" | "this_year" | "all" | "custom"
    vehicleId?: string;
    userId?: string;
    paymentMethod?: string;
    sort?: string; // "desc" | "asc"
    startDate?: string;
    endDate?: string;
    page?: string;
  }>;
}

export default async function JobsPage({ searchParams }: PageProps) {
  const currentUser = await requireUserPage("/login");

  const params = await searchParams;
  const statusTab = params.tab || "all";
  const now = new Date();
  const period = params.period || (!params.startDate && !params.endDate ? "all" : "custom");
  const selectedVehicleId = params.vehicleId || "";
  const selectedUserId = params.userId || "";
  const selectedPaymentMethod = params.paymentMethod || "ALL";
  const selectedSort = params.sort || "desc";
  const startDateParam = params.startDate || "";
  const endDateParam = params.endDate || "";
  const currentPage = Math.max(1, Number(params.page) || 1);
  const pageSize = 10;

  const dateFilter = toDateFilter(
    getDateRange({
      period,
      startDate: startDateParam,
      endDate: endDateParam,
      now,
    })
  );

  // 2. สร้างเงื่อนไข Where
  const whereCondition: Prisma.JobWhereInput = {};

  if (currentUser.role !== "ADMIN") {
    whereCondition.OR = [
      { userId: currentUser.id },
      { driver2Id: currentUser.id },
    ];
  } else if (selectedUserId) {
    // ถ้าเป็น ADMIN และมีการเลือกกรองตามพนักงาน
    whereCondition.OR = [
      { userId: selectedUserId },
      { driver2Id: selectedUserId },
    ];
  }

  if (dateFilter) {
    whereCondition.completedAt = dateFilter;
  }

  if (selectedVehicleId) {
    whereCondition.vehicleId = selectedVehicleId;
  }

  if (selectedUserId) {
    whereCondition.OR = [
      { userId: selectedUserId },
      { driver2Id: selectedUserId },
    ];
  }

  if (selectedPaymentMethod !== "ALL") {
    whereCondition.paymentMethod = selectedPaymentMethod as PaymentMethod;
  }

  // ประวัติงานในตารางจะแสดงเฉพาะงานที่จบแล้ว (ไม่รวมงานที่กำลังมอบหมาย)
  whereCondition.status = { not: "ASSIGNED" };

  const assignedJobsWhere: Prisma.JobWhereInput = {
    status: "ASSIGNED",
  };
  if (currentUser.role !== "ADMIN") {
    assignedJobsWhere.OR = [
      { userId: currentUser.id },
      { driver2Id: currentUser.id },
    ];
  }

  // 3. ดึงข้อมูลรถ พนักงาน ประวัติงาน และงานที่ได้รับมอบหมาย
  const [vehicles, users, totalJobs, rawJobs, assignedJobs] = await Promise.all([
    getActiveVehicles(),
    getStaffAndDrivers(),
    prisma.job.count({ where: whereCondition }),
    prisma.job.findMany({
      where: whereCondition,
      include: {
        user: true,
        driver2: true,
        vehicle: true,
      },
      orderBy: {
        completedAt: selectedSort === "asc" ? "asc" : "desc",
      },
      skip: (currentPage - 1) * pageSize,
      take: pageSize,
    }),
    prisma.job.findMany({
      where: assignedJobsWhere,
      include: {
        user: true,
        driver2: true,
        vehicle: true,
      },
      orderBy: [
        { appointmentDate: "asc" },
        { assignedAt: "desc" },
      ],
    }),
  ]);

  const jobs = rawJobs;
  const totalPages = Math.max(1, Math.ceil(totalJobs / pageSize));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalJobs);

  const getTabUrl = (tabName: string) => {
    const p = new URLSearchParams();
    if (tabName !== "all") p.set("tab", tabName);
    if (period && period !== "all") p.set("period", period);
    if (selectedVehicleId) p.set("vehicleId", selectedVehicleId);
    if (selectedUserId) p.set("userId", selectedUserId);
    if (selectedPaymentMethod !== "ALL") p.set("paymentMethod", selectedPaymentMethod);
    if (selectedSort !== "desc") p.set("sort", selectedSort);
    if (startDateParam) p.set("startDate", startDateParam);
    if (endDateParam) p.set("endDate", endDateParam);
    return `/jobs?${p.toString()}`;
  };

  const getPageUrl = (pageNumber: number) => {
    const p = new URLSearchParams();
    if (statusTab !== "all") p.set("tab", statusTab);
    if (period) p.set("period", period);
    if (selectedVehicleId) p.set("vehicleId", selectedVehicleId);
    if (selectedUserId) p.set("userId", selectedUserId);
    if (selectedPaymentMethod !== "ALL") p.set("paymentMethod", selectedPaymentMethod);
    if (selectedSort !== "desc") p.set("sort", selectedSort);
    if (startDateParam) p.set("startDate", startDateParam);
    if (endDateParam) p.set("endDate", endDateParam);
    p.set("page", String(pageNumber));
    return `/jobs?${p.toString()}`;
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-800">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* หัวกระดาษ */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              📋 รายการงานสูบส้วม
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              พบประวัติทั้งหมด {totalJobs} รายการ {currentUser.role === "ADMIN" ? "(ภาพรวมบริษัท)" : "(รายการของคุณ)"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {currentUser.role === "ADMIN" && (
              <Link
                href="/admin/jobs/assign"
                className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-sm flex items-center gap-1.5"
              >
                <span>📋 จ่ายงาน</span>
              </Link>
            )}
            <Link
              href="/jobs/new"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-sm"
            >
              + ส่งงานทันที
            </Link>
          </div>
        </div>

        {/* แถบสลับดูสถานะงาน (Status Filter Tabs) */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/80 rounded-2xl w-fit text-xs sm:text-sm font-semibold">
          <Link
            href={getTabUrl("all")}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl transition whitespace-nowrap flex items-center gap-1.5 ${
              statusTab === "all"
                ? "bg-white text-slate-900 shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>ทั้งหมด</span>
            <span className="text-[11px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {assignedJobs.length + totalJobs}
            </span>
          </Link>

          <Link
            href={getTabUrl("assigned")}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl transition whitespace-nowrap flex items-center gap-1.5 ${
              statusTab === "assigned"
                ? "bg-blue-600 text-white shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            {assignedJobs.length > 0 && (
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    statusTab === "assigned" ? "bg-white" : "bg-blue-500"
                  }`}
                ></span>
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    statusTab === "assigned" ? "bg-white" : "bg-blue-600"
                  }`}
                ></span>
              </span>
            )}
            <span>รอดำเนินการ</span>
            <span
              className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${
                statusTab === "assigned"
                  ? "bg-white/20 text-white"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {assignedJobs.length}
            </span>
          </Link>

          <Link
            href={getTabUrl("completed")}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl transition whitespace-nowrap flex items-center gap-1.5 ${
              statusTab === "completed"
                ? "bg-emerald-600 text-white shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>เสร็จสิ้นแล้ว</span>
            <span
              className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${
                statusTab === "completed"
                  ? "bg-white/20 text-white"
                  : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {totalJobs}
            </span>
          </Link>
        </div>

        {/* ส่วนงานที่ได้รับมอบหมาย (Assigned Jobs Section) */}
        {statusTab !== "completed" && (
          <>
            {assignedJobs.length > 0 ? (
              <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-blue-50/90 border border-blue-200/90 rounded-2xl p-4 sm:p-5 shadow-xs space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-3 w-3 relative">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600"></span>
                    </span>
                    <h2 className="text-base font-bold text-slate-900">
                      งานที่ได้รับมอบหมายรอเริ่มงาน ({assignedJobs.length} งาน)
                    </h2>
                  </div>
                  <span className="text-xs font-semibold text-blue-700 bg-white px-2.5 py-1 rounded-full border border-blue-200 shadow-2xs">
                    รอดำเนินการ
                  </span>
                </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {assignedJobs.map((aj) => {
                const navUrl =
                  aj.latitude && aj.longitude
                    ? `https://www.google.com/maps/dir/?api=1&destination=${aj.latitude},${aj.longitude}`
                    : aj.address
                    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(aj.address)}`
                    : null;

                return (
                  <div
                    key={aj.id}
                    className="bg-white rounded-xl border border-blue-200/90 p-4 shadow-xs space-y-3 flex flex-col justify-between hover:shadow-md transition"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-base text-slate-900">
                            {aj.customerName || "ลูกค้าทั่วไป"}
                          </div>
                          {aj.customerPhone && (
                            <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{aj.customerPhone}</span>
                            </div>
                          )}
                        </div>

                        {aj.appointmentDate && (
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-100 shrink-0">
                            <Clock className="w-3 h-3 text-blue-600" />
                            <span>
                              {new Date(aj.appointmentDate).toLocaleDateString("th-TH", {
                                day: "numeric",
                                month: "short",
                              })}{" "}
                              {new Date(aj.appointmentDate).toLocaleTimeString("th-TH", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}{" "}
                              น.
                            </span>
                          </div>
                        )}
                      </div>

                      {aj.address && (
                        <p className="text-xs text-slate-600 line-clamp-2 flex items-start gap-1 bg-slate-50 p-2 rounded-lg border border-slate-100">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span>{aj.address}</span>
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md font-medium text-slate-700">
                          <Truck className="w-3 h-3 text-slate-500" />
                          {aj.vehicle.plateNumber}
                        </span>
                        {currentUser.role === "ADMIN" && (
                          <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded-md font-medium text-slate-700">
                            <UserIcon className="w-3 h-3 text-slate-500" />
                            {aj.user.name}
                            {aj.driver2 ? `, ${aj.driver2.name}` : ""}
                          </span>
                        )}
                        {aj.price && Number(aj.price) > 0 && (
                          <span className="text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                            ฿{Number(aj.price).toLocaleString()}
                          </span>
                        )}
                      </div>

                      {aj.note && (
                        <div className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200/60">
                          <span className="font-semibold">โน้ต: </span>
                          {aj.note}
                        </div>
                      )}
                    </div>

                    {/* Action buttons (Call, Navigate, Complete) */}
                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100">
                      {aj.customerPhone ? (
                        <a
                          href={`tel:${aj.customerPhone}`}
                          className="py-2 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs flex items-center justify-center gap-1 transition shadow-2xs"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>โทร</span>
                        </a>
                      ) : (
                        <button
                          disabled
                          className="py-2 px-2 rounded-lg bg-slate-100 text-slate-400 text-xs flex items-center justify-center gap-1 cursor-not-allowed"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>โทร</span>
                        </button>
                      )}

                      {navUrl ? (
                        <a
                          href={navUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="py-2 px-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-1 transition shadow-2xs"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>นำทาง</span>
                        </a>
                      ) : (
                        <button
                          disabled
                          className="py-2 px-2 rounded-lg bg-slate-100 text-slate-400 text-xs flex items-center justify-center gap-1 cursor-not-allowed"
                        >
                          <Navigation className="w-3.5 h-3.5" />
                          <span>นำทาง</span>
                        </button>
                      )}

                      <Link
                        href={`/jobs/${aj.id}/complete`}
                        className="py-2 px-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center justify-center gap-1 transition shadow-2xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>จบงาน</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : statusTab === "assigned" ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-8 sm:p-12 text-center space-y-2">
            <div className="text-3xl">🎉</div>
            <h3 className="font-bold text-slate-800 text-base">ไม่มีงานที่ได้รับมอบหมายค้างอยู่</h3>
            <p className="text-xs text-slate-500">
              คนขับดำเนินการเสร็จสิ้นทุกงานแล้ว หรือยังไม่มีการจ่ายงานใหม่ในขณะนี้
            </p>
          </div>
        ) : null}
      </>
    )}

    {/* ประวัติงานที่เสร็จแล้ว (แสดงเมื่อเลือก ทั้งหมด หรือ เสร็จสิ้นแล้ว) */}
    {statusTab !== "assigned" && (
      <>
        {/* แถบตัวกรอง (Collapsible on Mobile) */}
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <form method="GET" action="/jobs" className="space-y-3 text-xs">
            {/* ซ่อนค่า Tab ปัจจุบันไว้ในฟอร์ม */}
            {statusTab !== "all" && <input type="hidden" name="tab" value={statusTab} />}

            {/* แถวบน: ปุ่มลัดช่วงเวลา (เห็นตลอดทั้งบนมือถือและคอม) */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1 no-scrollbar">
              <div className="flex items-center gap-1.5 flex-nowrap">
                <span className="text-slate-500 font-medium whitespace-nowrap">ช่วงเวลา:</span>
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                  {[
                    { id: "today", label: "วันนี้" },
                    { id: "this_month", label: "เดือนนี้" },
                    { id: "this_year", label: "ปีนี้" },
                    { id: "all", label: "ทั้งหมด" },
                  ].map((item) => (
                    <Link
                      key={item.id}
                      href={`/jobs?period=${item.id}${
                        statusTab !== "all" ? `&tab=${statusTab}` : ""
                      }${selectedVehicleId ? `&vehicleId=${selectedVehicleId}` : ""}${
                        selectedUserId ? `&userId=${selectedUserId}` : ""
                      }${
                        selectedPaymentMethod !== "ALL" ? `&paymentMethod=${selectedPaymentMethod}` : ""
                      }${selectedSort !== "desc" ? `&sort=${selectedSort}` : ""}`}
                      className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg font-semibold transition whitespace-nowrap ${
                        period === item.id && !startDateParam && !endDateParam
                          ? "bg-blue-600 text-white shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <input type="hidden" name="period" value={period} />

            {/* แถบตัวกรองละเอียด (พับเก็บได้บนมือถือ) */}
            <details
              open={Boolean(
                selectedVehicleId ||
                  selectedUserId ||
                  selectedPaymentMethod !== "ALL" ||
                  selectedSort !== "desc" ||
                  startDateParam ||
                  endDateParam
              )}
              className="group pt-2 border-t border-slate-100"
            >
              <summary className="flex items-center justify-between cursor-pointer list-none py-1 text-slate-600 hover:text-slate-900 font-semibold select-none">
                <span className="flex items-center gap-1.5">
                  <span>🔍</span>
                  <span>ตัวกรองเพิ่มเติม</span>
                  {(selectedVehicleId ||
                    selectedUserId ||
                    selectedPaymentMethod !== "ALL" ||
                    startDateParam ||
                    endDateParam) && (
                    <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-bold">
                      เปิดใช้งานอยู่
                    </span>
                  )}
                </span>
                <span className="text-slate-400 group-open:rotate-180 transition-transform text-xs">
                  ▼
                </span>
              </summary>

              <div className="pt-3 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="space-y-1">
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

                  {currentUser.role === "ADMIN" && (
                    <div className="space-y-1">
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
                  )}

                  <div className="space-y-1">
                    <label className="text-slate-500 font-medium">วิธีชำระเงิน</label>
                    <select
                      name="paymentMethod"
                      defaultValue={selectedPaymentMethod}
                      className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-800 outline-none focus:bg-white focus:border-blue-500"
                    >
                      <option value="ALL">ทั้งหมด</option>
                      <option value="CASH">เงินสด</option>
                      <option value="TRANSFER">เงินโอน</option>
                    </select>
                  </div>

                  <div className="space-y-1">
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

                {/* แถวล่าง: ระบุวันที่ + ปุ่มล้าง/ค้นหา */}
                <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-1.5 text-slate-500 flex-wrap">
                    <span className="text-xs">ระบุวันที่:</span>
                    <input
                      type="date"
                      name="startDate"
                      defaultValue={startDateParam}
                      className="p-1.5 px-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 outline-none focus:bg-white text-xs"
                    />
                    <span>ถึง</span>
                    <input
                      type="date"
                      name="endDate"
                      defaultValue={endDateParam}
                      className="p-1.5 px-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-700 outline-none focus:bg-white text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Link
                      href="/jobs"
                      className="flex-1 sm:flex-none text-center px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-medium transition"
                    >
                      ล้างตัวกรอง
                    </Link>
                    <button
                      type="submit"
                      className="flex-1 sm:flex-none px-5 py-2 bg-[#0c1322] hover:bg-black text-white font-semibold rounded-xl transition shadow-xs cursor-pointer"
                    >
                      ค้นหา
                    </button>
                  </div>
                </div>
              </div>
            </details>
          </form>
        </div>

        {/* รายการการ์ดงาน (หน้าตาเดิมแบบรูปแรก) */}
        <div className="space-y-3">
          {jobs.length === 0 ? (
            <div className="bg-white p-12 text-center text-slate-400 rounded-2xl border border-slate-200 text-sm">
              ไม่พบรายการงานตามเงื่อนไขที่เลือก
            </div>
          ) : (
            jobs.map((job) => {
              const jobDate = new Date(job.completedAt || job.createdAt);
              const dateText = formatDateTh(jobDate, { format: "short" });
              const timeText = formatTimeTh(jobDate);

              return (
                <div
                  key={job.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-sm hover:border-slate-300 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                >
                  {/* ฝั่งซ้าย: ข้อมูลลูกค้า รถ พนักงาน วันที่ และพิกัด */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-base text-slate-900">
                        {job.customerName || "ไม่ระบุชื่อลูกค้า"}
                      </span>
                      {job.vehicle && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-md font-medium border border-slate-200/60">
                          รถ: {job.vehicle.plateNumber}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1">
                        🧑‍💼 พนักงาน 1: <strong className="text-slate-700 font-semibold">{job.user?.name || "-"}</strong>
                      </span>
                      {job.driver2 && (
                        <span>
                          • พนักงาน 2: <strong className="text-slate-700 font-semibold">{job.driver2.name}</strong>
                        </span>
                      )}
                      {job.customerPhone && (
                        <span>• เบอร์ลูกค้า: {job.customerPhone}</span>
                      )}
                    </div>

                    <div className="text-xs text-slate-400 flex items-center gap-3 pt-0.5 flex-wrap">
                    <span>🕒 {dateText} {timeText} น.</span>

                    {/* สร้างลิงก์แผนที่จากพิกัดที่เก็บใน schema */}
                    {(() => {
                      const mapLink =
                        job.latitude !== null && job.longitude !== null
                          ? `https://www.google.com/maps?q=${job.latitude},${job.longitude}`
                          : null;

                      if (!mapLink) return null;

                      return (
                        <a
                          href={mapLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-rose-500 hover:text-rose-600 flex items-center gap-1 font-medium transition cursor-pointer"
                        >
                          📍 เปิด Google Maps
                        </a>
                      );
                    })()}
                  </div>
                  </div>

                  {/* ฝั่งขวา: สถานะรูปถ่าย, ประเภทเงิน, ปุ่มกดรับเงิน และราคา */}
                  <div className="flex flex-wrap items-center gap-2.5 self-end md:self-auto">
                    {/* สถานะรูปก่อน */}
                    {job.beforePhotoUrl ? (
                      <a
                        href={job.beforePhotoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition font-medium"
                      >
                        ดูรูปก่อน
                      </a>
                    ) : (
                      <span className="px-2.5 py-1 text-xs text-slate-400 bg-slate-100/80 rounded-lg">
                        ไม่มีรูปก่อน
                      </span>
                    )}

                    {/* สถานะรูปหลัง */}
                    {job.afterPhotoUrl ? (
                      <a
                        href={job.afterPhotoUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 text-xs bg-blue-50 text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-100 transition font-medium"
                      >
                        ดูรูปหลัง
                      </a>
                    ) : (
                      <span className="px-2.5 py-1 text-xs text-slate-400 bg-slate-100/80 rounded-lg">
                        ไม่มีรูปหลัง
                      </span>
                    )}

                    {/* สลิปเงินโอน (ถ้าเป็นเงินโอน) */}
                    {job.paymentMethod === "TRANSFER" && (
                      job.slipPhotoUrl ? (
                        <a
                          href={job.slipPhotoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded-lg hover:bg-purple-100 transition font-medium"
                        >
                          ดูสลิป
                        </a>
                      ) : (
                        <span className="px-2.5 py-1 text-xs text-slate-400 bg-slate-100/80 rounded-lg">
                          ไม่มีสลิป
                        </span>
                      )
                    )}

                    {/* ป้ายประเภทเงินสด / เงินโอน */}
                    {job.paymentMethod === "CASH" ? (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        💵 เงินสด
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-200 flex items-center gap-1">
                        💳 เงินโอน
                      </span>
                    )}

                    {/* ปุ่มสำหรับเงินสด: รับเงินแล้ว / ค้างส่งเงินสด */}
                    {job.paymentMethod === "CASH" && (
                      currentUser.role === "ADMIN" ? (
                        /* ฝั่งแอดมิน: มีปุ่มกดสลับสถานะพร้อม Toast */
                        <ReconcileCashButton jobId={job.id} isReconciled={job.isReconciled} />
                      ) : (
                        /* ฝั่งพนักงาน: แสดงเฉพาะป้ายสถานะ ไม่สามารถคลิกได้ */
                        job.isReconciled ? (
                          <span className="px-3 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center gap-1 select-none">
                            ✓ รับเงินแล้ว
                          </span>
                        ) : (
                          <span className="px-3 py-1 text-xs font-semibold text-amber-700 bg-amber-50 rounded-lg border border-amber-200 flex items-center gap-1 select-none">
                            ⏳ ค้างส่งเงินสด
                          </span>
                        )
                      )
                    )}

                    {/* ราคางาน */}
                    <div className="text-xl font-bold text-slate-900 font-mono pl-1">
                      {formatCurrency(job.price)}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* แถบแบ่งหน้า (Pagination) */}
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalJobs}
          startIndex={startIndex}
          endIndex={endIndex}
          buildPageUrl={getPageUrl}
        />
      </>
    )}
      </div>
    </main>
  );
}