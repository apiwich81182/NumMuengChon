"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createExpense } from "@/actions/expenses";
import { toast } from "@/components/Toast";

interface VehicleOption {
  id: string;
  plateNumber: string;
}

interface Props {
  vehicles: VehicleOption[];
  isAdmin: boolean;
}

export default function ExpenseFormClient({ vehicles, isAdmin }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // สเตตหมวดหมู่และกล่องติ๊กเฉพาะแอดมิน
  const [category, setCategory] = useState("FUEL");
  const [isAdminOnly, setIsAdminOnly] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  }

  // เมื่อเปลี่ยนหมวดหมู่: ถ้าเป็น SALARY ให้ติ๊กถูกให้อัตโนมัติ
  function handleCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    setCategory(val);
    if (val === "SALARY") {
      setIsAdminOnly(true);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const formData = new FormData(e.currentTarget);
      formData.set("category", category);
      formData.set("isAdminOnly", (isAdmin && isAdminOnly).toString());

      if (selectedFile) {
        formData.set("receiptPhoto", selectedFile);
      }

      const res = await createExpense(formData);
      if (!res.success) {
        const message = res.error || "บันทึกข้อมูลไม่สำเร็จ";
        setErrorMsg(message);
        toast.error(message);
        setLoading(false);
        return;
      }

      toast.success("บันทึกรายจ่ายเรียบร้อยแล้ว!");
      router.push("/expenses");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึก";
      setErrorMsg(message);
      toast.error(message);
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-800">
      <div className="max-w-lg mx-auto bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold text-slate-900">➕ บันทึกรายจ่าย</h1>
          <Link href="/expenses" className="text-xs text-slate-500 hover:text-slate-800">
            ยกเลิก
          </Link>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs sm:text-sm">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              ยอดเงิน (บาท) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              name="amount"
              required
              placeholder="0.00"
              className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none font-bold text-base text-slate-900"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              หมวดหมู่ <span className="text-rose-500">*</span>
            </label>
            <select
              name="category"
              value={category}
              onChange={handleCategoryChange}
              required
              className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none font-medium text-slate-800"
            >
              <option value="FUEL">⛽ ค่าน้ำมัน</option>
              <option value="MAINTENANCE">🔧 ค่าซ่อมบำรุง</option>
              <option value="DISPOSAL_FEE">🌊 ค่าจุดทิ้งของเสีย</option>
              {isAdmin && (
                <option value="SALARY">💼 ค่าแรง / เงินเดือน (เฉพาะแอดมิน)</option>
              )}
              <option value="OTHER">📦 อื่นๆ</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              ระบุคันรถ (ถ้ามี)
            </label>
            <select
              name="vehicleId"
              className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none font-medium text-slate-800"
            >
              <option value="">-- ไม่ระบุ / ค่าใช้จ่ายส่วนกลาง --</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plateNumber}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">
              รูปใบเสร็จ / สลิป
            </label>
            <input
              ref={fileInputRef}
              id="receiptPhoto"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="sr-only"
            />
            {previewUrl ? (
              <div className="relative h-44 rounded-xl overflow-hidden border-2 border-rose-400 bg-slate-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="รูปใบเสร็จ" className="w-full h-full object-contain" />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewUrl(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="absolute top-2 right-2 px-2.5 py-1 bg-black/75 hover:bg-rose-600 text-white text-xs font-semibold rounded-lg transition cursor-pointer"
                >
                  ✕ ถ่ายใหม่
                </button>
              </div>
            ) : (
              <label
                htmlFor="receiptPhoto"
                className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-rose-500 rounded-xl bg-slate-50 hover:bg-rose-50/40 cursor-pointer transition text-center min-h-[96px]"
              >
                <span className="text-2xl mb-1">📷</span>
                <span className="text-xs font-semibold text-slate-700">แตะเพื่อถ่ายรูปใบเสร็จ / แนบสลิป</span>
                <span className="text-[10px] text-slate-400 mt-0.5">เปิดกล้องหรือเลือกไฟล์จากเครื่อง (ไม่เกิน 5MB)</span>
              </label>
            )}
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              หมายเหตุ / รายละเอียดเพิ่มเติม
            </label>
            <textarea
              name="note"
              rows={2}
              placeholder="เช่น เติมน้ำมันดีเซล, ค่าแรงรายวันสมชาย"
              className="w-full p-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none text-slate-800"
            />
          </div>

          {/* กล่องติ๊กเฉพาะแอดมิน */}
          {isAdmin && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex items-start gap-2.5">
              <input
                type="checkbox"
                id="isAdminOnly"
                checked={isAdminOnly}
                onChange={(e) => setIsAdminOnly(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
              <label htmlFor="isAdminOnly" className="text-xs text-amber-900 cursor-pointer leading-relaxed">
                <span className="font-bold block">🔒 รายจ่ายเฉพาะแอดมิน (ซ่อนจากพนักงาน)</span>
                พนักงานทั่วไปจะไม่เห็นรายการนี้ในหน้ารายจ่าย
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold transition shadow-sm mt-2 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? "⏳ กำลังบันทึกข้อมูล..." : "บันทึกรายการ"}
          </button>
        </form>
      </div>
    </main>
  );
}