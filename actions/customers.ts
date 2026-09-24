"use server";

import { prisma } from "@/lib/prisma";
import { requireUserAction, requireAdminAction } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export interface CustomerData {
  phone: string;
  name: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  note?: string | null;
}

/**
 * ค้นหาข้อมูลลูกค้าจากเบอร์โทรศัพท์ (Auto-lookup)
 * สามารถเรียกใช้ได้ทั้งตอนสร้างงาน และแอดมินจ่ายงาน
 */
export async function lookupCustomerByPhone(phone: string) {
  try {
    const auth = await requireUserAction();
    if (!auth.success) return auth;

    const trimmed = phone.trim();
    if (!trimmed || trimmed.length < 3) {
      return { success: true, customer: null };
    }

    const cleaned = trimmed.replace(/[\s-]/g, "");

    // 1. ค้นหาจาก Customer table ก่อน
    const customer = await prisma.customer.findFirst({
      where: {
        OR: [
          { phone: trimmed },
          { phone: cleaned },
          { phone: { contains: trimmed } },
        ],
      },
      include: {
        jobs: {
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            status: true,
            createdAt: true,
            price: true,
            volumePumped: true,
            vehicle: {
              select: { plateNumber: true },
            },
          },
        },
      },
    });

    if (customer) {
      return {
        success: true,
        customer: {
          id: customer.id,
          phone: customer.phone,
          name: customer.name,
          address: customer.address,
          latitude: customer.latitude,
          longitude: customer.longitude,
          note: customer.note,
          jobs: customer.jobs.map((j) => ({
            ...j,
            price: Number(j.price),
          })),
        },
      };
    }

    // 2. Fallback: ถ้ายังไม่มีใน Customer table ให้ค้นจากตาราง Job ล่าสุด
    const latestJob = await prisma.job.findFirst({
      where: {
        OR: [
          { customerPhone: trimmed },
          { customerPhone: cleaned },
          { customerPhone: { contains: trimmed } },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        customerName: true,
        customerPhone: true,
        address: true,
        latitude: true,
        longitude: true,
        note: true,
      },
    });

    if (latestJob) {
      return {
        success: true,
        customer: {
          id: null,
          phone: latestJob.customerPhone || trimmed,
          name: latestJob.customerName,
          address: latestJob.address,
          latitude: latestJob.latitude,
          longitude: latestJob.longitude,
          note: latestJob.note,
          jobs: [],
        },
      };
    }

    return { success: true, customer: null };
  } catch (error) {
    console.error("Error looking up customer:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการค้นหาลูกค้า" };
  }
}

/**
 * บันทึกหรืออัปเดตข้อมูลลูกค้า (Auto-Save หรือ Admin แก้ไข)
 */
export async function saveOrUpdateCustomer(data: CustomerData) {
  try {
    const auth = await requireUserAction();
    if (!auth.success) return auth;

    const trimmedPhone = data.phone.trim();
    if (!trimmedPhone) {
      return { success: false, error: "กรุณาระบุเบอร์โทรศัพท์ลูกค้า" };
    }

    const customer = await prisma.customer.upsert({
      where: { phone: trimmedPhone },
      update: {
        name: data.name.trim() || undefined,
        address: data.address !== undefined ? data.address : undefined,
        latitude: data.latitude !== undefined ? data.latitude : undefined,
        longitude: data.longitude !== undefined ? data.longitude : undefined,
        note: data.note !== undefined ? data.note : undefined,
      },
      create: {
        phone: trimmedPhone,
        name: data.name.trim() || "ไม่ระบุชื่อ",
        address: data.address,
        latitude: data.latitude,
        longitude: data.longitude,
        note: data.note,
      },
    });

    revalidatePath("/admin/customers");
    return { success: true, customer };
  } catch (error) {
    console.error("Error saving customer:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการบันทึกข้อมูลลูกค้า" };
  }
}

/**
 * ดึงรายการลูกค้าสำหรับแอดมิน (Pagination & Search)
 */
