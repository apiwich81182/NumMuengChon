"use client";

import { useState, useEffect } from "react";
import { checkInAttendance, checkOutAttendance, requestLeave } from "@/actions/attendance";

export default function AttendanceClient({ todayRecord }: { todayRecord: any }) {
  const [loading, setLoading] = useState(false);
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn(err.message),
        { enableHighAccuracy: true }
      );
    }
  }, []);

  async function handleCheckIn() {
    setLoading(true);
    const formData = new FormData();
    if (coords.lat && coords.lng) {
      formData.set("latitude", coords.lat.toString());
      formData.set("longitude", coords.lng.toString());
    }

    const res = await checkInAttendance(formData);
    setLoading(false);
    if (res.success) alert("✅ เช็กอินเข้างานเรียบร้อยแล้ว");
    else alert("❌ " + res.error);
  }

  async function handleCheckOut() {
    setLoading(true);
    const res = await checkOutAttendance();
    setLoading(false);
    if (res.success) alert("✅ ลงเวลาออกงานเรียบร้อยแล้ว");
    else alert("❌ " + res.error);
  }

  async function handleLeave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const res = await requestLeave(formData);
    setLoading(false);
    if (res.success) alert("✅ ยื่นคำขอลาสำเร็จ รอแอดมินอนุมัติ");
    else alert("❌ " + res.error);
  }

  return (
    <div className="space-y-6">
      {/* สถานะวันนี้ */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
        <p className="text-xs font-semibold uppercase text-slate-400">สถานะกะทำงานวันนี้</p>
        <div className="mt-2 space-y-1 text-sm text-slate-700">
          <p>
            เวลาเข้างาน:{" "}
            <span className="font-bold text-slate-900">
              {todayRecord?.checkInAt
                ? new Date(todayRecord.checkInAt).toLocaleTimeString("th-TH")
                : "ยังไม่ได้เข้างาน"}
            </span>
          </p>
          <p>
            เวลาออกงาน:{" "}
            <span className="font-bold text-slate-900">
              {todayRecord?.checkOutAt
                ? new Date(todayRecord.checkOutAt).toLocaleTimeString("th-TH")
                : "-"}
            </span>
          </p>
        </div>
      </div>

      {/* ปุ่ม Check-in / Check-out */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleCheckIn}
          disabled={loading || !!todayRecord?.checkInAt}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-xl shadow transition disabled:opacity-40"
        >
          {loading ? "..." : "เข้างาน (Check-in)"}
        </button>
        <button
          onClick={handleCheckOut}
          disabled={loading || !todayRecord?.checkInAt || !!todayRecord?.checkOutAt}
          className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl shadow transition disabled:opacity-40"
        >
          {loading ? "..." : "ออกงาน (Check-out)"}
        </button>
      </div>

      {/* ฟอร์มขอยื่นลา */}
      <div className="border-t border-slate-200 pt-5">
        <p className="text-sm font-bold text-slate-800 mb-3">📝 แบบฟอร์มยื่นคำขอลา</p>
        <form onSubmit={handleLeave} className="space-y-3">
          <div>
            <select
              name="type"
              required
              className="w-full px-3 py-2 border rounded-lg text-sm text-slate-800"
            >
              <option value="SICK_LEAVE">ลาป่วย</option>
              <option value="BUSINESS_LEAVE">ลากิจ</option>
            </select>
          </div>
          <div>
            <textarea
              name="note"
              placeholder="เหตุผลการลา..."
              rows={2}
              required
              className="w-full px-3 py-2 border rounded-lg text-sm text-slate-800"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-slate-700 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition"
          >
            ส่งใบลา
          </button>
        </form>
      </div>
    </div>
  );
}