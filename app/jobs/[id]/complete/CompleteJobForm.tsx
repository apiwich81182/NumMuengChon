"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { completeJob } from "@/actions/jobs";
import imageCompression from "browser-image-compression";
import { useGeolocation } from "@/hooks/useGeolocation";
import { toast } from "@/components/Toast";
import {
  Camera,
  MapPin,
  FileText,
  DollarSign,
  Droplets,
  Loader2,
  Phone,
  Navigation,
  CheckCircle,
  Clock,
  User,
  RotateCw,
  ExternalLink,
} from "lucide-react";
import Image from "next/image";

interface CompleteJobFormProps {
  job: {
    id: string;
    status: string;
    customerName: string;
    customerPhone: string | null;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    volumePumped: number;
    price: number;
    paymentMethod: string;
    paymentStatus: string;
    beforePhotoUrl: string | null;
    afterPhotoUrl: string | null;
    slipPhotoUrl: string | null;
    note: string | null;
    appointmentDate: Date | null;
    user?: { name: string } | null;
    vehicle?: { plateNumber: string } | null;
  };
}

export default function CompleteJobForm({ job }: CompleteJobFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [compressingText, setCompressingText] = useState("");
  const { coords, status: gpsStatus, loading: gpsLoading, refreshPosition } = useGeolocation();

  // Form states initialized with job data
  const [customerName, setCustomerName] = useState(job.customerName || "");
  const [customerPhone, setCustomerPhone] = useState(job.customerPhone || "");
  const [address, setAddress] = useState(job.address || "");
  const [volumePumped, setVolumePumped] = useState(
    job.volumePumped ? String(job.volumePumped) : ""
  );
  const [price, setPrice] = useState(
    job.price ? String(Number(job.price)) : ""
  );
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "TRANSFER">(
    (job.paymentMethod as "CASH" | "TRANSFER") || "CASH"
  );
  const [note, setNote] = useState(job.note || "");

  // Photo previews
  const [beforePreview, setBeforePreview] = useState<string | null>(job.beforePhotoUrl);
  const [afterPreview, setAfterPreview] = useState<string | null>(job.afterPhotoUrl);
  const [slipPreview, setSlipPreview] = useState<string | null>(job.slipPhotoUrl);

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
    }
  }

  async function compressFile(file: File) {
    const options = {
      maxSizeMB: 0.6,
      maxWidthOrHeight: 1280,
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

    if (!price || Number(price) <= 0) {
      toast.error("กรุณาระบุยอดเงินที่เรียกเก็บ");
      return;
    }

    setLoading(true);

    try {
      const form = e.currentTarget;
      const formData = new FormData(form);
      formData.set("jobId", job.id);

      // ใช้พิกัดปัจจุบัน ถ้ามีและยังไม่มีพิกัดเดิม หรือให้ใช้พิกัดที่มี
      const latToSend = coords?.lat !== null && coords?.lat !== undefined
        ? String(coords.lat)
        : job.latitude
        ? String(job.latitude)
        : "";
      const lngToSend = coords?.lng !== null && coords?.lng !== undefined
        ? String(coords.lng)
        : job.longitude
        ? String(job.longitude)
        : "";

      if (latToSend) formData.set("latitude", latToSend);
      if (lngToSend) formData.set("longitude", lngToSend);

      // จัดการย่อรูปภาพ
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

      setCompressingText("กำลังบันทึกข้อมูลจบงาน...");
      const res = await completeJob(formData);

      if (!res.success) {
        toast.error(res.error || "เกิดข้อผิดพลาดในการบันทึกจบงาน");
        setLoading(false);
        setCompressingText("");
        return;
      }

      toast.success("จบงานสำเร็จ และแจ้งเตือน LINE เรียบร้อย!");
      router.push("/jobs");
      router.refresh();
    } catch (error) {
      console.error("Complete error:", error);
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
      setLoading(false);
      setCompressingText("");
    }
  }

  const mapNavigationUrl =
    job.latitude && job.longitude
      ? `https://www.google.com/maps/dir/?api=1&destination=${job.latitude},${job.longitude}`
      : null;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* ข้อมูลคำสั่งงานจากแอดมิน (Admin instructions banner) */}
      <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200/80 text-xs space-y-2">
        <div className="flex items-center justify-between text-blue-900 font-semibold">
          <span className="flex items-center gap-1.5">
            <User className="w-4 h-4 text-blue-600" />
            ข้อมูลงานที่ได้รับมอบหมาย
          </span>
          {job.appointmentDate && (
            <span className="flex items-center gap-1 text-blue-700 bg-white/80 px-2 py-0.5 rounded-md border border-blue-200">
              <Clock className="w-3 h-3" />
              {new Date(job.appointmentDate).toLocaleTimeString("th-TH", {
                hour: "2-digit",
                minute: "2-digit",
              })}{" "}
              น.
            </span>
          )}
        </div>

        {/* Action Buttons: Call & Maps */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {job.customerPhone ? (
            <a
              href={`tel:${job.customerPhone}`}
              className="py-2 px-3 rounded-lg bg-emerald-600 text-white font-semibold flex items-center justify-center gap-1.5 shadow-xs hover:bg-emerald-700 transition"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>โทรหาลูกค้า</span>
            </a>
          ) : (
            <button
              disabled
              className="py-2 px-3 rounded-lg bg-slate-200 text-slate-400 font-semibold flex items-center justify-center gap-1.5"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>ไม่มีเบอร์โทร</span>
            </button>
          )}

          {mapNavigationUrl ? (
            <a
              href={mapNavigationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 px-3 rounded-lg bg-blue-600 text-white font-semibold flex items-center justify-center gap-1.5 shadow-xs hover:bg-blue-700 transition"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>นำทาง Google Maps</span>
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="py-2 px-3 rounded-lg bg-slate-200 text-slate-400 font-semibold flex items-center justify-center gap-1.5"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>ไม่มีพิกัดนำทาง</span>
            </button>
          )}
        </div>

        {job.note && (
          <div className="pt-1 text-slate-700 bg-white/60 p-2 rounded-lg border border-blue-100">
            <span className="font-semibold text-blue-900">หมายเหตุจากแอดมิน: </span>
            {job.note}
          </div>
        )}
      </div>

      {/* ข้อมูลลูกค้า (สามารถตรวจสอบหรือแก้ไขได้) */}
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">ชื่อลูกค้า</label>
          <input
            type="text"
            name="customerName"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์</label>
          <input
            type="tel"
            name="customerPhone"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">สถานที่ / ที่อยู่</label>
          <textarea
            rows={2}
            name="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
          />
        </div>
      </div>

      {/* ปริมาณสูบ & ยอดเงิน */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
            <Droplets className="w-3.5 h-3.5 text-blue-500" />
            <span>ปริมาณสูบ (ลิตร)</span>
          </label>
          <input
            type="number"
            name="volumePumped"
            min="0"
            step="100"
            value={volumePumped}
            onChange={(e) => setVolumePumped(e.target.value)}
            placeholder="เช่น 2000"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-semibold"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            <span>ยอดเงินเรียกเก็บ (฿) *</span>
          </label>
          <input
            type="number"
            required
            name="price"
            min="0"
            step="50"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="เช่น 1500"
            className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
          />
        </div>
      </div>

      {/* ช่องทางชำระเงิน */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1.5">
          วิธีชำระเงิน
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label
            className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition ${
              paymentMethod === "CASH"
                ? "bg-emerald-50 border-emerald-500 text-emerald-800 font-bold shadow-xs"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="CASH"
              checked={paymentMethod === "CASH"}
              onChange={() => setPaymentMethod("CASH")}
              className="sr-only"
            />
            <span>💵 เงินสด</span>
          </label>

          <label
            className={`flex items-center justify-center gap-2 p-3 rounded-xl border cursor-pointer transition ${
              paymentMethod === "TRANSFER"
                ? "bg-emerald-50 border-emerald-500 text-emerald-800 font-bold shadow-xs"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <input
              type="radio"
              name="paymentMethod"
              value="TRANSFER"
              checked={paymentMethod === "TRANSFER"}
              onChange={() => setPaymentMethod("TRANSFER")}
              className="sr-only"
            />
            <span>📱 โอนเงิน</span>
          </label>
        </div>
      </div>

      {/* อัปโหลดรูปภาพ 3 จุด (ก่อนสูบ, หลังสูบ, สลิป) */}
      <div className="space-y-3 pt-2">
        <label className="block text-xs font-semibold text-slate-700">
          หลักฐานภาพถ่าย (กดเพื่อถ่ายภาพหรือเลือกไฟล์)
        </label>

        <div className="grid grid-cols-2 gap-3">
          {/* รูปก่อนสูบ */}
          <div>
            <span className="block text-[11px] text-slate-500 mb-1">1. รูปก่อนสูบ</span>
            <input
              type="file"
              name="beforePhoto"
              accept="image/*"
              ref={beforeInputRef}
              onChange={(e) => handlePhotoSelect(e, setBeforePreview)}
              className="hidden"
            />
            <div
              onClick={() => beforeInputRef.current?.click()}
              className="h-28 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-2 cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/30 transition relative overflow-hidden"
            >
              {beforePreview ? (
                <Image
                  src={beforePreview}
                  alt="Before"
                  fill
                  className="object-cover rounded-xl"
                  unoptimized
                />
              ) : (
                <div className="text-center text-slate-400">
                  <Camera className="w-6 h-6 mx-auto mb-1 text-slate-400" />
                  <span className="text-[11px]">ถ่ายรูปก่อน</span>
                </div>
              )}
            </div>
          </div>

          {/* รูปหลังสูบ */}
          <div>
            <span className="block text-[11px] text-slate-500 mb-1">2. รูปหลังสูบ</span>
            <input
              type="file"
              name="afterPhoto"
              accept="image/*"
              ref={afterInputRef}
              onChange={(e) => handlePhotoSelect(e, setAfterPreview)}
              className="hidden"
            />
            <div
              onClick={() => afterInputRef.current?.click()}
              className="h-28 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-2 cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/30 transition relative overflow-hidden"
            >
              {afterPreview ? (
                <Image
                  src={afterPreview}
                  alt="After"
                  fill
                  className="object-cover rounded-xl"
                  unoptimized
                />
              ) : (
                <div className="text-center text-slate-400">
                  <Camera className="w-6 h-6 mx-auto mb-1 text-slate-400" />
                  <span className="text-[11px]">ถ่ายรูปหลัง</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* รูปสลิปโอนเงิน (ถ้าเลือกโอน) */}
        {paymentMethod === "TRANSFER" && (
          <div>
            <span className="block text-[11px] text-slate-500 mb-1">3. สลิปโอนเงิน</span>
            <input
              type="file"
              name="slipPhoto"
              accept="image/*"
              ref={slipInputRef}
              onChange={(e) => handlePhotoSelect(e, setSlipPreview)}
              className="hidden"
            />
            <div
              onClick={() => slipInputRef.current?.click()}
              className="h-28 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center p-2 cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/30 transition relative overflow-hidden"
            >
              {slipPreview ? (
                <Image
                  src={slipPreview}
                  alt="Slip"
                  fill
                  className="object-cover rounded-xl"
                  unoptimized
                />
              ) : (
                <div className="text-center text-slate-400">
                  <Camera className="w-6 h-6 mx-auto mb-1 text-slate-400" />
                  <span className="text-[11px]">แนบสลิปโอนเงิน</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* หมายเหตุเพิ่มเติม */}
      <div>
        <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
          <FileText className="w-3.5 h-3.5 text-slate-400" />
          <span>หมายเหตุเพิ่มเติมหลังจบงาน</span>
        </label>
        <input
          type="text"
          name="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="เช่น ดูดเสร็จเรียบร้อย ลูกค้าพึงพอใจมาก"
          className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
        />
      </div>

      {/* GPS Status Indicator */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                coords?.lat ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>พิกัด GPS หน้างาน</span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => refreshPosition()}
            disabled={gpsLoading}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-900 bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
            title="กดเพื่อดึงพิกัดปัจจุบันใหม่ล่าสุดทันที"
          >
            <RotateCw className={`w-3 h-3 ${gpsLoading ? "animate-spin text-emerald-600" : ""}`} />
            <span>{gpsLoading ? "กำลังจับพิกัด..." : "อัปเดตพิกัดใหม่"}</span>
          </button>
        </div>

        {coords && coords.lat !== null && coords.lng !== null ? (
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
          <p className="text-amber-600 font-medium">{gpsStatus || "กำลังดึงพิกัด GPS ปัจจุบัน..."}</p>
        )}
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-base shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{compressingText || "กำลังบันทึกข้อมูล..."}</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5" />
              <span>📸 บันทึกจบงาน & แจ้งเตือน LINE</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
