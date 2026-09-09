import { prisma } from "../lib/prisma";

async function main() {
  console.log("🧹 เริ่มล้างข้อมูลธุรกรรมทดสอบ...");

  // ลบตามลำดับความสัมพันธ์ Foreign Key
  await prisma.expense.deleteMany();
  console.log("✅ ล้างข้อมูล Expense เรียบร้อย");

  await prisma.job.deleteMany();
  console.log("✅ ล้างข้อมูล Job เรียบร้อย");

  await prisma.attendance.deleteMany();
  console.log("✅ ล้างข้อมูล Attendance เรียบร้อย");

  console.log("✨ ข้อมูลทดสอบถูกล้างทั้งหมดแล้ว (User และ Vehicle ยังคงอยู่)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });