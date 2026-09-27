"use client";

import React from "react";
import styles from "./GpsRadar.module.css";

interface GpsRadarBadgeProps {
  isSearching?: boolean;
  hasCoords?: boolean;
  className?: string;
}

export default function GpsRadarBadge({
  isSearching = false,
  hasCoords = false,
  className = "",
}: GpsRadarBadgeProps) {
  const statusClass = isSearching
    ? styles.searching
    : hasCoords
    ? styles.active
    : "";

  return (
    <span
      className={`${styles.radarWrapper} ${className}`}
      title={
        isSearching
          ? "กำลังค้นหาสัญญาณ GPS..."
          : hasCoords
          ? "ตรวจพบพิกัด GPS แล้ว"
          : "ยังไม่มีพิกัด GPS"
      }
    >
      <span className={`${styles.centerDot} ${statusClass}`} />
      <span className={`${styles.wave1} ${statusClass}`} />
      <span className={`${styles.wave2} ${statusClass}`} />
      <span className={`${styles.wave3} ${statusClass}`} />
    </span>
  );
}

