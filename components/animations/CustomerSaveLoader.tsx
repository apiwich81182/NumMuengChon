"use client";

import React from "react";
import styles from "./CustomerSaveLoader.module.css";
import { User } from "lucide-react";

export interface CustomerSaveLoaderProps {
  isOpen: boolean;
  customerName?: string;
  isEditing?: boolean;
}

export function CustomerSaveLoader({
  isOpen,
  customerName,
  isEditing = false,
}: CustomerSaveLoaderProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.stage}>
          <div className={styles.sparkleTop}>✨</div>
          <div className={styles.sparkleBottom}>⭐</div>

          <div className={styles.contactCard}>
            <div className={styles.avatarRing}>
              <div className={styles.avatarPulse} />
              <User className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className={styles.cardLineName} />
            <div className={styles.cardLineSub} />
          </div>
        </div>

        <h3 className={styles.title}>
          {isEditing ? "กำลังบันทึกการแก้ไขข้อมูล..." : "กำลังเพิ่มข้อมูลลูกค้า..."}
        </h3>
        <p className={styles.desc}>
          {customerName ? (
            <span>
              กำลังจัดเก็บข้อมูลของ <strong className="text-purple-700">{customerName}</strong> เข้าสู่สมุดรายชื่อ
            </span>
          ) : (
            "กำลังจัดเก็บชื่อ เบอร์โทร และพิกัดลูกค้าลงในฐานข้อมูล"
          )}
        </p>
      </div>
    </div>
  );
}

export default CustomerSaveLoader;
