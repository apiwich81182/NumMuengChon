import HamsterLoader from "@/components/HamsterLoader";

export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <HamsterLoader text="กำลังเตรียมข้อมูลพนักงาน..." />
    </main>
  );
}