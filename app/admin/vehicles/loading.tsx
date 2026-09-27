import TruckPageLoader from "@/components/animations/TruckPageLoader";

export default function Loading() {
  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <TruckPageLoader text="กำลังเตรียมข้อมูลรถ..." />
    </main>
  );
}