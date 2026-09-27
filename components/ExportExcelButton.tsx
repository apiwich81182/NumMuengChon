"use client";

import React, { useState } from "react";
import styles from "./PrinterLoader.module.css";

interface ExportExcelButtonProps {
  exportUrl: string;
  defaultFilename?: string;
  className?: string;
  children?: React.ReactNode;
}

export default function ExportExcelButton({
  exportUrl,
  defaultFilename = "export-data.csv",
  className = "",
  children,
}: ExportExcelButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [displayFilename, setDisplayFilename] = useState(defaultFilename);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleExport = async (e: React.MouseEvent) => {
    e.preventDefault();
    setIsOpen(true);
    setIsReady(false);
    setErrorMessage(null);
    setDisplayFilename(defaultFilename);

    try {
      const res = await fetch(exportUrl);
      if (!res.ok) {
        throw new Error("เกิดข้อผิดพลาดในการดึงข้อมูลจากเซิร์ฟเวอร์");
      }

      // ตรวจสอบชื่อไฟล์จาก Header Content-Disposition
      let resolvedFilename = defaultFilename;
      const disposition = res.headers.get("content-disposition");
      if (disposition) {
        const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
        const normalMatch = disposition.match(/filename="?([^";]+)"?/i);
        if (utf8Match && utf8Match[1]) {
          resolvedFilename = decodeURIComponent(utf8Match[1]);
        } else if (normalMatch && normalMatch[1]) {
          resolvedFilename = normalMatch[1];
        }
      }
      setDisplayFilename(resolvedFilename);

      const blob = await res.blob();

      // สลับเป็นสถานะสำเร็จ (ไฟเขียว, แถบเต็ม 100%)
      setIsReady(true);

      // ทำการดาวน์โหลดลงเครื่อง
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = resolvedFilename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 2000);

      // แสดง Animation สำเร็จสักครู่แล้วปิดหน้าต่างอัตโนมัติ
      setTimeout(() => {
        setIsOpen(false);
      }, 1800);
    } catch (err: unknown) {
      console.error("Export error:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "ไม่สามารถส่งออกไฟล์ได้ในขณะนี้"
      );
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleExport}
        className={className}
        title="คลิกเพื่อส่งออก Excel"
      >
        {children || "📥 ส่งออก Excel"}
      </button>

      {isOpen && (
        <div
          className={styles.modalOverlay}
          onClick={(e) => {
            // คลิกพื้นหลังเพื่อปิดได้เฉพาะเมื่อเกิด Error หรือพร้อมแล้ว
            if (e.target === e.currentTarget && (isReady || errorMessage)) {
              handleClose();
            }
          }}
        >
          <div
            className={`la-12 ${isReady ? "is-ready" : ""}`}
            data-state={isReady ? "ready" : "loading"}
          >
            <section
              className="la-12__card"
              role="status"
              aria-live="polite"
              aria-label={`Exporting ${displayFilename}`}
            >
              {/* ปุ่มปิดมุมบนขวา */}
              <button
                type="button"
                className="la-12-close-btn"
                onClick={handleClose}
                aria-label="ปิดหน้าต่าง"
                title="ปิด"
              >
                ✕
              </button>

              {/* เครื่องพิมพ์ 3D Animation */}
              <div className="la-12__machine" aria-hidden="true">
                <span className="la-12__tray"></span>
                <span className="la-12__body">
                  <span className="la-12__led"></span>
                  <span className="la-12__vent"></span>
                </span>
                <span className="la-12__slot">
                  <span className="la-12__sheet">
                    <i></i>
                    <i></i>
                    <i></i>
                    <i></i>
                    <i></i>
                    <i></i>
                  </span>
                </span>
              </div>

              {/* ข้อความและชื่อไฟล์ */}
              <div className="la-12__copy">
                <p className="la-12__label">
                  {errorMessage ? (
                    <span className="text-rose-500">เกิดข้อผิดพลาด</span>
                  ) : (
                    <>
                      <span className="la-12__load">กำลังพิมพ์ส่งออก Excel...</span>
                      <span className="la-12__ready">ดาวน์โหลดสำเร็จแล้ว!</span>
                    </>
                  )}
                </p>
                <p className="la-12__name">
                  {errorMessage ? errorMessage : displayFilename}
                </p>
              </div>

              {/* แถบ Progress Bar */}
              {!errorMessage && (
                <>
                  <div
                    className="la-12__track"
                    role="progressbar"
                    aria-valuemin={1}
                    aria-valuemax={5}
                    aria-valuenow={isReady ? 5 : 3}
                    aria-valuetext={isReady ? "Page 5 of 5" : "Page 3 of 5"}
                  >
                    <span className="la-12__fill"></span>
                  </div>
                  <p className="la-12__page"></p>
                </>
              )}

              {/* ปุ่มกดปิดกรณีเกิด Error */}
              {errorMessage && (
                <button
                  type="button"
                  onClick={handleClose}
                  className="mt-2 px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg transition"
                >
                  ปิดหน้าต่าง
                </button>
              )}
            </section>
          </div>
        </div>
      )}
    </>
  );
}
