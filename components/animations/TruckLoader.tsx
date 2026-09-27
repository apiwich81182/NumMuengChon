"use client";

import React from "react";
import styles from "./TruckLoader.module.css";

interface TruckLoaderProps {
  isOpen: boolean;
  title?: string;
  description?: string;
}

export default function TruckLoader({
  isOpen,
  title = "กำลังบันทึกและส่งงาน...",
  description = "กำลังประมวลผลรูปภาพและอัปโหลดข้อมูลขึ้นสู่ระบบ",
}: TruckLoaderProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.stage}>
          <div className={styles.smokePuff1} />
          <div className={styles.smokePuff2} />

          <div className={styles.truckWrapper}>
            <svg
              width="90"
              height="50"
              viewBox="0 0 90 50"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Septic Tank */}
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
              {/* Pipe connection */}
              <rect x="2" y="24" width="7" height="4" rx="1.5" fill="#475569" />

              {/* Truck Cab */}
              <path
                d="M50 14H66L78 26V34H50V14Z"
                fill="#1e40af"
              />
              {/* Cab Window */}
              <path
                d="M54 17H64L72 25H54V17Z"
                fill="#bfdbfe"
              />
              {/* Headlight */}
              <circle cx="77" cy="30" r="2" fill="#fef08a" />

              {/* Chassis / Frame */}
              <rect x="6" y="32" width="74" height="4" rx="2" fill="#334155" />

              {/* Front Wheel */}
              <g className={styles.wheel} style={{ transformOrigin: "66px 36px" }}>
                <circle cx="66" cy="36" r="7" fill="#0f172a" />
                <circle cx="66" cy="36" r="3.5" fill="#cbd5e1" />
                <circle cx="66" cy="36" r="1.5" fill="#475569" />
              </g>

              {/* Rear Wheels (Tandem) */}
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

          <div className={styles.road}>
            <div className={styles.roadLine} />
          </div>
        </div>

        <h3 className={styles.title}>{title}</h3>
        <p className={styles.desc}>{description}</p>
      </div>
    </div>
  );
}

