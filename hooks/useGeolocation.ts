"use client";

import { useState, useEffect } from "react";

export interface Coordinates {
  lat: number | null;
  lng: number | null;
}

export function useGeolocation(options?: PositionOptions) {
  const [coords, setCoords] = useState<Coordinates>({ lat: null, lng: null });
  const [status, setStatus] = useState<string>("กำลังค้นหาพิกัด GPS...");
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!("geolocation" in navigator)) {
      const timer = setTimeout(() => {
        setStatus("อุปกรณ์ไม่รองรับ GPS");
        setLoading(false);
      }, 0);
      return () => clearTimeout(timer);
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setStatus("✅ บันทึกพิกัด GPS เรียบร้อย");
        setLoading(false);
      },
      (error) => {
        console.warn("GPS error:", error.message);
        setStatus("⚠️ ไม่สามารถดึงพิกัดได้ (กรุณาเปิด Location)");
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        ...options,
      }
    );
  }, [options]);

  return { coords, status, loading };
}

