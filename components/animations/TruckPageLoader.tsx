"use client";

import React from "react";
import styles from "./TruckPageLoader.module.css";

interface TruckPageLoaderProps {
  text?: string;
  subtext?: string;
  className?: string;
}

export default function TruckPageLoader({
  text = "กำลังเตรียมข้อมูล...",
  subtext = "ระบบจัดการรถดูดส้วมและสิ่งปฏิกูล",
  className = "",
}: TruckPageLoaderProps) {
  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.card}>
        <div className={styles.stage}>
          <div className={styles.truckWrapper}>
            {/* ควันไอเสียจากท้ายรถ */}
            <div className={styles.smokePuff1} />
            <div className={styles.smokePuff2} />

            {/* รูปรถดูดส้วม SVG สีน้ำเงิน */}
            <svg
              width="90"
              height="50"
              viewBox="0 0 90 50"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* ตัวถังบรรจุสิ่งปฏิกูล (Septic Tank) */}
              <rect
                x="8"
                y="10"
                width="42"
                height="24"
                rx="6"
                fill="#2563eb"
              />
              <path
                d="M14 10V34M24 10V34M34 10V34M44 10V34"
                stroke="#60a5fa"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              {/* ข้อต่อท่อดูด */}
              <rect x="2" y="24" width="7" height="4" rx="1.5" fill="#475569" />

              {/* หัวรถบรรทุก (Truck Cab) */}
              <path
                d="M50 14H66L78 26V34H50V14Z"
                fill="#1e40af"
              />
              {/* กระจกหน้ารถ */}
              <path
                d="M54 17H64L72 25H54V17Z"
                fill="#bfdbfe"
              />
              {/* ไฟหน้ารถ */}
              <circle cx="77" cy="30" r="2" fill="#fef08a" />

              {/* แชสซีส์/คานล่าง */}
              <rect x="6" y="32" width="74" height="4" rx="2" fill="#334155" />

              {/* ล้อหน้า */}
              <g className={styles.wheel} style={{ transformOrigin: "66px 36px" }}>
                <circle cx="66" cy="36" r="7" fill="#0f172a" />
                <circle cx="66" cy="36" r="3.5" fill="#cbd5e1" />
                <circle cx="66" cy="36" r="1.5" fill="#475569" />
              </g>

              {/* ล้อหลังคู่ (Tandem Wheels) */}
              <g className={styles.wheel} style={{ transformOrigin: "32px 36px" }}>
                <circle cx="32" cy="36" r="7" fill="#0f172a" />
                <circle cx="32" cy="36" r="3.5" fill="#cbd5e1" />
                <circle cx="32" cy="36" r="1.5" fill="#475569" />
              </g>
              <g className={styles.wheel} style={{ transformOrigin: "18px 36px" }}>
                <circle cx="18" cy="36" r="7" fill="#0f172a" />
                <circle cx="18" cy="36" r="3.5" fill="#cbd5e1" />
                <circle cx="18" cy="36" r="1.5" fill="#475569" />
              </g>
            </svg>
          </div>

          {/* ถนนและเส้นประวิ่ง */}
          <div className={styles.road}>
            <div className={styles.roadLine} />
          </div>
        </div>

        {/* ข้อความแจ้งเตือนสถานะ */}
        <p className="text-sm font-bold text-slate-800 tracking-wide animate-pulse">
          {text}
        </p>
        {subtext && (
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            {subtext}
          </p>
        )}
      </div>
    </div>
  );
}
