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
    <main className="min-h-screen bg-slate-100 py-6 px-4">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-800">🚛 บันทึกส่งงานสูบส้วม</h1>
          <p className="text-sm text-slate-500">กรอกข้อมูลและบันทึกพิกัดหลังเสร็จงาน</p>
        </div>

        <JobForm vehicles={vehicles} drivers={drivers} currentUserId={currentUser?.id} />
      </div>
    </main>
  );
}