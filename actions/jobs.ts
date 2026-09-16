"use server";

import { prisma } from "@/lib/prisma";
import { uploadImageToStorage } from "@/lib/upload";
import { requireUserAction, requireAdminAction } from "@/lib/auth";
import { sendLineJobAlert } from "@/lib/line";
import { toggleJobReconciled as toggleJobReconciledService } from "@/lib/job-service";
import { revalidateJobs } from "@/lib/revalidation";

export async function createJob(formData: FormData) {
  try {
    const auth = await requireUserAction();
    if (!auth.success) {
      return auth;
    }
    const currentUser = auth.user;
    const isAdmin = currentUser.role === "ADMIN";
    const vehicleId = formData.get("vehicleId") as string;
    const customerName = formData.get("customerName") as string;
    const customerPhone = formData.get("customerPhone") as string;
    const address = formData.get("address") as string;
    const volumePumped = Number(formData.get("volumePumped") || 0);
    const price = Number(formData.get("price") || 0);
    const paymentMethod = (formData.get("paymentMethod") as "CASH" | "TRANSFER") || "CASH";
    const driver1Id = isAdmin
      ? (formData.get("driver1Id") as string) || currentUser.id || ""
      : currentUser.id || "";
    const driver2Id = (formData.get("driver2Id") as string) || null;

    const lat = formData.get("latitude") ? parseFloat(formData.get("latitude") as string) : null;
    const lng = formData.get("longitude") ? parseFloat(formData.get("longitude") as string) : null;

    // รับไฟล์ภาพ
    const beforePhotoFile = formData.get("beforePhoto") as File | null;
    const afterPhotoFile = formData.get("afterPhoto") as File | null;
    const slipPhotoFile = formData.get("slipPhoto") as File | null;

    // อัปโหลดไฟล์ภาพทั้งหมดขนานกัน
    const [beforePhotoUrl, afterPhotoUrl, slipPhotoUrl] = await Promise.all([
      beforePhotoFile && beforePhotoFile.size > 0
        ? uploadImageToStorage(beforePhotoFile, "before")
        : Promise.resolve(null),
      afterPhotoFile && afterPhotoFile.size > 0
        ? uploadImageToStorage(afterPhotoFile, "after")
        : Promise.resolve(null),
      slipPhotoFile && slipPhotoFile.size > 0
        ? uploadImageToStorage(slipPhotoFile, "slips")
        : Promise.resolve(null),
    ]);

    const newJob = await prisma.job.create({
      data: {
        userId: driver1Id,
        driver2Id: driver2Id || null,
        vehicleId,
        customerName,
        customerPhone,
        volumePumped,
        price,
        paymentMethod,
        address,
        beforePhotoUrl,
        afterPhotoUrl,
        slipPhotoUrl,
        latitude: lat,
        longitude: lng,
      },
      include: {
        user: true,
        driver2: true,
        vehicle: true,
      },
    });

    // ส่งแจ้งเตือนเข้า LINE อัตโนมัติ (ทำงานเบื้องหลัง)
    sendLineJobAlert({
      customerName: newJob.customerName,
      customerPhone: newJob.customerPhone || "-",
      plateNumber: newJob.vehicle.plateNumber,
      driverName: newJob.user.name,
      driver2Name: newJob.driver2?.name,
      volumePumped: newJob.volumePumped,
      price: Number(newJob.price),
      paymentMethod: newJob.paymentMethod,
      latitude: newJob.latitude,
      longitude: newJob.longitude,
      slipPhotoUrl: newJob.slipPhotoUrl,
    }).catch((err) => console.error("Line alert background error:", err));

    revalidateJobs();
    return { success: true, jobId: newJob.id };
  } catch (error) {
    console.error("Error creating job:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" };
  }
}

// สลับสถานะการตรวจรับเงินสด (Reconcile Cash)
export async function toggleJobReconciled(jobId: string, currentStatus?: boolean) {
  const auth = await requireAdminAction();
  if (!auth.success) return auth;

  if (!jobId) {
    return { success: false, error: "ไม่พบรหัสงาน" };
  }

  try {
    void currentStatus;
    const result = await toggleJobReconciledService(jobId);
    if (!result.success) return result;

    revalidateJobs();
    return { success: true };
  } catch {
    return { success: false, error: "เกิดข้อผิดพลาดในการอัปเดตสถานะเงินสด" };
  }
}

// Wrapper สำหรับใช้กับ <form action={...}> ใน React Server Component
export async function toggleJobReconciledForm(formData: FormData): Promise<void> {
  const jobId = formData.get("jobId") as string;
  if (!jobId) return;
  await toggleJobReconciled(jobId);
}