export async function getCustomers({
  page = 1,
  pageSize = 20,
  search = "",
}: {
  page?: number;
  pageSize?: number;
  search?: string;
}) {
  try {
    const auth = await requireAdminAction();
    if (!auth.success) return { success: false, error: auth.error, customers: [], total: 0 };

    const trimmedSearch = search.trim();
    const where = trimmedSearch
      ? {
          OR: [
            { name: { contains: trimmedSearch, mode: "insensitive" as const } },
            { phone: { contains: trimmedSearch } },
            { address: { contains: trimmedSearch, mode: "insensitive" as const } },
          ],
        }
      : {};

    const [total, rawCustomers] = await Promise.all([
      prisma.customer.count({ where }),
      prisma.customer.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { updatedAt: "desc" },
        include: {
          _count: {
            select: { jobs: true },
          },
          jobs: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              createdAt: true,
              price: true,
              status: true,
            },
          },
        },
      }),
    ]);

    const customers = rawCustomers.map((c) => ({
      id: c.id,
      phone: c.phone,
      name: c.name,
      address: c.address,
      latitude: c.latitude,
      longitude: c.longitude,
      note: c.note,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      jobCount: c._count.jobs,
      lastJobDate: c.jobs[0]?.createdAt ?? null,
      lastJobPrice: c.jobs[0] ? Number(c.jobs[0].price) : null,
    }));

    return {
      success: true,
      customers,
      total,
      totalPages: Math.ceil(total / pageSize),
      page,
    };
  } catch (error) {
    console.error("Error fetching customers:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการดึงข้อมูลลูกค้า", customers: [], total: 0 };
  }
}

/**
 * ลบข้อมูลลูกค้า (เฉพาะแอดมิน)
 * โดยจะทำการ Unlink ประวัติงานเก่าก่อน เพื่อไม่ให้ประวัติงานสูญหาย
 */
export async function deleteCustomer(id: string) {
  try {
    const auth = await requireAdminAction();
    if (!auth.success) return auth;

    await prisma.job.updateMany({
      where: { customerId: id },
      data: { customerId: null },
    });

    await prisma.customer.delete({
      where: { id },
    });

    revalidatePath("/admin/customers");
    return { success: true };
  } catch (error) {
    console.error("Error deleting customer:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการลบข้อมูลลูกค้า" };
  }
}

/**
 * ดึงประวัติการให้บริการทั้งหมดของลูกค้าคนนั้น (เฉพาะแอดมิน)
 */
export async function getCustomerHistory(customerId: string) {
  try {
    const auth = await requireAdminAction();
    if (!auth.success) return { success: false, error: auth.error };

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      return { success: false, error: "ไม่พบข้อมูลลูกค้าในระบบ" };
    }

    const jobs = await prisma.job.findMany({
      where: {
        OR: [
          { customerId: customer.id },
          { customerPhone: customer.phone },
        ],
      },
      include: {
        vehicle: { select: { plateNumber: true } },
        user: { select: { name: true } },
        driver2: { select: { name: true } },
      },
      orderBy: [
        { completedAt: "desc" },
        { createdAt: "desc" },
      ],
    });

    const mappedJobs = jobs.map((j) => ({
      id: j.id,
      customerName: j.customerName,
      customerPhone: j.customerPhone,
      volumePumped: j.volumePumped,
      price: Number(j.price),
      paymentMethod: j.paymentMethod,
      status: j.status,
      address: j.address,
      latitude: j.latitude,
      longitude: j.longitude,
      beforePhotoUrl: j.beforePhotoUrl,
      afterPhotoUrl: j.afterPhotoUrl,
      slipPhotoUrl: j.slipPhotoUrl,
      completedAt: j.completedAt,
      createdAt: j.createdAt,
      vehicle: j.vehicle,
      user: j.user,
      driver2: j.driver2,
    }));

    return {
      success: true,
      customer,
      jobs: mappedJobs,
    };
  } catch (error) {
    console.error("Error getting customer history:", error);
    return { success: false, error: "เกิดข้อผิดพลาดในการดึงประวัติลูกค้า" };
  }
}



