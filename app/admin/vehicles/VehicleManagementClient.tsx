"use client";

import { useState } from "react";
import { createVehicle, toggleVehicleStatus } from "@/actions/admin";
import { toast } from "@/components/Toast";

type Vehicle = {
  id: string;
  plateNumber: string;
  capacityLiters: number;
  isActive: boolean;
  _count: { jobs: number };
};

export default function VehicleManagementClient({ initialVehicles }: { initialVehicles: Vehicle[] }) {
  const [loading, setLoading] = useState(false);

  async function handleAddVehicle(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);

    const res = await createVehicle(formData);
    setLoading(false);

    if (res.success) {
      toast.success("เพิ่มรถสำเร็จเรียบร้อย");
      form.reset();
    } else {
      toast.error(res.error || "เกิดข้อผิดพลาด");
    }
  }

  async function handleToggle(id: string, currentStatus: boolean) {
    if (!confirm(`ต้องการเปลี่ยนสถานะรถคันนี้เป็น ${currentStatus ? "งดใช้งาน (ส่งซ่อม)" : "พร้อมใช้งาน"} ใช่หรือไม่?`)) return;
    const res = await toggleVehicleStatus(id, currentStatus);
    if (res.success) {
      toast.success("อัปเดตสถานะรถเรียบร้อยแล้ว");
    } else {
      toast.error(res.error || "เกิดข้อผิดพลาด");
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* ฟอร์มเพิ่มรถใหม่ */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm h-fit">
        <h2 className="font-bold text-base text-slate-800 mb-3">➕ เพิ่มรถคันใหม่</h2>
        <form onSubmit={handleAddVehicle} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">ทะเบียนรถ</label>
            <input
              type="text"
              name="plateNumber"
              required
              placeholder="เช่น 83-5678 ขอนแก่น"
              className="w-full px-3 py-2 border rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">ความจุถัง (ลิตร)</label>
            <input
              type="number"
              name="capacity"
              required
              placeholder="เช่น 4000 หรือ 6000"
              className="w-full px-3 py-2 border rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition disabled:opacity-50 mt-2"
          >
            {loading ? "กำลังบันทึก..." : "บันทึกข้อมูลรถ"}
          </button>
        </form>
      </div>

      {/* ตารางแสดงรายการรถ */}
      <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h2 className="font-bold text-base text-slate-800">รายการรถทั้งหมด ({initialVehicles.length} คัน)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">ทะเบียน</th>
                <th className="py-3 px-4">ความจุ</th>
                <th className="py-3 px-4 text-center">งานสะสม</th>
                <th className="py-3 px-4 text-center">สถานะ</th>
                <th className="py-3 px-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {initialVehicles.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-800">{v.plateNumber}</td>
                  <td className="py-3 px-4 text-slate-600">
                    {v.capacityLiters ? Number(v.capacityLiters).toLocaleString() : "-"} ลิตร
                  </td>
                  <td className="py-3 px-4 text-center text-slate-500">
                    {v._count?.jobs ?? 0} งาน
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${
                        v.isActive
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-600 border border-rose-200"
                      }`}
                    >
                      {v.isActive ? "พร้อมใช้งาน" : "งดใช้งาน/ซ่อม"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleToggle(v.id, v.isActive)}
                      className={`text-xs px-2.5 py-1 rounded-lg font-medium transition ${
                        v.isActive
                          ? "bg-rose-50 text-rose-600 hover:bg-rose-100"
                          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      }`}
                    >
                      {v.isActive ? "สั่งระงับ" : "เปิดใช้งาน"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}