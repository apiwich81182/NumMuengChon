import { prisma } from "../lib/prisma";

async function main() {
  console.log("🚀 เริ่มต้นกระบวนการ Backfill ข้อมูลลูกค้าจากตาราง Job...");

  const jobs = await prisma.job.findMany({
    orderBy: { createdAt: "desc" },
  });

  console.log(`พบรายการงานทั้งหมด ${jobs.length} รายการ`);

  let customerCreatedCount = 0;
  let jobUpdatedCount = 0;

  for (const job of jobs) {
    const rawPhone = job.customerPhone?.trim();
    if (!rawPhone) continue;

    // หาหรือสร้าง Customer
    let customer = await prisma.customer.findUnique({
      where: { phone: rawPhone },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          phone: rawPhone,
          name: job.customerName || "ไม่ระบุชื่อ",
          address: job.address,
          latitude: job.latitude,
          longitude: job.longitude,
          note: job.note,
        },
      });
      customerCreatedCount++;
    } else {
      // อัปเดตพิกัดหรือที่อยู่ถ้ามีข้อมูลใหม่กว่า
      if (!customer.address && job.address) {
        customer = await prisma.customer.update({
          where: { id: customer.id },
          data: {
            address: job.address,
            latitude: job.latitude ?? customer.latitude,
            longitude: job.longitude ?? customer.longitude,
          },
        });
      }
    }

    // อัปเดต job ให้ผูกกับ customerId
    if (job.customerId !== customer.id) {
      await prisma.job.update({
        where: { id: job.id },
        data: {
          customerId: customer.id,
          // ให้แน่ใจว่างานเก่าๆ ทุกงานมีสถานะ COMPLETED
          status: job.status || "COMPLETED",
        },
      });
      jobUpdatedCount++;
    }
  }

  console.log(`✅ สรุปผล:`);
  console.log(`- สร้างลูกค้าใหม่ใน Customer: ${customerCreatedCount} ราย`);
  console.log(`- อัปเดตเชื่อมโยงใน Job: ${jobUpdatedCount} รายการ`);
}

main()
  .catch((e) => {
    console.error("❌ เกิดข้อผิดพลาด:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

