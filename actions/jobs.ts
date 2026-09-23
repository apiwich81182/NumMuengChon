"use server";

import { prisma } from "@/lib/prisma";
import { uploadImageToStorage } from "@/lib/upload";
import { requireUserAction, requireAdminAction } from "@/lib/auth";
import { sendLineJobAlert, sendLineJobAssignedAlert } from "@/lib/line";
import { toggleJobReconciled as toggleJobReconciledService } from "@/lib/job-service";
import { revalidateJobs } from "@/lib/revalidation";
import { revalidatePath } from "next/cache";

/**
 * 1. สร้างงานแบบเสร็จทันที (On-the-spot creation by Driver or Admin)
 */
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

    // Auto-save หรือเชื่อมโยงข้อมูลลูกค้า
    let customerId: string | null = null;
    const trimmedPhone = customerPhone?.trim();
    if (trimmedPhone) {
      try {
        const savedCustomer = await prisma.customer.upsert({
          where: { phone: trimmedPhone },
          update: {
            name: customerName?.trim() || undefined,
            address: address || undefined,
            latitude: lat ?? undefined,
            longitude: lng ?? undefined,
          },
          create: {
            phone: trimmedPhone,
            name: customerName?.trim() || "ไม่ระบุชื่อ",
            address,
            latitude: lat,
            longitude: lng,
          },
        });
        customerId = savedCustomer.id;
      } catch (e) {
        console.error("Auto-save customer error in createJob:", e);
      }
    }

    const newJob = await prisma.job.create({
      data: {
        status: "COMPLETED",
        userId: driver1Id,
        driver2Id: driver2Id || null,
        vehicleId,
        customerId,
        customerName: customerName?.trim() || "ลูกค้าทั่วไป",
        customerPhone: trimmedPhone,
        volumePumped,
        price,
        paymentMethod,
        address,
        beforePhotoUrl,
        afterPhotoUrl,
        slipPhotoUrl,
        latitude: lat,
        longitude: lng,
        completedAt: new Date(),
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
    revalidatePath("/admin/customers");
    return { success: true, jobId: newJob.id };
  } catch (error) {
    console.error("Error creating job:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการบันทึกข้อมูล" };
  }
}

/**
 * 2. แอดมินมอบหมายงานให้พนักงานขับรถ (Dispatch / Assign Job)
 */
export async function assignJob(formData: FormData) {
  try {
    const auth = await requireAdminAction();
    if (!auth.success) return auth;

    const driver1Id = (formData.get("driver1Id") as string)?.trim();
    const driver2Id = (formData.get("driver2Id") as string)?.trim() || null;
    const vehicleId = (formData.get("vehicleId") as string)?.trim();
    const customerName = (formData.get("customerName") as string)?.trim();
    const customerPhone = (formData.get("customerPhone") as string)?.trim();
    const address = (formData.get("address") as string)?.trim() || null;
    const note = (formData.get("note") as string)?.trim() || null;
    const appointmentDateRaw = (formData.get("appointmentDate") as string)?.trim();
    const appointmentDate = appointmentDateRaw ? new Date(appointmentDateRaw) : null;
    const estimatedPrice = Number(formData.get("price") || 0);

    const lat = formData.get("latitude") ? parseFloat(formData.get("latitude") as string) : null;
    const lng = formData.get("longitude") ? parseFloat(formData.get("longitude") as string) : null;

    if (!driver1Id) return { success: false, error: "กรุณาเลือกคนขับหลัก" };
    if (!vehicleId) return { success: false, error: "กรุณาเลือกรถประจำงาน" };
    if (!customerPhone) return { success: false, error: "กรุณาระบุเบอร์โทรศัพท์ลูกค้า" };

    // Auto-save ข้อมูลลูกค้าใน Customer Table
    let customerId: string | null = null;
    try {
      const savedCustomer = await prisma.customer.upsert({
        where: { phone: customerPhone },
        update: {
          name: customerName || undefined,
          address: address || undefined,
          latitude: lat ?? undefined,
          longitude: lng ?? undefined,
          note: note || undefined,
        },
        create: {
          phone: customerPhone,
          name: customerName || "ไม่ระบุชื่อ",
          address,
          latitude: lat,
          longitude: lng,
          note,
        },
      });
      customerId = savedCustomer.id;
    } catch (err) {
      console.error("Auto-save customer error in assignJob:", err);
    }

    const newJob = await prisma.job.create({
      data: {
        status: "ASSIGNED",
        userId: driver1Id,
        driver2Id: driver2Id || null,
        vehicleId,
        customerId,
        customerName: customerName || "ลูกค้าทั่วไป",
        customerPhone,
        address,
        latitude: lat,
        longitude: lng,
        volumePumped: 0,
        price: estimatedPrice,
        paymentMethod: "CASH",
        paymentStatus: "PAID",
        appointmentDate,
        assignedAt: new Date(),
        completedAt: null,
        note,
      },
      include: {
        user: true,
        driver2: true,
        vehicle: true,
      },
    });

    // แจ้งเตือนเข้า LINE กลุ่ม/ผู้ดูแลว่ามีงานมอบหมายใหม่
    sendLineJobAssignedAlert({
      customerName: newJob.customerName,
      customerPhone: newJob.customerPhone || "-",
      plateNumber: newJob.vehicle.plateNumber,
      driverName: newJob.user.name,
      driver2Name: newJob.driver2?.name,
      address: newJob.address,
      appointmentDate: newJob.appointmentDate,
      note: newJob.note,
      latitude: newJob.latitude,
      longitude: newJob.longitude,
    }).catch((err) => console.error("Line dispatch alert error:", err));

    revalidateJobs();
    revalidatePath("/admin/customers");
    return { success: true, jobId: newJob.id };
  } catch (error) {
    console.error("Error assigning job:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการมอบหมายงาน" };
  }
}

/**
 * 3. พนักงานกดจบงาน (Complete Assigned Job)
 */
export async function completeJob(formData: FormData) {
  try {
    const auth = await requireUserAction();
    if (!auth.success) return auth;

    const jobId = (formData.get("jobId") as string)?.trim();
    if (!jobId) return { success: false, error: "ไม่พบรหัสงาน" };

    const existingJob = await prisma.job.findUnique({
      where: { id: jobId },
      include: { user: true, driver2: true, vehicle: true },
    });
    if (!existingJob) return { success: false, error: "ไม่พบข้อมูลงานนี้ในระบบ" };

    const customerName = (formData.get("customerName") as string)?.trim() || existingJob.customerName;
    const customerPhone = (formData.get("customerPhone") as string)?.trim() || existingJob.customerPhone;
    const address = (formData.get("address") as string)?.trim() || existingJob.address;
    const note = (formData.get("note") as string)?.trim() || existingJob.note;

    const volumePumped = Number(formData.get("volumePumped") || 0);
    const price = Number(formData.get("price") || 0);
    const paymentMethod = (formData.get("paymentMethod") as "CASH" | "TRANSFER") || "CASH";

    const lat = formData.get("latitude") ? parseFloat(formData.get("latitude") as string) : existingJob.latitude;
    const lng = formData.get("longitude") ? parseFloat(formData.get("longitude") as string) : existingJob.longitude;

    // รูปถ่ายงาน
    const beforePhotoFile = formData.get("beforePhoto") as File | null;
    const afterPhotoFile = formData.get("afterPhoto") as File | null;
    const slipPhotoFile = formData.get("slipPhoto") as File | null;

    const [newBeforeUrl, newAfterUrl, newSlipUrl] = await Promise.all([
      beforePhotoFile && beforePhotoFile.size > 0 ? uploadImageToStorage(beforePhotoFile, "before") : Promise.resolve(null),
      afterPhotoFile && afterPhotoFile.size > 0 ? uploadImageToStorage(afterPhotoFile, "after") : Promise.resolve(null),
      slipPhotoFile && slipPhotoFile.size > 0 ? uploadImageToStorage(slipPhotoFile, "slips") : Promise.resolve(null),
    ]);

    const beforePhotoUrl = newBeforeUrl || existingJob.beforePhotoUrl;
    const afterPhotoUrl = newAfterUrl || existingJob.afterPhotoUrl;
    const slipPhotoUrl = newSlipUrl || existingJob.slipPhotoUrl;

    // อัปเดตข้อมูลลูกค้า
    let customerId = existingJob.customerId;
    if (customerPhone) {
      try {
        const savedCustomer = await prisma.customer.upsert({
          where: { phone: customerPhone },
          update: {
            name: customerName,
            address: address || undefined,
            latitude: lat ?? undefined,
            longitude: lng ?? undefined,
            note: note || undefined,
          },
          create: {
            phone: customerPhone,
            name: customerName || "ไม่ระบุชื่อ",
            address,
            latitude: lat,
            longitude: lng,
            note,
          },
        });
        customerId = savedCustomer.id;
      } catch (err) {
        console.error("Auto-save customer error in completeJob:", err);
      }
    }

    const updatedJob = await prisma.job.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        customerId,
        customerName,
        customerPhone,
        address,
        latitude: lat,
        longitude: lng,
        volumePumped,
        price,
        paymentMethod,
        beforePhotoUrl,
        afterPhotoUrl,
        slipPhotoUrl,
        note,
        completedAt: new Date(),
      },
      include: {
        user: true,
        driver2: true,
        vehicle: true,
      },
    });

    // ส่งแจ้งเตือนเข้า LINE เมื่อพนักงานจบงานจริง (พร้อมรูป/ยอดเงิน/ปริมาณสูบ)
    sendLineJobAlert({
      customerName: updatedJob.customerName,
      customerPhone: updatedJob.customerPhone || "-",
      plateNumber: updatedJob.vehicle.plateNumber,
      driverName: updatedJob.user.name,
      driver2Name: updatedJob.driver2?.name,
      volumePumped: updatedJob.volumePumped,
      price: Number(updatedJob.price),
      paymentMethod: updatedJob.paymentMethod,
      latitude: updatedJob.latitude,
      longitude: updatedJob.longitude,
      slipPhotoUrl: updatedJob.slipPhotoUrl,
    }).catch((err) => console.error("Line alert background error:", err));

    revalidateJobs();
    revalidatePath("/admin/customers");
    return { success: true, jobId: updatedJob.id };
  } catch (error) {
    console.error("Error completing job:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการบันทึกจบงาน" };
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