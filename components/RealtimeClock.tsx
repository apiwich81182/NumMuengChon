"use client";

import { useState, useEffect } from "react";

export default function RealtimeClock() {
  const [timeStr, setTimeStr] = useState<string>("");
  const [dateStr, setDateStr] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();

      // เวลา: ชั่วโมง:นาที:วินาที
      const time = now.toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });

      // วันที่: พุธ 9 ก.ย. 69
      const date = now.toLocaleDateString("th-TH", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "2-digit",
      });

      setTimeStr(time);
      setDateStr(date);
    };

    updateTime(); // รันครั้งแรกทันที
    const interval = setInterval(updateTime, 1000); // อัปเดตทุก 1 วินาที

    return () => clearInterval(interval);
  }, []);

  if (!timeStr) {
    // ป้องกัน layout ขยับตอนโหลดหน้าแรก
    return <div className="h-6 w-24 bg-slate-100/50 rounded animate-pulse" />;
  }

  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100/80 hover:bg-slate-100 border border-slate-200/70 rounded-lg text-slate-700 font-mono text-xs shadow-sm transition">
      <span className="text-black font-sans hidden sm:inline">{dateStr}</span>
      <span className="text-black tracking-wider">🕒 {timeStr}</span>
    </div>
  );
}