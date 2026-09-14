"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

// app/jobs/actions.ts
export async function toggleJobReconciled(formData: FormData) {
  const currentUser = await getCurrentUser();
  
  // ตรวจสอบสิทธิ์ ต้องเป็นแอดมินเท่านั้น
  if (!currentUser || currentUser.role !== "ADMIN") {
    throw new Error("เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถเปลี่ยนสถานะรับเงินสดได้");
  }

  const jobId = formData.get("jobId") as string;
  if (!jobId) return;

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { isReconciled: true },
  });

  if (!job) return;

  await prisma.job.update({
    where: { id: jobId },
    data: {
      isReconciled: !job.isReconciled,
    },
  });

  revalidatePath("/jobs");
  revalidatePath("/admin/dashboard");
}