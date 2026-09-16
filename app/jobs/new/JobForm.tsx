"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createJob } from "@/actions/jobs";
import imageCompression from "browser-image-compression";
import { useGeolocation } from "@/hooks/useGeolocation";
import { toast } from "@/components/Toast";

interface Vehicle {
  id: string;
  plateNumber: string;
}

interface Driver {
  id: string;
  name: string;
}

interface JobFormProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  currentUserId?: string;
}

export default function JobForm({ vehicles, drivers, currentUserId }: JobFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [compressingText, setCompressingText] = useState("");
  const { coords, status: gpsStatus } = useGeolocation();
  
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER">("CASH");

  // State พรีวิวรูปภาพ
  const [beforePreview, setBeforePreview] = useState<string | null>(null);
  const [afterPreview, setAfterPreview] = useState<string | null>(null);
  const [slipPreview, setSlipPreview] = useState<string | null>(null);

  const beforeInputRef = useRef<HTMLInputElement | null>(null);
  const afterInputRef = useRef<HTMLInputElement | null>(null);
  const slipInputRef = useRef<HTMLInputElement | null>(null);

  function handlePhotoSelect(
    e: React.ChangeEvent<HTMLInputElement>,
    setPreview: (url: string | null) => void
  ) {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreview(url);
    } else {
      setPreview(null);
    }
  }

  // ฟังก์ชันย่อภาพ
  async function compressFile(file: File) {
    const options = {
      maxSizeMB: 0.6, // ขนาดไฟล์สูงสุดไม่เกิน 600 KB
      maxWidthOrHeight: 1280, // ย่อความกว้าง/ยาวไม่เกิน 1280px คมชัดพอสำหรับหลักฐาน
      useWebWorker: true,
    };
    try {
      return await imageCompression(file, options);
    } catch {
      return file;
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    try {
      const form = e.currentTarget;
      const formData = new FormData(form);

      // ย่อรูปภาพก่อนส่งขึ้น Server
      const beforePhoto = formData.get("beforePhoto") as File;
      const afterPhoto = formData.get("afterPhoto") as File;
      const slipPhoto = formData.get("slipPhoto") as File;

      if (beforePhoto && beforePhoto.size > 0) {
        setCompressingText("กำลังบีบอัดรูปก่อนสูบ...");
        const compressed = await compressFile(beforePhoto);
        formData.set("beforePhoto", compressed, beforePhoto.name);
      }

      if (afterPhoto && afterPhoto.size > 0) {
        setCompressingText("กำลังบีบอัดรูปหลังสูบ...");
        const compressed = await compressFile(afterPhoto);
        formData.set("afterPhoto", compressed, afterPhoto.name);
      }

      if (slipPhoto && slipPhoto.size > 0) {
        setCompressingText("กำลังบีบอัดรูปสลิป...");
        const compressed = await compressFile(slipPhoto);
        formData.set("slipPhoto", compressed, slipPhoto.name);
      }

      setCompressingText("กำลังส่งข้อมูลขึ้นระบบ...");

      if (coords.lat && coords.lng) {
        formData.set("latitude", coords.lat.toString());
        formData.set("longitude", coords.lng.toString());
      }

      const res = await createJob(formData);
      setLoading(false);
      setCompressingText("");

      if (res.success) {
        toast.success("บันทึกส่งงานเรียบร้อยแล้ว!");
        router.push("/jobs");
        router.refresh();
      } else {
        toast.error(res.error ? `เกิดข้อผิดพลาด: ${res.error}` : "เกิดข้อผิดพลาดในการบันทึก");
      }
    } catch (err) {
      setLoading(false);
      setCompressingText("");
      toast.error(err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึก");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* เลือกรถ */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">ทะเบียนรถ</label>
        <select
          name="vehicleId"
          required
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
        >
          <option value="">-- เลือกรถที่ใช้ปฏิบัติงาน --</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.plateNumber}
            </option>
          ))}
        </select>
      </div>

      {/* เลือกพนักงาน 1 และ 2 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            👷‍♂️ พนักงาน 1 (หลัก)
          </label>
          {/* ถ้าเป็นแอดมิน ให้เลือกได้อิสระ แต่ถ้าเป็นคนขับ ให้ล็อกชื่อตัวเองถาวร */}
          {drivers.some((d) => d.id === currentUserId) ? (
            <div>
              <div className="w-full px-3 py-2 border rounded-lg bg-slate-100 text-slate-700 font-semibold text-sm">
                {drivers.find((d) => d.id === currentUserId)?.name || "คุณ (ผู้ใช้งานปัจจุบัน)"}
              </div>
              <input type="hidden" name="driver1Id" value={currentUserId} />
            </div>
          ) : (
            <select
              name="driver1Id"
              defaultValue={currentUserId || ""}
              required
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 text-sm"
            >
              <option value="">-- เลือกพนักงาน --</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            👷‍♂️ พนักงาน 2 (ผู้ช่วย)
          </label>
          <select
            name="driver2Id"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 text-sm"
          >
            <option value="">-- ไม่มี / ไปคนเดียว --</option>
            {drivers
              // กรองชื่อตัวเองออกจากรายชื่อผู้ช่วย (ไม่ให้เลือกตัวเองซ้ำทั้ง 1 และ 2)
              .filter((d) => d.id !== currentUserId)
              .map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* ข้อมูลลูกค้า */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">ชื่อลูกค้า / หน้างาน</label>
        <input
          type="text"
          name="customerName"
          required
          placeholder="เช่น บ้านคุณสมพงษ์ / หอพัก A"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">เบอร์โทรลูกค้า</label>
        <input
          type="tel"
          name="customerPhone"
          maxLength={10}
          placeholder="08xxxxxxxx"
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
        />
      </div>

      {/* ปริมาณและราคา */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">ปริมาณที่สูบ (ลิตร)</label>
          <input
            type="number"
            name="volumePumped"
            defaultValue={0}
            min={0}
            step="any"
            placeholder="0"
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">ยอดเงิน (บาท)</label>
          <input
            type="number"
            name="price"
            placeholder="เช่น 1200"
            required
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 font-semibold"
          />
        </div>
      </div>

      {/* วิธีการชำระเงิน */}
      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
        <label className="block text-sm font-medium text-slate-700 mb-2">วิธีการชำระเงิน</label>
        <div className="flex gap-6 mb-3">
          <label className="flex items-center gap-2 text-slate-700 cursor-pointer text-sm font-medium">
            <input
              type="radio"
              name="paymentMethod"
              value="CASH"
              checked={paymentMethod === "CASH"}
              onChange={() => setPaymentMethod("CASH")}
            />
            <span>💵 เงินสด</span>
          </label>
          <label className="flex items-center gap-2 text-slate-700 cursor-pointer text-sm font-medium">
            <input
              type="radio"
              name="paymentMethod"
              value="TRANSFER"
              checked={paymentMethod === "TRANSFER"}
              onChange={() => setPaymentMethod("TRANSFER")}
            />
            <span>📱 โอนเงินผ่านบัญชี</span>
          </label>
        </div>

        {paymentMethod === "TRANSFER" && (
          <div className="pt-3 border-t border-slate-200">
            <label className="block text-xs font-semibold text-blue-700 mb-1.5">
              🧾 แนบรูปสลิปการโอนเงิน
            </label>
            <input
              ref={slipInputRef}
              id="slipPhoto"
              type="file"
              name="slipPhoto"
              accept="image/*"
              onChange={(e) => handlePhotoSelect(e, setSlipPreview)}
              className="sr-only"
            />
            {slipPreview ? (
              <div className="relative h-32 rounded-xl overflow-hidden border-2 border-blue-400 bg-slate-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={slipPreview} alt="รูปสลิป" className="w-full h-full object-contain" />
                <button
                  type="button"
                  onClick={() => {
                    setSlipPreview(null);
                    if (slipInputRef.current) slipInputRef.current.value = "";
                  }}
                  className="absolute top-2 right-2 px-2.5 py-1 bg-black/75 hover:bg-rose-600 text-white text-[11px] font-semibold rounded-lg transition cursor-pointer"
                >
                  ✕ ถ่ายใหม่
                </button>
              </div>
            ) : (
              <label
                htmlFor="slipPhoto"
                className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-blue-300 hover:border-blue-500 rounded-xl bg-blue-50/50 hover:bg-blue-100/50 cursor-pointer transition text-center min-h-[80px]"
              >
                <span className="text-xl mb-0.5">🧾</span>
                <span className="text-xs font-semibold text-blue-800">แตะเพื่อถ่ายรูปสลิป</span>
                <span className="text-[10px] text-blue-500 mt-0.5">หรือเลือกรูปจากเครื่อง</span>
              </label>
            )}
          </div>
        )}
      </div>

      {/* ช่องถ่ายรูป (ปุ่มสัมผัสขนาดใหญ่ + พรีวิวภาพทันที) */}
      <div className="grid grid-cols-2 gap-3">
        {/* รูปก่อนสูบ */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">📷 รูปก่อนสูบ</label>
          <input
            ref={beforeInputRef}
            id="beforePhoto"
            type="file"
            name="beforePhoto"
            accept="image/*"
            onChange={(e) => handlePhotoSelect(e, setBeforePreview)}
            className="sr-only"
          />
          {beforePreview ? (
            <div className="relative aspect-video rounded-xl overflow-hidden border-2 border-blue-400 bg-slate-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={beforePreview} alt="รูปก่อนสูบ" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  setBeforePreview(null);
                  if (beforeInputRef.current) beforeInputRef.current.value = "";
                }}
                className="absolute top-2 right-2 px-2 py-0.5 bg-black/75 hover:bg-rose-600 text-white text-[10px] font-semibold rounded-md transition cursor-pointer"
              >
                ✕ ถ่ายใหม่
              </button>
            </div>
          ) : (
            <label
              htmlFor="beforePhoto"
              className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl bg-slate-50 hover:bg-blue-50/50 cursor-pointer transition text-center min-h-[96px]"
            >
              <span className="text-2xl mb-1">📷</span>
              <span className="text-xs font-semibold text-slate-700">แตะถ่ายรูป</span>
              <span className="text-[10px] text-slate-400 mt-0.5">ก่อนสูบ</span>
            </label>
          )}
        </div>

        {/* รูปหลังสูบ */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">📷 รูปหลังสูบ</label>
          <input
            ref={afterInputRef}
            id="afterPhoto"
            type="file"
            name="afterPhoto"
            accept="image/*"
            onChange={(e) => handlePhotoSelect(e, setAfterPreview)}
            className="sr-only"
          />
          {afterPreview ? (
            <div className="relative aspect-video rounded-xl overflow-hidden border-2 border-blue-400 bg-slate-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={afterPreview} alt="รูปหลังสูบ" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => {
                  setAfterPreview(null);
                  if (afterInputRef.current) afterInputRef.current.value = "";
                }}
                className="absolute top-2 right-2 px-2 py-0.5 bg-black/75 hover:bg-rose-600 text-white text-[10px] font-semibold rounded-md transition cursor-pointer"
              >
                ✕ ถ่ายใหม่
              </button>
            </div>
          ) : (
            <label
              htmlFor="afterPhoto"
              className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl bg-slate-50 hover:bg-blue-50/50 cursor-pointer transition text-center min-h-[96px]"
            >
              <span className="text-2xl mb-1">📷</span>
              <span className="text-xs font-semibold text-slate-700">แตะถ่ายรูป</span>
              <span className="text-[10px] text-slate-400 mt-0.5">หลังสูบ</span>
            </label>
          )}
        </div>
      </div>

      {/* GPS Status */}
      <div className="p-3 bg-slate-50 border rounded-lg text-xs text-slate-600">
        <p className="font-medium">{gpsStatus}</p>
        {coords.lat && (
          <p className="text-slate-400 mt-1">
            Lat: {coords.lat.toFixed(5)}, Lng: {coords.lng?.toFixed(5)}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow transition disabled:opacity-50"
      >
        {loading ? (compressingText || "กำลังบันทึกงาน...") : "บันทึกส่งงาน"}
      </button>
    </form>
  );
}