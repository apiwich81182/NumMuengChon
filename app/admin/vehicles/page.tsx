import { requireAdminPage } from "@/lib/auth";
import VehicleManagementClient from "./VehicleManagementClient";
import { getAllVehicles } from "@/lib/vehicle-service";

export const revalidate = 0;

export default async function VehiclesAdminPage() {
  await requireAdminPage("/jobs");

  const vehicles = await getAllVehicles();

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-800">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">🚛 จัดการข้อมูลรถสูบส้วม</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            เพิ่มรถใหม่ กำหนดขนาดความจุถัง และเปิด/ปิดสถานะการใช้งานของรถ
          </p>
        </div>

        <VehicleManagementClient initialVehicles={vehicles} />
      </div>
    </main>
  );
}