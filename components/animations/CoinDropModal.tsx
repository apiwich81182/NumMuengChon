"use client";

import React, { useEffect } from "react";
import styles from "./CoinDrop.module.css";

interface CoinDropModalProps {
  isOpen: boolean;
  onClose?: () => void;
  amount?: number;
}

export default function CoinDropModal({
  isOpen,
  onClose,
  amount,
}: CoinDropModalProps) {
  useEffect(() => {
    if (!isOpen || !onClose) return;
    const timer = setTimeout(() => {
      onClose();
    }, 2200);
    return () => clearTimeout(timer);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.card} onClick={(e) => e.stopPropagation()}>
        <div className={styles.coinStage}>
          <div className={styles.sparkle1} />
          <div className={styles.sparkle2} />
          <div className={styles.sparkle3} />
          <div className={styles.goldCoin}>฿</div>
        </div>

        <h3 className={styles.title}>บันทึกรับเงินสดเรียบร้อย!</h3>
        <p className={styles.desc}>
          {amount
            ? `กระทบยอดเงินสดจำนวน ${amount.toLocaleString("th-TH")} บาท เรียบร้อยแล้ว`
            : "เงินสดถูกกระทบยอดเข้าบัญชีรับเรียบร้อยแล้ว"}
        </p>

        <button type="button" onClick={onClose} className={styles.closeButton}>
          ตกลง
        </button>
      </div>
    </div>
  );
}

