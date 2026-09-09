"use client";

import { useState } from "react";
import { updateLeaveStatus } from "@/actions/attendance";

export default function LeaveActionButtons({
  attendanceId,
  isApproved,
}: {
  attendanceId: string;
  isApproved: boolean;
}) {
  const [loading, setLoading] = useState(false);

  async function handleAction(approved: boolean) {
    setLoading(true);
    await updateLeaveStatus(attendanceId, approved);
    setLoading(false);
  }

  return (
    <div className="flex items-center justify-end gap-1.5">
      {isApproved ? (
        <span className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-semibold">
          ✓ อนุมัติแล้ว
        </span>
      ) : (
        <span className="text-xs px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-md font-semibold">
          ⏳ รออนุมัติ
        </span>
      )}

      <button
        onClick={() => handleAction(!isApproved)}
        disabled={loading}
        className={`text-xs px-2 py-1 rounded transition border ${
          isApproved
            ? "text-rose-600 hover:bg-rose-50 border-rose-200"
            : "bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
        }`}
      >
        {isApproved ? "ยกเลิก" : "อนุมัติ"}
      </button>
    </div>
  );
}