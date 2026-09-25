"use client";

import { useState, useEffect } from "react";
import { Calendar, Clock } from "lucide-react";

interface RealtimeClockProps {
  className?: string;
}

export default function RealtimeClock({ className = "" }: RealtimeClockProps) {
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

      // วันที่: ศุกร์ 25 ก.ย. 2569
      const date = now.toLocaleDateString("th-TH", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
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
    return <div className="h-10 w-32 bg-slate-800/50 rounded-lg animate-pulse" />;
  }

  return (
    <div className={`flex flex-col items-center justify-center gap-0.5 text-center select-none ${className}`}>
      {/* วันที่ (แสดงผลเสมอทุกขนาดหน้าจอ ไม่มี hidden sm:inline) */}
      <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium font-sans">
        <Calendar className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <span>{dateStr}</span>
      </div>
      {/* เวลา */}
      <div className="flex items-center gap-1.5 text-sm font-bold text-white font-mono tracking-wider">
        <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span>{timeStr} น.</span>
      </div>
    </div>
  );
}