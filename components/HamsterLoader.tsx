import React from "react";
import styles from "./HamsterLoader.module.css";

interface HamsterLoaderProps {
  text?: string;
  size?: number;
  className?: string;
}

export default function HamsterLoader({
  text = "กำลังโหลดข้อมูล...",
  size,
  className = "",
}: HamsterLoaderProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-4 py-8 ${className}`}>
      <div
        aria-label="Orange and tan hamster running in a metal wheel"
        role="img"
        className={styles["wheel-and-hamster"]}
        style={size ? { fontSize: `${size}px` } : undefined}
      >
        <div className={styles.wheel} />
        <div className={styles.hamster}>
          <div className={styles.hamster__body}>
            <div className={styles.hamster__head}>
              <div className={styles.hamster__ear} />
              <div className={styles.hamster__eye} />
              <div className={styles.hamster__nose} />
            </div>
            <div className={`${styles.hamster__limb} ${styles["hamster__limb--fr"]}`} />
            <div className={`${styles.hamster__limb} ${styles["hamster__limb--fl"]}`} />
            <div className={`${styles.hamster__limb} ${styles["hamster__limb--br"]}`} />
            <div className={`${styles.hamster__limb} ${styles["hamster__limb--bl"]}`} />
            <div className={styles.hamster__tail} />
          </div>
        </div>
        <div className={styles.spoke} />
      </div>

      {text && (
        <p className="text-sm font-medium text-slate-500 tracking-wide animate-pulse">
          {text}
        </p>
      )}
    </div>
  );
}
