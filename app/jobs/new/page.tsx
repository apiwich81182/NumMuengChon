import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import JobForm from "./JobForm";

export default async function NewJobPage() {
  const currentUser = await getCurrentUser();

  const [vehicles, drivers] = await Promise.all([
    prisma.vehicle.findMany({ where: { isActive: true }, orderBy: { plateNumber: "asc" } }),
    prisma.user.findMany({ where: { role: "DRIVER" }, orderBy: { name: "asc" } }),
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