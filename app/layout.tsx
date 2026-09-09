import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { getCurrentUser } from "@/lib/auth";

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
      <body className="antialiased pt-14 pb-20 md:pt-28 md:pb-8 bg-slate-50 min-h-screen">
        <Navbar user={user} />
        {children}
      </body>
    </html>
  );
}