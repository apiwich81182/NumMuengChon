import { requireUserPage } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CompleteJobForm from "./CompleteJobForm";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

export const metadata = {
  title: "บันทึกจบงานสูบส้วม | ระบบจัดการรถสูบส้วม",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CompleteJobPage({ params }: PageProps) {
  const currentUser = await requireUserPage("/login");
  const { id } = await params;

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      user: true,
      driver2: true,
      vehicle: true,
      customer: true,
    },
  });

  if (!job) {
    notFound();
  }

  // Check authorization: Driver must be driver1, driver2, or Admin
  if (
    currentUser.role !== "ADMIN" &&
    job.userId !== currentUser.id &&
    job.driver2Id !== currentUser.id
  ) {
    return (
      <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-6 rounded-2xl shadow-sm text-center max-w-sm">
          <p className="text-red-600 font-bold mb-3">⛔ ไม่มีสิทธิ์เข้าถึงงานนี้</p>
          <Link
            href="/jobs"
            className="inline-block px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-semibold"
          >
            กลับหน้ารายการงาน
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 py-6 px-4">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm p-6 border border-slate-200">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <Link
              href="/jobs"
              className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 mb-2 transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>กลับหน้ารายการงาน</span>
            </Link>
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <span>📸 บันทึกจบงาน</span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                {job.status === "COMPLETED" ? "แก้ไขข้อมูล" : "จบงาน"}
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              ทะเบียนรถ {job.vehicle.plateNumber} • ลูกค้า: {job.customerName}
            </p>
          </div>
        </div>

        <CompleteJobForm
          job={{
            ...job,
            price: Number(job.price),
          }}
        />
      </div>
    </main>
  );
}
