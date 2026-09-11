"use client";

import { useState, useEffect } from "react";
import { createJob } from "@/actions/jobs";
import imageCompression from "browser-image-compression";

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
  const [loading, setLoading] = useState(false);
  const [compressingText, setCompressingText] = useState("");
  const [gpsStatus, setGpsStatus] = useState<string>("กำลังค้นหาพิกัด GPS...");
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });
  
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER">("CASH");

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setGpsStatus("✅ บันทึกพิกัด GPS เรียบร้อย");
        },
        (error) => {
          console.warn("GPS error:", error.message);
          setGpsStatus("⚠️ ไม่สามารถดึงพิกัดได้ (กรุณาเปิด Location)");
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setGpsStatus("อุปกรณ์ไม่รองรับ GPS");
    }
  }, []);

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
      alert("🎉 บันทึกส่งงานเรียบร้อยแล้ว!");
      form.reset();
      setPaymentMethod("CASH");
    } else {
      alert("❌ เกิดข้อผิดพลาด: " + res.error);
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
        <label className="block text-sm font-medium text-slate-700 mb-1">เบอร์โทรติดต่อ</label>
        <input
          type="tel"
          name="customerPhone"
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
            defaultValue={1000}
            required
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
            <label className="block text-xs font-semibold text-blue-700 mb-1">
              🧾 แนบรูปสลิปการโอนเงิน
            </label>
            <input
              type="file"
              name="slipPhoto"
              accept="image/*"
              className="w-full text-xs text-slate-500 file:mr-2 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200 cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* ช่องถ่ายรูป */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">📷 รูปก่อนสูบ</label>
          <input
            type="file"
            name="beforePhoto"
            accept="image/*"
            className="w-full text-xs text-slate-500 file:mr-2 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">📷 รูปหลังสูบ</label>
          <input
            type="file"
            name="afterPhoto"
            accept="image/*"
            className="w-full text-xs text-slate-500 file:mr-2 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          />
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