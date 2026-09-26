"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { assignJob } from "@/actions/jobs";
import { toast } from "@/components/Toast";
import { formatUserErrorMessage } from "@/lib/formatters";
import {
  Phone,
  User,
  MapPin,
  Truck,
  FileText,
  DollarSign,
  Loader2,
  CheckCircle2,
  Clock,
  ExternalLink,
  History,
} from "lucide-react";

interface Vehicle {
  id: string;
  plateNumber: string;
}

interface Driver {
  id: string;
  name: string;
}

interface AssignJobFormProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  initialPhone?: string;
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
  latitude?: number | null;
  longitude?: number | null;
  note?: string | null;
  jobs?: CustomerJobHistory[];
}

function getDefaultAppointmentDate() {
  const now = new Date();
  now.setHours(now.getHours() + 1);
  now.setMinutes(0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(
    now.getDate()
  )}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export default function AssignJobForm({
  vehicles,
  drivers,
  initialPhone = "",
}: AssignJobFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isSearchingPhone, setIsSearchingPhone] = useState(false);

  // Form states
  const [phone, setPhone] = useState(initialPhone);
  const [customerName, setCustomerName] = useState("");
  const [address, setAddress] = useState("");
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");
  const [note, setNote] = useState("");
  const [appointmentDate, setAppointmentDate] = useState(getDefaultAppointmentDate);
  const [estimatedPrice, setEstimatedPrice] = useState("");
  const [selectedDriver1, setSelectedDriver1] = useState("");
  const [selectedDriver2, setSelectedDriver2] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");

  // Customer found state
  const [foundCustomer, setFoundCustomer] = useState<FoundCustomer | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced Phone Search
  useEffect(() => {
    const cleaned = phone.trim().replace(/[\s-]/g, "");

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (cleaned.length < 9) {
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
          // Auto-fill fields if currently empty
          if (cust.name) setCustomerName(cust.name);
          if (cust.address) setAddress(cust.address);
          if (cust.latitude !== null && cust.latitude !== undefined) {
            setLatitude(String(cust.latitude));
          }
          if (cust.longitude !== null && cust.longitude !== undefined) {
            setLongitude(String(cust.longitude));
          }
          if (cust.note) {
            setNote((prev) => (prev ? prev : cust.note || ""));
          }
          toast.info("พบข้อมูลลูกค้าเก่า ระบบดึงข้อมูลอัตโนมัติแล้ว");
        } else {
          setFoundCustomer(null);
        }
      } catch (err) {
        console.error("Lookup error:", err);
      } finally {
        setIsSearchingPhone(false);
      }
    }, 450);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [phone]);

  // GPS Current Location
  function handleGetCurrentLocation() {
    if (!navigator.geolocation) {
      toast.error("เบราว์เซอร์ไม่รองรับการระบุพิกัด GPS");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude.toFixed(6));
        setLongitude(pos.coords.longitude.toFixed(6));
        toast.success("บันทึกพิกัดตำแหน่งปัจจุบันสำเร็จ");
      },
      (err) => {
        toast.error("ไม่สามารถระบุพิกัดได้: " + err.message);
      },
      { enableHighAccuracy: true }
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!selectedDriver1) {
      toast.error("กรุณาเลือกคนขับหลัก");
      return;
    }
    if (!selectedVehicle) {
      toast.error("กรุณาเลือกรถประจำงาน");
      return;
    }
    if (!phone.trim()) {
      toast.error("กรุณาระบุเบอร์โทรลูกค้า");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.set("driver1Id", selectedDriver1);
      formData.set("driver2Id", selectedDriver2);
      formData.set("vehicleId", selectedVehicle);
      formData.set("customerName", customerName.trim() || "ลูกค้าทั่วไป");
      formData.set("customerPhone", phone.trim());
      formData.set("address", address.trim());
      formData.set("latitude", latitude);
      formData.set("longitude", longitude);
      formData.set("note", note.trim());
      formData.set("appointmentDate", appointmentDate);
      formData.set("price", estimatedPrice || "0");

      const res = await assignJob(formData);

      if (!res.success) {
        toast.error(formatUserErrorMessage(res.error, "เกิดข้อผิดพลาดในการมอบหมายงาน"));
        setLoading(false);
        return;
      }

      toast.success("มอบหมายงานสำเร็จ และแจ้งเตือน LINE เรียบร้อย!");
      router.push("/jobs");
      router.refresh();
    } catch (error) {
      console.error("Assign error:", error);
      toast.error(formatUserErrorMessage(error, "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อจ่ายงานได้"));
      setLoading(false);
    }
  }

  const hasCoordinates = Boolean(latitude && longitude);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 1. ส่วนข้อมูลลูกค้า (Customer Details & Auto-lookup) */}
      <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            <span>ข้อมูลลูกค้า & สถานที่</span>
          </h2>
          {isSearchingPhone && (
            <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>กำลังค้นหาข้อมูลลูกค้า...</span>
            </div>
          )}
        </div>

        {/* เบอร์โทรศัพท์ (มี Auto Lookup) */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            เบอร์โทรศัพท์ลูกค้า <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Phone className="w-4 h-4" />
            </div>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => {
                const val = e.target.value;
                setPhone(val);
                if (val.trim().replace(/[\s-]/g, "").length < 9) {
                  setFoundCustomer(null);
                }
              }}
              maxLength={10}
              placeholder="เช่น 0812345678 (พิมพ์เพื่อค้นหาลูกค้าเก่าอัตโนมัติ)"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-medium"
            />
          </div>
        </div>

        {/* กล่องแสดงผลลูกค้าเก่า (Customer badge & History) */}
        {foundCustomer && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-emerald-800 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                พบข้อมูลลูกค้าเก่าในระบบ
              </span>
              {foundCustomer.jobs && foundCustomer.jobs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowHistory(!showHistory)}
                  className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-900 font-medium underline"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>เคยใช้บริการ {foundCustomer.jobs.length} ครั้ง</span>
                </button>
              )}
            </div>

            {showHistory && foundCustomer.jobs && foundCustomer.jobs.length > 0 && (
              <div className="mt-2 pt-2 border-t border-emerald-200/80 space-y-1.5">
                {foundCustomer.jobs.map((j) => (
                  <div key={j.id} className="flex justify-between text-slate-600 bg-white/70 p-2 rounded-lg">
                    <span>
                      {new Date(j.createdAt).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                        year: "2-digit",
                      })}{" "}
                      (ทะเบียน {j.vehicle?.plateNumber || "-"})
                    </span>
                    <span className="font-semibold text-emerald-700">
                      {j.volumePumped > 0 ? `${j.volumePumped.toLocaleString()} ลิตร / ` : ""}฿
                      {j.price.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ชื่อลูกค้า */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            ชื่อลูกค้า / หน่วยงาน
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="เช่น คุณสมชาย หรือ หจก. รุ่งเรือง"
            className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-medium"
          />
        </div>

        {/* ที่อยู่ / จุดสังเกต */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            ที่อยู่ / สถานที่ / จุดสังเกต
          </label>
          <textarea
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="เช่น 123/45 ซอยเทศบาล 8 ตรงข้ามวัดดอนไก่ดี"
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition font-medium"
          />
        </div>

        {/* พิกัด GPS & แผนที่ */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-slate-500" />
              <span>พิกัด GPS (Latitude / Longitude)</span>
            </label>
            <button
              type="button"
              onClick={handleGetCurrentLocation}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium inline-flex items-center gap-1"
            >
              <MapPin className="w-3 h-3" />
              <span>ใช้พิกัดปัจจุบัน</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="Latitude เช่น 13.543210"
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            />
            <input
              type="text"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="Longitude เช่น 100.278910"
              className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
            />
          </div>

          {hasCoordinates && (
            <div className="pt-1">
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-medium"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>ตรวจสอบตำแหน่งบน Google Maps</span>
              </a>
            </div>
          )}
        </div>
      </div>

      {/* 2. ส่วนมอบหมายรถและคนขับ (Assignment & Scheduling) */}
      <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/80 space-y-4">
        <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
          <Truck className="w-5 h-5 text-emerald-600" />
          <span>การมอบหมายรถและพนักงาน</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* เลือกรถ */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              รถประจำงาน <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={selectedVehicle}
              onChange={(e) => setSelectedVehicle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
            >
              <option value="">-- เลือกรถ --</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  ทะเบียน {v.plateNumber}
                </option>
              ))}
            </select>
          </div>

          {/* เวลานัดหมาย */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>วัน-เวลานัดหมาย</span>
            </label>
            <input
              type="datetime-local"
              value={appointmentDate}
              onChange={(e) => setAppointmentDate(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
            />
          </div>

          {/* คนขับหลัก */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              คนขับหลัก <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={selectedDriver1}
              onChange={(e) => setSelectedDriver1(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
            >
              <option value="">-- เลือกคนขับหลัก --</option>
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          {/* ผู้ช่วย (ถ้ามี) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              ผู้ช่วย / คนขับคนที่ 2 (ถ้ามี)
            </label>
            <select
              value={selectedDriver2}
              onChange={(e) => setSelectedDriver2(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
            >
              <option value="">-- ไม่ระบุ --</option>
              {drivers
                .filter((d) => d.id !== selectedDriver1)
                .map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* ยอดเงินประเมิน & หมายเหตุ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-slate-500" />
              <span>ราคาประเมินเบื้องต้น (บาท)</span>
            </label>
            <input
              type="number"
              min="0"
              step="50"
              value={estimatedPrice}
              onChange={(e) => setEstimatedPrice(e.target.value)}
              placeholder="เช่น 1500 (เว้นว่างได้)"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-slate-500" />
              <span>หมายเหตุงาน / คำสั่งพิเศษ</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="เช่น เข้าซอยลึก ระวังหมาดุ โทรแจ้งก่อน 15 นาที"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
            />
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.98] text-white font-bold text-base shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>กำลังบันทึกและส่งแจ้งเตือน...</span>
            </>
          ) : (
            <>
              <span>🚀 บันทึกจ่ายงานให้พนักงาน & ส่ง LINE</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
