"use client";

import { useState, useEffect, useCallback } from "react";

export interface Coordinates {
  lat: number | null;
  lng: number | null;
  accuracy?: number | null;
  timestamp?: Date | null;
}

export function useGeolocation(options?: PositionOptions) {
  const [coords, setCoords] = useState<Coordinates>({
    lat: null,
    lng: null,
    accuracy: null,
    timestamp: null,
  });
  const [status, setStatus] = useState<string>("กำลังค้นหาพิกัด GPS...");
  const [loading, setLoading] = useState<boolean>(true);

  const refreshPosition = useCallback(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      setStatus("อุปกรณ์ไม่รองรับ GPS");
      setLoading(false);
      return;
    }

    setLoading(true);
    setStatus("กำลังค้นหาพิกัด GPS สดใหม่...");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy ? Math.round(position.coords.accuracy) : null,
          timestamp: new Date(position.timestamp || Date.now()),
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
        maximumAge: 0, // บังคับไม่ให้ใช้ Cache เก่า เพื่อให้ได้พิกัดปัจจุบันแบบเรียลไทม์
        ...options,
      }
    );
  }, [options]);

  useEffect(() => {
    refreshPosition();
  }, [refreshPosition]);

  return { coords, status, loading, refreshPosition };
}
