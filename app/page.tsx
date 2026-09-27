import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import LandingPage from "@/components/landing/LandingPage";

export const revalidate = 60; // แคช 60 วินาที เพื่อประสิทธิภาพสูงสุด

export default async function Home() {
  const user = await getCurrentUser();

  // ดึงสถิติภาพรวมแบบ Real-time จากฐานข้อมูล Prisma
  const [totalJobs, totalVolumeResult, activeVehicles, activeDrivers] = await Promise.all([
    prisma.job.count().catch(() => 0),
    prisma.job.aggregate({
      _sum: { volumePumped: true },
    }).catch(() => ({ _sum: { volumePumped: 0 } })),
    prisma.vehicle.count({ where: { isActive: true } }).catch(() => 0),
    prisma.user.count({ where: { role: "DRIVER" } }).catch(() => 0),
  ]);

  const totalVolume = totalVolumeResult._sum.volumePumped || 0;

  return (
    <LandingPage
      user={user}
      stats={{
        totalJobs,
        totalVolume,
        activeVehicles,
        activeDrivers,
      }}
    />
  );
}
