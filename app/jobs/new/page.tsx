import { requireUserPage } from "@/lib/auth";
import JobForm from "./JobForm";
import { getActiveVehicles } from "@/lib/vehicle-service";
import { getActiveDrivers } from "@/lib/user-service";

export default async function NewJobPage() {
  const currentUser = await requireUserPage("/login");

  const [vehicles, drivers] = await Promise.all([
    getActiveVehicles(),
    getActiveDrivers(),
  ]);

  return (
    <main className="min-h-screen bg-slate-50 py-6 sm:py-8 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-sm p-5 sm:p-7 border border-slate-200/80">
        <div className="mb-6 pb-4 border-b border-slate-100">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span>🚛 บันทึกส่งงานสูบส้วม</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            กรอกข้อมูลการให้บริการ ตรวจสอบพิกัด และบันทึกจบงานทันที
          </p>
        </div>

        <JobForm vehicles={vehicles} drivers={drivers} currentUserId={currentUser?.id} />
      </div>
    </main>
  );
}