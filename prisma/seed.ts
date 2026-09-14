import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 เริ่มต้นการสร้าง Mockup Data สำหรับปี 2025...");

  // 1. ดึงข้อมูลจริงที่มีอยู่ในฐานข้อมูล
  const admin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });

  let drivers = await prisma.user.findMany({
    where: { role: "DRIVER" },
  });

  const vehicles = await prisma.vehicle.findMany({
    where: { isActive: true },
  });

  // ตรวจสอบว่ามีข้อมูลพื้นฐานในระบบหรือยัง
  if (!admin) {
    throw new Error("⚠️ ไม่พบผู้ใช้สิทธิ์ ADMIN ในระบบ กรุณาสร้างบัญชี Admin ก่อนรัน seed");
  }

  if (vehicles.length === 0) {
    throw new Error("⚠️ ไม่พบข้อมูลรถในระบบ กรุณาเพิ่มรถผ่านหน้าระบบก่อนรัน seed");
  }

  // หากยังไม่มีคนขับ ให้ใช้ admin เป็นตัวแทนบันทึก
  const activeUsers = drivers.length > 0 ? drivers : [admin];

  const customerNames = [
    "หอพักสุขใจ", "ร้านอาหารริมบึง", "โรงงานไทยรวม", "หมู่บ้านกรีนวิลล์ บ้านเลขที่ 12/4",
    "ปั๊มน้ำมัน ปตท.", "หอพักบุญสิริ", "บ้านคุณวิชัย", "ตลาดเทศบาล ล็อก 4",
    "โรงเรียนบ้านโนนทัน", "อพาร์ตเมนต์ศิริโชค"
  ];

  const phones = ["0818736191", "0895285551", "0861122334", "0849988776", "0852233445"];

  // 2. สร้างข้อมูลปี 2025 (มกราคม - ธันวาคม)
  for (let month = 0; month < 12; month++) {
    for (let day = 1; day <= 28; day += 3) {
      const jobDate = new Date(2025, month, day, 9 + (day % 8), 15 + (day % 40));
      const vehicle = vehicles[day % vehicles.length];
      const mainDriver = activeUsers[day % activeUsers.length];
      const helper = activeUsers.length > 1 ? activeUsers[(day + 1) % activeUsers.length] : null;

      const price = 500 + (day % 5) * 200;
      const volume = 800 + (day % 4) * 400;
      const paymentMethod = day % 2 === 0 ? "CASH" : "TRANSFER";

      // 2.1 สร้างงานสูบส้วม (Job)
      await prisma.job.create({
        data: {
          customerName: customerNames[(day + month) % customerNames.length],
          customerPhone: phones[(day + month) % phones.length],
          price,
          volumePumped: volume,
          paymentMethod: paymentMethod as any,
          isReconciled: true,
          vehicleId: vehicle.id,
          userId: mainDriver.id,
          ...(helper ? { driver2Id: helper.id } : {}),
          completedAt: jobDate,
          createdAt: jobDate,
        },
      });

      // 2.2 สร้างรายจ่ายค่าน้ำมัน
      if (day % 6 === 1) {
        await prisma.expense.create({
          data: {
            amount: 1000 + (day % 3) * 300,
            category: "FUEL",
            note: "เติมดีเซล ปตท.",
            isAdminOnly: false,
            vehicleId: vehicle.id,
            userId: mainDriver.id,
            createdAt: jobDate,
          },
        });
      }

      // 2.3 สร้างรายจ่ายค่าจุดทิ้ง
      if (day % 6 === 4) {
        await prisma.expense.create({
          data: {
            amount: 200 + (day % 2) * 100,
            category: "DISPOSAL_FEE",
            note: "ค่าจุดทิ้งสิ่งปฏิกูล",
            isAdminOnly: false,
            vehicleId: vehicle.id,
            userId: mainDriver.id,
            createdAt: jobDate,
          },
        });
      }
    }

    // 2.4 สิ้นเดือน: ค่าซ่อมบำรุง และ เงินเดือน
    const endOfMonth = new Date(2025, month, 28, 17, 0);

    if (month % 2 === 0) {
      await prisma.expense.create({
        data: {
          amount: 2500 + (month % 3) * 800,
          category: "MAINTENANCE",
          note: `ซ่อมบำรุงประจำรอบ (${vehicles[0].plateNumber})`,
          isAdminOnly: false,
          vehicleId: vehicles[0].id,
          userId: admin.id,
          createdAt: endOfMonth,
        },
      });
    }

    // ค่าแรง/เงินเดือน
    for (const d of activeUsers) {
      await prisma.expense.create({
        data: {
          amount: 15000,
          category: "SALARY",
          note: `เงินเดือน ${d.name} ประจำเดือน ${month + 1}/2025`,
          isAdminOnly: true,
          userId: admin.id,
          createdAt: endOfMonth,
        },
      });
    }
  }

  console.log("✅ สร้าง Mockup Data ปี 2025 เรียบร้อยแล้ว!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });