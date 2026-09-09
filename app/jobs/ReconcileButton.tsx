"use client";

import { useState } from "react";
import { toggleJobReconciled } from "@/actions/jobs";

export default function ReconcileButton({
  jobId,
  isReconciled,
  isAdmin,
}: {
  jobId: string;
  isReconciled: boolean;
  isAdmin: boolean;
}) {
  const [loading, setLoading] = useState(false);

  if (!isAdmin) {
    return (
      <span
        className={`text-[11px] px-2 py-0.5 rounded font-medium ${
          isReconciled ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
        }`}
      >
        {isReconciled ? "✓ ส่งเงินแล้ว" : "⏳ ยังไม่ส่งเงิน"}
      </span>
    );
  }

  async function handleToggle() {
    setLoading(true);
    await toggleJobReconciled(jobId, isReconciled);
    setLoading(false);
  }

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`text-[11px] px-2.5 py-1 rounded-md font-semibold transition border ${
        isReconciled
          ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300"
          : "bg-amber-500 text-white border-amber-500 hover:bg-amber-600 shadow-sm"
      }`}
    >
      {loading ? "..." : isReconciled ? "✓ รับเงินแล้ว (คลิกเพื่อยกเลิก)" : "📥 กดรับเงินสด"}
    </button>
  );
}