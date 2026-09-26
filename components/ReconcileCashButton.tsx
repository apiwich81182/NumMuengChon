"use client";

import { useState } from "react";
import { toggleJobReconciled } from "@/actions/jobs";
import { toast } from "@/components/Toast";
import { formatUserErrorMessage } from "@/lib/formatters";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface ReconcileCashButtonProps {
  jobId: string;
  isReconciled: boolean;
}

export default function ReconcileCashButton({
  jobId,
  isReconciled,
}: ReconcileCashButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleToggle() {
    setLoading(true);
    try {
      const res = await toggleJobReconciled(jobId, isReconciled);
      if (res.success) {
        toast.success(
          isReconciled ? "ยกเลิกสถานะรับเงินสดแล้ว" : "บันทึกตรวจรับเงินสดเรียบร้อยแล้ว"
        );
        router.refresh();
      } else {
        toast.error(formatUserErrorMessage(res.error, "เกิดข้อผิดพลาดในการเปลี่ยนสถานะ"));
      }
    } catch (err) {
      toast.error(formatUserErrorMessage(err, "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่ออัปเดตสถานะรับเงินได้"));
    } finally {
      setLoading(false);
    }
  }

  return isReconciled ? (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className="px-3 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-300 transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
      title="คลิกเพื่อยกเลิกสถานะรับเงิน"
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "✓"}
      <span>รับเงินแล้ว (คลิกเพื่อยกเลิก)</span>
    </button>
  ) : (
    <button
      type="button"
      onClick={handleToggle}
      disabled={loading}
      className="px-3 py-1 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded-lg shadow-xs transition flex items-center gap-1 cursor-pointer disabled:opacity-50"
      title="คลิกเพื่อยืนยันว่ารับเงินสดแล้ว"
    >
      {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "📥"}
      <span>กดรับเงินสด</span>
    </button>
  );
}

