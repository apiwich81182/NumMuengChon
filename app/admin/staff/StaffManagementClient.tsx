"use client";

import { useState } from "react";
import { createUser, resetUserPassword, deleteUser } from "@/actions/admin";
import { toast } from "@/components/Toast";
import type { Role } from "@prisma/client";

type StaffUser = {
  id: string;
  name: string;
  phone: string;
  role: Role;
  _count?: {
    jobsAsDriver1: number;
    jobsAsDriver2: number;
  };
};

export default function StaffManagementClient({ initialUsers }: { initialUsers: StaffUser[] }) {
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);
  const [newPassword, setNewPassword] = useState("");

  async function handleAddUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);

    const res = await createUser(formData);
    setLoading(false);

    if (res.success) {
      toast.success("เพิ่มพนักงานสำเร็จ!");
      form.reset();
    } else {
      toast.error(res.error || "เกิดข้อผิดพลาด");
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;

    setLoading(true);
    const res = await resetUserPassword(selectedUser.id, newPassword);
    setLoading(false);

    if (res.success) {
      toast.success(`รีเซ็ตรหัสผ่านให้ "${selectedUser.name}" เรียบร้อยแล้ว เป็น: ${newPassword}`);
      setSelectedUser(null);
      setNewPassword("");
    } else {
      toast.error(res.error || "เกิดข้อผิดพลาด");
    }
  }

  async function handleDelete(u: StaffUser) {
    if (!confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบพนักงาน "${u.name}" (${u.phone}) ออกจากระบบ?`)) {
      return;
    }

    const res = await deleteUser(u.id);
    if (res.success) {
      toast.success("ลบพนักงานสำเร็จเรียบร้อย");
    } else {
      toast.error(res.error || "เกิดข้อผิดพลาด");
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
      {/* ฟอร์มเพิ่มพนักงานใหม่ */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm h-fit">
        <h2 className="font-bold text-base text-slate-800 mb-3">➕ เพิ่มบัญชีพนักงานใหม่</h2>
        <form onSubmit={handleAddUser} className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อ-นามสกุล</label>
            <input
              type="text"
              name="name"
              required
              placeholder="เช่น นายมานะ"
              className="w-full px-3 py-2 border rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              เบอร์โทร (สำหรับเข้าสู่ระบบ)
            </label>
            <input
              type="text"
              name="phone"
              required
              maxLength={10}
              placeholder="08xxxxxxxx"
              className="w-full px-3 py-2 border rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">รหัสผ่านเริ่มต้น</label>
            <input
              type="password"
              name="password"
              required
              placeholder="••••••••"
              className="w-full px-3 py-2 border rounded-xl text-xs sm:text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">ตำแหน่ง / สิทธิ์</label>
            <select
              name="role"
              className="w-full px-3 py-2 border rounded-xl text-xs sm:text-sm outline-none bg-slate-50 font-medium"
            >
              <option value="DRIVER">พนักงานขับรถ / ปฏิบัติงาน (DRIVER)</option>
              <option value="ADMIN">ผู้ดูแลระบบ / เจ้าของ (ADMIN)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-semibold transition disabled:opacity-50 mt-2"
          >
            {loading ? "กำลังบันทึก..." : "สร้างบัญชี"}
          </button>
        </form>
      </div>

      {/* ตารางแสดงรายชื่อพนักงาน */}
      <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-bold text-base text-slate-800">รายชื่อทั้งหมด ({initialUsers.length} คน)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">ชื่อพนักงาน</th>
                <th className="py-3 px-4">เบอร์โทร</th>
                <th className="py-3 px-4 text-center">บทบาท</th>
                <th className="py-3 px-4 text-center">งานสะสม</th>
                <th className="py-3 px-4 text-right">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {initialUsers.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-800">{u.name}</td>
                  <td className="py-3 px-4 text-slate-600">{u.phone}</td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className={`text-[11px] px-2.5 py-1 rounded-full font-semibold ${
                        u.role === "ADMIN"
                          ? "bg-purple-50 text-purple-700 border border-purple-200"
                          : "bg-blue-50 text-blue-700 border border-blue-200"
                      }`}
                    >
                      {u.role === "ADMIN" ? "แอดมิน" : "พนักงาน"}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-slate-600 font-medium">
                    {(u._count?.jobsAsDriver1 ?? 0) + (u._count?.jobsAsDriver2 ?? 0)} งาน
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setSelectedUser(u);
                          setNewPassword("");
                        }}
                        className="px-2.5 py-1 text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg font-medium transition"
                      >
                        🔑 เปลี่ยนรหัส
                      </button>
                      <button
                        onClick={() => handleDelete(u)}
                        className="px-2.5 py-1 text-xs bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg font-medium transition"
                      >
                        ลบ
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal รีเซ็ตรหัสผ่าน */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm space-y-4 shadow-xl">
            <div>
              <h3 className="text-base font-bold text-slate-900">🔑 ตั้งรหัสผ่านใหม่</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                พนักงาน: <span className="font-semibold text-slate-700">{selectedUser.name}</span> ({selectedUser.phone})
              </p>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  รหัสผ่านใหม่ที่ต้องการตั้ง
                </label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="เช่น 1234 หรือ newpass"
                  className="w-full px-3 py-2 border rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-3 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-medium transition"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={loading || !newPassword}
                  className="px-4 py-2 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold shadow transition disabled:opacity-50"
                >
                  {loading ? "กำลังบันทึก..." : "ยืนยันรหัสใหม่"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}