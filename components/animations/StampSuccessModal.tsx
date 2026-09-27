"use client";

import React, { useEffect } from "react";
import styles from "./StampSuccess.module.css";

export interface StampSuccessModalProps {
  isOpen: boolean;
  type: "check-in" | "check-out" | "IN" | "OUT";
  timeText?: string;
  onClose?: () => void;
}

export function StampSuccessModal({
  isOpen,
  type,
  timeText,
  onClose,
}: StampSuccessModalProps) {
  useEffect(() => {
    if (!isOpen || !onClose) return;
    const timer = setTimeout(() => {
      onClose();
    }, 2400);
    return () => clearTimeout(timer);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isCheckIn = type === "check-in" || type === "IN";

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <div
          className={`${styles.stampBadge} ${
            isCheckIn ? styles.stampCheckIn : styles.stampCheckOut
          }`}
        >
          {isCheckIn ? "✓ เข้างานสำเร็จ" : "✓ ออกงานสำเร็จ"}
        </div>

        <div className={styles.timeDisplay}>{timeText || "--:--"}</div>

        <p className={styles.subText}>
          {isCheckIn
            ? "บันทึกเวลาและพิกัดเข้างานของคุณเรียบร้อยแล้ว"
            : "บันทึกเวลาและสรุปชั่วโมงทำงานเรียบร้อยแล้ว"}
        </p>

        <button type="button" onClick={onClose} className={styles.closeButton}>
          ตกลง (เสร็จสิ้น)
        </button>
      </div>
    </div>
  );
}

export default StampSuccessModal;

