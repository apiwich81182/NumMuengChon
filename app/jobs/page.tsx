import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import ReconcileButton from "./ReconcileButton";

export const revalidate = 0;

interface PageProps {
  searchParams: Promise<{
    vehicleId?: string;
    userId?: string;
    paymentMethod?: string;
    sortOrder?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
  }>;
}

const PAGE_SIZE = 15;

export default async function JobListPage({ searchParams }: PageProps) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login");

  const params = await searchParams;
  const {
    vehicleId,
    userId,
    paymentMethod,
    sortOrder = "desc",
    startDate,
    endDate,
    page: rawPage,
  } = params;

  const isAdmin = currentUser.role === "ADMIN";
  const currentPage = Math.max(1, Number(rawPage) || 1);
  const skip = (currentPage - 1) * PAGE_SIZE;

  // 1. เงื่อนไขค้นหาตามบทบาทและตัวกรอง
  const where: any = {};

  if (!isAdmin) {
    where.OR = [
      { userId: currentUser.id },
      { driver2Id: currentUser.id },
    ];
  } else {
    if (userId) {
      where.OR = [
        { userId: userId },
        { driver2Id: userId },
      ];
    }
  }

  if (vehicleId) where.vehicleId = vehicleId;
  if (paymentMethod) where.paymentMethod = paymentMethod;

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(`${startDate}T00:00:00`);
    if (endDate) where.createdAt.lte = new Date(`${endDate}T23:59:59`);
  }

  // 2. Query ดาต้าเบสพร้อมกัน
  const [totalCount, jobs, vehicles, staffList] = await Promise.all([
    prisma.job.count({ where }),
    prisma.job.findMany({
      where,
      include: {
        user: true,
        driver2: true,
        vehicle: true,
      },
      orderBy: { createdAt: sortOrder === "asc" ? "asc" : "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.vehicle.findMany({ where: { isActive: true }, orderBy: { plateNumber: "asc" } }),
    isAdmin ? prisma.user.findMany({ orderBy: { name: "asc" } }) : Promise.resolve([]),
  ]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  // Helper สร้าง Query URL ส่งต่อไปยังปุ่มแบ่งหน้า
  const createPageUrl = (pageNumber: number) => {
    const p = new URLSearchParams();
    if (vehicleId) p.set("vehicleId", vehicleId);
    if (userId) p.set("userId", userId);
    if (paymentMethod) p.set("paymentMethod", paymentMethod);
    if (sortOrder) p.set("sortOrder", sortOrder);
    if (startDate) p.set("startDate", startDate);
    if (endDate) p.set("endDate", endDate);
    p.set("page", pageNumber.toString());
    return `/jobs?${p.toString()}`;
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-800">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* หัวกระดาษ */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              📋 รายการงานสูบส้วม
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              พบทั้งหมด {totalCount.toLocaleString()} รายการ {isAdmin ? "(ภาพรวมบริษัท)" : "(งานที่คุณเกี่ยวข้อง)"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/jobs/new"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition"
            >
              + ส่งงานใหม่
            </Link>
          </div>
        </div>

        {/* แถบตัวกรอง (Filter Form) */}
        <form method="GET" className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">คันรถ</label>
              <select
                name="vehicleId"
                defaultValue={vehicleId || ""}
                className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 outline-none"
              >
                <option value="">ทั้งหมด</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plateNumber}
                  </option>
                ))}
              </select>
            </div>

            {isAdmin && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">พนักงาน</label>
                <select
                  name="userId"
                  defaultValue={userId || ""}
                  className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 outline-none"
                >
                  <option value="">ทั้งหมด</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">วิธีชำระเงิน</label>
              <select
                name="paymentMethod"
                defaultValue={paymentMethod || ""}
                className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 outline-none"
              >
                <option value="">ทั้งหมด</option>
                <option value="CASH">เงินสด</option>
                <option value="TRANSFER">เงินโอน</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">เรียงลำดับ</label>
              <select
                name="sortOrder"
                defaultValue={sortOrder}
                className="w-full text-xs p-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-800 outline-none"
              >
                <option value="desc">ล่าสุด → เก่าสุด</option>
                <option value="asc">เก่าสุด → ล่าสุด</option>
              </select>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500 font-medium">ช่วงวันที่:</span>
              <input
                type="date"
                name="startDate"
                defaultValue={startDate || ""}
                className="p-1.5 border border-slate-200 rounded-lg text-slate-700 bg-slate-50 outline-none text-xs"
              />
              <span className="text-slate-400">ถึง</span>
              <input
                type="date"
                name="endDate"
                defaultValue={endDate || ""}
                className="p-1.5 border border-slate-200 rounded-lg text-slate-700 bg-slate-50 outline-none text-xs"
              />
            </div>
            <div className="flex gap-2">
              <Link
                href="/jobs"
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs font-semibold transition"
              >
                ล้างตัวกรอง
              </Link>
              <button
                type="submit"
                className="px-4 py-1.5 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-semibold transition"
              >
                ค้นหา
              </button>
            </div>
          </div>
        </form>

        {/* รายการแสดงผลงาน */}
        {jobs.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 text-slate-400 text-sm">
            ไม่พบรายการงานตามเงื่อนไขที่เลือก
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* ฝั่งซ้าย: รายละเอียดงาน */}
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base sm:text-lg font-bold text-slate-900">
                      {job.customerName}
                    </span>
                    <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium">
                      รถ: {job.vehicle.plateNumber}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600">
                    👷 พนักงาน 1: <span className="font-semibold text-slate-800">{job.user.name}</span>
                    {job.driver2 && (
                      <> • ผู้ช่วย: <span className="font-semibold text-slate-800">{job.driver2.name}</span></>
                    )}
                    {job.customerPhone && (
                      <> • เบอร์ลูกค้า: <span className="text-slate-700">{job.customerPhone}</span></>
                    )}
                  </p>

                  <p className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                    <span>{new Date(job.createdAt).toLocaleString("th-TH")}</span>
                    {job.latitude && job.longitude && (
                      <a
                        href={`https://www.google.com/maps?q=${job.latitude},${job.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-rose-500 hover:underline inline-flex items-center gap-0.5 font-medium"
                      >
                        📍 เปิด Google Maps
                      </a>
                    )}
                  </p>
                </div>

                {/* ฝั่งขวา: ปุ่มดูรูป + วิธีชำระเงิน + ยอดเงิน */}
                <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                  {/* ปุ่มดูรูปก่อนสูบ */}
                  {job.beforePhotoUrl ? (
                    <a
                      href={job.beforePhotoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium border border-slate-200 transition inline-flex items-center gap-1"
                    >
                      📷 ก่อนสูบ
                    </a>
                  ) : (
                    <span className="text-xs px-2.5 py-1.5 text-slate-400 bg-slate-50 border border-slate-100 rounded-lg">
                      ไม่มีรูปก่อน
                    </span>
                  )}

                  {/* ปุ่มดูรูปหลังสูบ */}
                  {job.afterPhotoUrl ? (
                    <a
                      href={job.afterPhotoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium border border-slate-200 transition inline-flex items-center gap-1"
                    >
                      📷 หลังสูบ
                    </a>
                  ) : (
                    <span className="text-xs px-2.5 py-1.5 text-slate-400 bg-slate-50 border border-slate-100 rounded-lg">
                      ไม่มีรูปหลัง
                    </span>
                  )}

                  {/* ป้ายประเภทชำระเงิน */}
                  <span
                    className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold border ${
                      job.paymentMethod === "TRANSFER"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                    }`}
                  >
                    {job.paymentMethod === "TRANSFER" ? "💳 เงินโอน" : "💵 เงินสด"}
                  </span>

                  {/* ปุ่มกระทบยอดเงินสด */}
                  {job.paymentMethod === "CASH" && (
                    <ReconcileButton
                      jobId={job.id}
                      isReconciled={job.isReconciled}
                      isAdmin={isAdmin}
                    />
                  )}

                  {/* ปุ่มดูสลิปเงินโอน */}
                  {job.slipPhotoUrl && (
                    <a
                      href={job.slipPhotoUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium border border-slate-200 transition inline-flex items-center gap-1"
                    >
                      🧾 สลิป
                    </a>
                  )}

                  <span className="text-lg sm:text-xl font-bold text-slate-900 ml-1">
                    ฿{Number(job.price).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* แถบตัวควบคุมแบ่งหน้า (Pagination Controls) */}
        {totalCount > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white px-5 py-3.5 rounded-2xl border border-slate-200 shadow-sm text-xs sm:text-sm mt-6">
            <div className="text-slate-500 font-medium">
              แสดง {skip + 1} - {Math.min(skip + PAGE_SIZE, totalCount)} จาก {totalCount.toLocaleString()} รายการ
            </div>

            <div className="flex items-center gap-2">
              {currentPage > 1 ? (
                <Link
                  href={createPageUrl(currentPage - 1)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  ◀ ก่อนหน้า
                </Link>
              ) : (
                <span className="px-3 py-1.5 border border-slate-100 rounded-xl text-xs font-medium text-slate-300 cursor-not-allowed">
                  ◀ ก่อนหน้า
                </span>
              )}

              <span className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800">
                หน้า {currentPage} / {totalPages || 1}
              </span>

              {currentPage < totalPages ? (
                <Link
                  href={createPageUrl(currentPage + 1)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  ถัดไป ▶
                </Link>
              ) : (
                <span className="px-3 py-1.5 border border-slate-100 rounded-xl text-xs font-medium text-slate-300 cursor-not-allowed">
                  ถัดไป ▶
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}