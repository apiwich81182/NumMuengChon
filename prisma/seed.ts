import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 เริ่มต้นสร้างข้อมูลจำลอง (Seeding)...");

  // 1. สร้างรถ 2 คัน
  const truck1 = await prisma.vehicle.upsert({
    where: { plateNumber: "81-9988 ขอนแก่น" },
    update: {},
    create: {
      plateNumber: "81-9988 ขอนแก่น",
      capacityLiters: 4000,
    },
  });

  const truck2 = await prisma.vehicle.upsert({
    where: { plateNumber: "82-1234 ขอนแก่น" },
    update: {},
    create: {
      plateNumber: "82-1234 ขอนแก่น",
      capacityLiters: 6000,
    },
  });

  // 2. สร้าง User แอดมิน และ พนักงานขับรถ
  const admin = await prisma.user.upsert({
    where: { phone: "0811111111" },
    update: {},
    create: {
      phone: "0811111111",
      name: "แอดมิน สมชาย",
      password: "password123", // ในอนาคตค่อยทำ hash ด้วย bcrypt
      role: Role.ADMIN,
    },
  });

  const driver = await prisma.user.upsert({
    where: { phone: "0899999999" },
    update: {},
    create: {
      phone: "0899999999",
      name: "สมศักดิ์ ขับไว",
      password: "password123",
      role: Role.DRIVER,
    },
  });

  console.log("✅ ข้อมูลจำลองสร้างเสร็จเรียบร้อย:");
  console.log({ truck1: truck1.plateNumber, truck2: truck2.plateNumber, admin: admin.name, driver: driver.name });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });