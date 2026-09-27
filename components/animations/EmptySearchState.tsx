import React from "react";
import styles from "./EmptySearchState.module.css";
import { Search } from "lucide-react";

export interface EmptySearchStateProps {
  title?: string;
  description?: string;
  children?: React.ReactNode;
  className?: string;
}

export function EmptySearchState({
  title = "ไม่พบข้อมูลที่ค้นหา",
  description = "ลองเปลี่ยนคำค้นหา หรือล้างตัวกรองเพื่อดูรายการทั้งหมด",
  children,
  className = "",
}: EmptySearchStateProps) {
  return (
    <div className={`${styles.container} ${className}`}>
      <div className={styles.scene}>
        <div className={styles.document} />
        <div className={styles.magnifier}>
          <div className="w-12 h-12 rounded-full bg-blue-50 border-2 border-blue-400 flex items-center justify-center text-blue-600 shadow-md">
            <Search className="w-6 h-6 stroke-[2.5]" />
          </div>
        </div>
        <div className={styles.shadow} />
      </div>

      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}

      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

export default EmptySearchState;

