"use server";

import { prisma } from "@/lib/prisma";
import { uploadImageToStorage } from "@/lib/upload";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { sendLineJobAlert } from "@/lib/line";

export async function createJob(formData: FormData) {
  try {
    const currentUser = await getCurrentUser();
    const isAdmin = currentUser?.role === "ADMIN";
    const vehicleId = formData.get("vehicleId") as string;
    const customerName = formData.get("customerName") as string;
    const customerPhone = formData.get("customerPhone") as string;
    const address = formData.get("address") as string;
    const volumePumped = Number(formData.get("volumePumped") || 0);
    const price = Number(formData.get("price") || 0);
    const paymentMethod = (formData.get("paymentMethod") as "CASH" | "TRANSFER") || "CASH";
    const driver1Id = isAdmin
      ? (formData.get("driver1Id") as string) || currentUser?.id || ""
      : currentUser?.id || "";
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

    
    if (!currentUser) {
      return { success: false, error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" };
    }

    const newJob = await prisma.job.create({
      data: {
        userId: driver1Id,
        driver2Id: driver2Id || null,
        vehicleId,
        customerName,
        customerPhone,
        volumePumped,
        price,
        paymentMethod: paymentMethod as any,
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

    revalidatePath("/jobs");
    revalidatePath("/admin/dashboard");
    return { success: true };

    revalidatePath("/jobs");
    revalidatePath("/admin/dashboard");
    return { success: true, jobId: newJob.id };
  } catch (error) {
    console.error("Error creating job:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" };
  }
}

// สลับสถานะการตรวจรับเงินสด (Reconcile Cash)
export async function toggleJobReconciled(jobId: string, currentStatus: boolean) {
  const currentUser = await getCurrentUser();
  if (currentUser?.role !== "ADMIN") {
    return { success: false, error: "เฉพาะผู้ดูแลระบบเท่านั้นที่มีสิทธิ์ตรวจรับเงิน" };
  }

  try {
    await prisma.job.update({
      where: { id: jobId },
      data: {
        isReconciled: !currentStatus,
        reconciledAt: !currentStatus ? new Date() : null,
      },
    });

    revalidatePath("/jobs");
    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch {
    return { success: false, error: "เกิดข้อผิดพลาดในการอัปเดตสถานะเงินสด" };
  }
}