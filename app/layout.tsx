import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import BottomNav from "@/components/BottomNav";
import { getCurrentUser } from "@/lib/auth";
import { ToastContainer } from "@/components/Toast";

export const metadata: Metadata = {
  title: "ระบบจัดการรถสูบส้วม",
  description: "Waste Truck Operations & Management System",
  manifest: "/manifest.json",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html lang="th">
      <body className="antialiased pb-20 sm:pb-8 bg-slate-50 min-h-screen">
        <ToastContainer />
        <Navbar user={user} />
        {children}
        <BottomNav user={user} />
      </body>
    </html>
  );
}