import React from "react";
import TruckPageLoader from "./animations/TruckPageLoader";

interface HamsterLoaderProps {
  text?: string;
  size?: number;
  className?: string;
}

/**
 * @deprecated แนะนำให้ใช้ `TruckPageLoader` จาก `@/components/animations/TruckPageLoader` โดยตรง
 */
export default function HamsterLoader({
  text = "กำลังโหลดข้อมูล...",
  className = "",
}: HamsterLoaderProps) {
  return <TruckPageLoader text={text} className={className} />;
}
