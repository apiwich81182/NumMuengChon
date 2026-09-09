"use client";

import { useState } from "react";
import { createExpense } from "@/actions/expenses";
import imageCompression from "browser-image-compression";

interface Vehicle {
  id: string;
  plateNumber: string;
}

interface ExpenseFormProps {
  vehicles: Vehicle[];
  currentUser: { id: string; name: string; role: string };
  defaultVehicleId: string;
}

export default function ExpenseForm({
  vehicles,
  currentUser,
  defaultVehicleId,
}: ExpenseFormProps) {
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    const form = e.currentTarget;
    const formData = new FormData(form);

    // บีบอัดรูปใบเสร็จ/สลิปก่อนอัปโหลด
    const receiptFile = formData.get("receiptPhoto") as File;
    if (receiptFile && receiptFile.size > 0) {
      setStatusText("กำลังย่อขนาดรูปใบเสร็จ...");
      try {
        const compressed = await imageCompression(receiptFile, {
          maxSizeMB: 0.6,
          maxWidthOrHeight: 1280,
          useWebWorker: true,
        });
        formData.set("receiptPhoto", compressed, receiptFile.name);
      } catch {
        // fallback ถ้าบีบอัดไม่ผ่าน
      }
    }

    setStatusText("กำลังบันทึกข้อมูล...");
    const res = await createExpense(formData);
    setLoading(false);
    setStatusText("");

    if (res.success) {
      alert("🎉 บันทึกค่าใช้จ่ายเรียบร้อยแล้ว!");
      form.reset();
    } else {
      alert("❌ เกิดข้อผิดพลาด: " + res.error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-slate-800">
      <div>
        <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
          ⛽ บันทึกค่าใช้จ่ายรถ
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          ค่าน้ำมัน, ค่าทิ้งสิ่งปฏิกูล หรือค่าซ่อมบำรุง
        </p>
      </div>

      {/* แสดงชื่อผู้เบิก (ล็อกตามคนที่ Login) */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
            ผู้บันทึก / ผู้เบิกจ่าย
          </span>
          <span className="text-sm font-bold text-slate-800 flex items-center gap-1.5 mt-0.5">
            👤 {currentUser.name}
          </span>
        </div>
        <span className="text-[11px] px-2 py-0.5 bg-blue-100 text-blue-700 font-bold rounded-md">
          {currentUser.role === "ADMIN" ? "แอดมิน" : "พนักงาน"}
        </span>
      </div>

      {/* เลือกรถ (ตั้งค่าเริ่มต้นเป็นคันที่ขับล่าสุด) */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">
          ทะเบียนรถ (กรณีเป็นค่าใช้จ่ายของรถ)
        </label>
        <select
          name="vehicleId"
          defaultValue={defaultVehicleId}
          required
          className="w-full px-3 py-2 border rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
        >
          <option value="">-- เลือกรถ --</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.plateNumber}
            </option>
          ))}
        </select>
      </div>

      {/* หมวดหมู่ */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">
          หมวดหมู่ค่าใช้จ่าย
        </label>
        <select
          name="category"
          required
          className="w-full px-3 py-2 border rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
        >
          <option value="FUEL">⛽ ค่าน้ำมัน</option>
          <option value="DISPOSAL_FEE">💧 ค่าจุดทิ้งสิ่งปฏิกูล</option>
          <option value="MAINTENANCE">🔧 ค่าซ่อมบำรุง / อะไหล่</option>
          <option value="OTHER">📦 อื่นๆ</option>
        </select>
      </div>

      {/* ยอดเงิน */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">
          ยอดเงิน (บาท)
        </label>
        <input
          type="number"
          name="amount"
          step="0.01"
          placeholder="เช่น 800"
          required
          className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-800"
        />
      </div>

      {/* หมายเหตุ */}
      <div>
        <label className="block text-xs font-semibold text-slate-600 mb-1">
          หมายเหตุ / รายละเอียด
        </label>
        <textarea
          name="note"
          rows={2}
          placeholder="เช่น เติมดีเซล ปั๊ม ปตท. หน้าปากซอย"
          className="w-full px-3 py-2 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
        />
      </div>

      {/* แนบรูปใบเสร็จ */}
      <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
        <label className="block text-xs font-semibold text-slate-700 mb-1">
          🧾 แนบรูปใบเสร็จ / บิลน้ำมัน
        </label>
        <input
          type="file"
          name="receiptPhoto"
          accept="image/*"
          capture="environment"
          className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-rose-50 file:text-rose-700 hover:file:bg-rose-100 cursor-pointer"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl shadow-sm transition disabled:opacity-50 text-sm"
      >
        {loading ? statusText || "กำลังบันทึก..." : "บันทึกค่าใช้จ่าย"}
      </button>
    </form>
  );
}