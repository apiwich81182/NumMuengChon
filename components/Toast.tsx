"use client";

import React, { useEffect, useState } from "react";

export type ToastType = "success" | "error" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

type ToastListener = (toast: ToastItem) => void;
const listeners = new Set<ToastListener>();

export const toast = {
  success(message: string) {
    const item: ToastItem = {
      id: Math.random().toString(36).substring(2, 9),
      type: "success",
      message,
    };
    listeners.forEach((fn) => fn(item));
  },
  error(message: string) {
    const item: ToastItem = {
      id: Math.random().toString(36).substring(2, 9),
      type: "error",
      message,
    };
    listeners.forEach((fn) => fn(item));
  },
  info(message: string) {
    const item: ToastItem = {
      id: Math.random().toString(36).substring(2, 9),
      type: "info",
      message,
    };
    listeners.forEach((fn) => fn(item));
  },
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const handleAdd = (newToast: ToastItem) => {
      setToasts((prev) => [...prev, newToast]);

      // Auto dismiss after 3.5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 3500);
    };

    listeners.add(handleAdd);
    return () => {
      listeners.delete(handleAdd);
    };
  }, []);

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none px-3">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start justify-between gap-2 p-3.5 rounded-xl shadow-lg border text-xs sm:text-sm font-medium transition-all duration-300 animate-in fade-in slide-in-from-top-2 ${
            t.type === "success"
              ? "bg-white text-emerald-900 border-emerald-200"
              : t.type === "error"
              ? "bg-white text-rose-900 border-rose-200"
              : "bg-white text-blue-900 border-blue-200"
          }`}
        >
          <div className="flex items-start gap-2.5">
            <span className="text-base flex-shrink-0">
              {t.type === "success" ? "✅" : t.type === "error" ? "❌" : "ℹ️"}
            </span>
            <span className="leading-snug pt-0.5">{t.message}</span>
          </div>

          <button
            type="button"
            onClick={() => removeToast(t.id)}
            className="text-slate-400 hover:text-slate-600 transition p-0.5 text-xs rounded"
            aria-label="ปิดการแจ้งเตือน"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

