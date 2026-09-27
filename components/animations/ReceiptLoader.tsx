"use client";

import React from "react";
import styles from "./ReceiptLoader.module.css";

export interface ReceiptLoaderProps {
  isOpen: boolean;
  title?: string;
  description?: string;
}

export function ReceiptLoader({
  isOpen,
  title = "กำลังบันทึกรายจ่าย...",
  description = "กำลังอัปโหลดรูปใบเสร็จและบันทึกข้อมูลทางบัญชีเข้าสู่ระบบ",
}: ReceiptLoaderProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={styles.stage}>
          {/* Printer Output Slot */}
          <div className={styles.printerSlot}>
            <div className={styles.slotMouth} />
          </div>

          {/* Paper Receipt Sliding Down */}
          <div className={styles.receipt}>
            <div className={styles.receiptLineHeader} />
            <div className={styles.receiptLine1} />
            <div className={styles.receiptLine2} />
            <div className={styles.receiptLineTotal} />
            <div className={styles.stampPaid}>PAID / บันทึกแล้ว</div>
            <div className={styles.receiptZigzag} />
          </div>

          {/* Floating Coin Decoration */}
          <div className={styles.floatingCoin}>🧾</div>
        </div>

        <h3 className={styles.title}>{title}</h3>
        <p className={styles.desc}>{description}</p>
      </div>
    </div>
  );
}

export default ReceiptLoader;
