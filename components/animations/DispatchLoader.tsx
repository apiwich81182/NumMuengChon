"use client";

import React from "react";
import styles from "./DispatchLoader.module.css";
import { Send, CheckCircle2, MessageCircle } from "lucide-react";

interface DispatchLoaderProps {
  isOpen: boolean;
  isSuccess?: boolean;
  driverName?: string;
}

export default function DispatchLoader({
  isOpen,
  isSuccess = false,
  driverName,
}: DispatchLoaderProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.skyContainer}>
          <div className={styles.cloud1} />
          <div className={styles.cloud2} />
          <div className={styles.planeWrapper}>
            {isSuccess ? (
              <div className="w-14 h-14 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg">
                <Send className="w-6 h-6 -translate-y-0.5 translate-x-0.5 rotate-[-25deg]" />
              </div>
            )}
          </div>
        </div>

        <div className={styles.lineBadge}>
          <MessageCircle className="w-3.5 h-3.5 fill-current" />
          <span>LINE Notification</span>
        </div>

        <h3 className={styles.title}>
          {isSuccess ? "จ่ายงานเรียบร้อยแล้ว!" : "กำลังจ่ายงานและแจ้งเตือน..."}
        </h3>

        <p className={styles.desc}>
          {isSuccess ? (
            <span>
              ส่งข้อมูลงานถึง{" "}
              <strong className="text-slate-800">
                {driverName ? `คุณ${driverName}` : "คนขับ"}
              </strong>{" "}
              ผ่าน LINE เรียบร้อยแล้ว
            </span>
          ) : (
            <span>
              กำลังส่งใบงานเข้าไลน์คนขับ{" "}
              {driverName ? `(${driverName})` : ""} และบันทึกข้อมูลเข้าระบบ
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

