"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createJob } from "@/actions/jobs";
import imageCompression from "browser-image-compression";
import { useGeolocation } from "@/hooks/useGeolocation";
import { toast } from "@/components/Toast";
import { formatUserErrorMessage } from "@/lib/formatters";
import { MapPin, RotateCw, ExternalLink, Clock, Phone, Loader2, Sparkles } from "lucide-react";

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

interface CustomerJobHistory {
  id: string;
  createdAt: string | Date;
  price: number;
  volumePumped: number;
  vehicle: { plateNumber: string };
}

interface FoundCustomer {
  id?: string | null;
  phone: string;
  name: string;
  address?: string | null;
  jobs?: CustomerJobHistory[];
}

export default function JobForm({ vehicles, drivers, currentUserId }: JobFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [compressingText, setCompressingText] = useState("");
  const { coords, status: gpsStatus, loading: gpsLoading, refreshPosition } = useGeolocation();
  
  // ข้อมูลลูกค้า และ Auto-lookup
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [isSearchingPhone, setIsSearchingPhone] = useState(false);
  const [foundCustomer, setFoundCustomer] = useState<FoundCustomer | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ค้นหาประวัติลูกค้าเก่าอัตโนมัติเมื่อพิมพ์เบอร์โทร
  useEffect(() => {
    const cleaned = customerPhone.trim().replace(/[\s-]/g, "");
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (cleaned.length < 9) {
      setFoundCustomer(null);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearchingPhone(true);
      try {
        const res = await fetch(`/api/customers/lookup?phone=${encodeURIComponent(cleaned)}`);
        const data = await res.json();
        if (data.success && data.customer) {
          const cust = data.customer as FoundCustomer;
          setFoundCustomer(cust);
          if (cust.name) {
            setCustomerName(cust.name);
          }
          if (cust.address) {
            setAddress(cust.address || "");
          }
        } else {
          setFoundCustomer(null);
        }
      } catch (err) {
        console.error("Error looking up customer:", err);
      } finally {
        setIsSearchingPhone(false);
      }
    }, 400);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [customerPhone]);

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
        toast.error(formatUserErrorMessage(res.error, "เกิดข้อผิดพลาดในการบันทึก"));
      }
    } catch (err) {
      setLoading(false);
      setCompressingText("");
      toast.error(formatUserErrorMessage(err, "ไม่สามารถบันทึกส่งงานได้"));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* คอลัมน์ซ้าย: ข้อมูลรถ พนักงาน ลูกค้า และการเงิน */}
        <div className="space-y-4">
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
          <div className="space-y-3.5 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-blue-600" />
                  <span>เบอร์โทรลูกค้า</span>
                </span>
                {isSearchingPhone && (
                  <span className="text-[11px] text-blue-600 flex items-center gap-1 font-normal">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    กำลังค้นหาประวัติ...
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type="tel"
                  name="customerPhone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  maxLength={10}
                  placeholder="08xxxxxxxx (พิมพ์เพื่อค้นหาลูกค้าเก่าอัตโนมัติ)"
                  className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 placeholder:text-slate-400 font-medium"
                />
              </div>
            </div>

            {/* แจ้งเตือนเมื่อพบข้อมูลลูกค้าเก่า */}
            {foundCustomer && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1.5 text-xs text-emerald-800 animate-in fade-in duration-200">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>พบข้อมูลลูกค้าเดิม: {foundCustomer.name}</span>
                </div>
                {foundCustomer.jobs && foundCustomer.jobs.length > 0 && (
                  <div className="text-[11px] text-emerald-700 space-y-0.5 pt-0.5 border-t border-emerald-200/60">
                    <p>
                      เคยใช้บริการ <span className="font-semibold">{foundCustomer.jobs.length} ครั้ง</span>
                      {foundCustomer.jobs[0].price ? ` | ล่าสุด: ฿${foundCustomer.jobs[0].price.toLocaleString()}` : ""}
                      {foundCustomer.jobs[0].volumePumped ? ` (${foundCustomer.jobs[0].volumePumped.toLocaleString()} ลิตร)` : ""}
                      {foundCustomer.jobs[0].vehicle?.plateNumber ? ` ทะเบียน ${foundCustomer.jobs[0].vehicle.plateNumber}` : ""}
                    </p>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                ชื่อลูกค้า / หน้างาน <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="customerName"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                required
                placeholder="เช่น บ้านคุณสมพงษ์ / หอพัก A"
                className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 placeholder:text-slate-400 font-medium"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center justify-between">
                <span>ที่อยู่ / จุดสังเกตหน้างาน</span>
                <span className="text-xs text-slate-400 font-normal">(ไม่บังคับ)</span>
              </label>
              <input
                type="text"
                name="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="เช่น บ้านเลขที่ 12/3 ซอย 5 หรือ ข้างวัดคลองสอง"
                className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 placeholder:text-slate-400 font-medium"
              />
            </div>
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
                className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 placeholder:text-slate-400 font-medium"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">ยอดเงิน (บาท)</label>
              <input
                type="number"
                name="price"
                placeholder="เช่น 1200"
                required
                className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 placeholder:text-slate-400 font-bold"
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
        </div>

        {/* คอลัมน์ขวา: ภาพถ่าย พิกัด GPS และปุ่มกดยืนยันบันทึกส่งงาน */}
        <div className="space-y-4 flex flex-col justify-between h-full">
          <div className="space-y-4">
            {/* ช่องถ่ายรูป (ปุ่มสัมผัสขนาดใหญ่ + พรีวิวภาพทันที) */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">📸 หลักฐานรูปถ่ายหน้างาน</label>
              <div className="grid grid-cols-2 gap-3">
                {/* รูปก่อนสูบ */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">รูปก่อนสูบ</label>
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
                      className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl bg-slate-50 hover:bg-blue-50/50 cursor-pointer transition text-center min-h-[110px]"
                    >
                      <span className="text-3xl mb-1">📷</span>
                      <span className="text-xs font-semibold text-slate-700">แตะถ่ายรูป</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">ก่อนสูบ</span>
                    </label>
                  )}
                </div>

                {/* รูปหลังสูบ */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">รูปหลังสูบ</label>
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
                      className="flex flex-col items-center justify-center p-3 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-xl bg-slate-50 hover:bg-blue-50/50 cursor-pointer transition text-center min-h-[110px]"
                    >
                      <span className="text-3xl mb-1">📷</span>
                      <span className="text-xs font-semibold text-slate-700">แตะถ่ายรูป</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">หลังสูบ</span>
                    </label>
                  )}
                </div>
              </div>
            </div>

            {/* GPS Status Indicator */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      coords.lat ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                    }`}
                  />
                  <span className="font-bold text-slate-800 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-blue-600" />
                    <span>พิกัด GPS หน้างาน</span>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => refreshPosition()}
                  disabled={gpsLoading}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
                  title="กดเพื่อดึงพิกัดปัจจุบันใหม่ล่าสุดทันที"
                >
                  <RotateCw className={`w-3 h-3 ${gpsLoading ? "animate-spin text-blue-600" : ""}`} />
                  <span>{gpsLoading ? "กำลังจับพิกัด..." : "อัปเดตพิกัดใหม่"}</span>
                </button>
              </div>

              {coords.lat && coords.lng ? (
                <div className="bg-white p-2.5 rounded-lg border border-slate-200/80 space-y-1">
                  <div className="flex items-center justify-between text-slate-700">
                    <span className="font-mono font-medium text-slate-900">
                      Lat: {coords.lat.toFixed(5)}, Lng: {coords.lng.toFixed(5)}
                    </span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline font-medium"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>เปิดดูแผนที่จริง</span>
                    </a>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 pt-0.5">
                    {coords.timestamp && (
                      <span className="flex items-center gap-1 text-emerald-700 font-medium">
                        <Clock className="w-3 h-3 text-emerald-600" />
                        ดึงพิกัดสด: {coords.timestamp.toLocaleTimeString("th-TH")} น.
                      </span>
                    )}
                    {coords.accuracy && (
                      <span className="text-slate-500">ความแม่นยำ: ±{coords.accuracy} ม.</span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-amber-600 font-medium">{gpsStatus}</p>
              )}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 text-base"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{compressingText || "กำลังบันทึกงาน..."}</span>
                </>
              ) : (
                <span>🚛 บันทึกส่งงาน</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}