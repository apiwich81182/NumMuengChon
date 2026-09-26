"use client";

import { useState } from "react";
import { updateLeaveStatus } from "@/actions/attendance";
import { toast } from "@/components/Toast";
import { formatUserErrorMessage } from "@/lib/formatters";

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
    try {
      const res = await updateLeaveStatus(attendanceId, approved);
      if (res.success) {
        toast.success(approved ? "อนุมัติคำขอลาเรียบร้อยแล้ว" : "ยกเลิกการอนุมัติคำขอลาแล้ว");
      } else {
        toast.error(formatUserErrorMessage(res.error, "เกิดข้อผิดพลาดในการอัปเดตสถานะ"));
      }
    } catch (err) {
      toast.error(formatUserErrorMessage(err, "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {isApproved ? (
        <span className="text-[11px] px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-semibold">
          ✓ อนุมัติแล้ว
        </span>
      ) : (
        <span className="text-[11px] px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-md font-semibold">
          ⏳ รออนุมัติ
        </span>
      )}

      <button
        type="button"
        onClick={() => handleAction(!isApproved)}
        disabled={loading}
        className={`text-[11px] px-2.5 py-1 rounded-lg transition font-medium border cursor-pointer ${
          isApproved
            ? "text-rose-600 hover:bg-rose-50 border-rose-200 bg-white"
            : "bg-blue-600 text-white hover:bg-blue-700 border-blue-600 shadow-sm"
        }`}
      >
        {loading ? "..." : isApproved ? "ยกเลิก" : "อนุมัติ"}
      </button>
    </div>
  );
}