import { requireAdminPage } from "@/lib/auth";
import AssignJobForm from "./AssignJobForm";
import { getActiveVehicles } from "@/lib/vehicle-service";
import { getActiveDrivers } from "@/lib/user-service";
import Link from "next/link";
import { ArrowLeft, Users } from "lucide-react";

export const metadata = {
  title: "มอบหมายงานสูบส้วม (Dispatch) | ระบบจัดการรถสูบส้วม",
};

interface PageProps {
  searchParams: Promise<{ phone?: string }>;
}

export default async function AssignJobPage({ searchParams }: PageProps) {
  await requireAdminPage("/jobs");
  const params = await searchParams;
  const initialPhone = params.phone || "";

  const [vehicles, drivers] = await Promise.all([
    getActiveVehicles(),
    getActiveDrivers(),
  ]);

  return (
    <main className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/dashboard"
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition shadow-xs"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <span>📋 มอบหมายงานใหม่</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                  Dispatch
                </span>
              </h1>
              <p className="text-sm text-slate-500">
                จ่ายงานให้คนขับ ค้นหาประวัติลูกค้าเก่าอัตโนมัติจากเบอร์โทรศัพท์
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/customers"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-xs transition"
            >
              <Users className="w-4 h-4 text-slate-500" />
              <span>ฐานข้อมูลลูกค้า</span>
            </Link>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
          <AssignJobForm vehicles={vehicles} drivers={drivers} initialPhone={initialPhone} />
        </div>
      </div>
    </main>
  );
}
