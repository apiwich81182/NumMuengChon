import { prisma } from "@/lib/prisma";

export async function toggleJobReconciled(jobId: string) {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { isReconciled: true },
  });

  if (!job) {
    return { success: false as const, error: "ไม่พบรายการงานที่ต้องการตรวจรับเงิน" };
  }

  const isReconciled = !job.isReconciled;
  await prisma.job.update({
    where: { id: jobId },
    data: {
      isReconciled,
      reconciledAt: isReconciled ? new Date() : null,
    },
  });

  return { success: true as const };
}
