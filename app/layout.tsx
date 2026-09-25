import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { getCurrentUser } from "@/lib/auth";
import { ToastContainer } from "@/components/Toast";

export const metadata: Metadata = {
  title: "ระบบจัดการรถสูบส้วม",
  description: "Waste Truck Operations & Management System",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico" },
    ],
    apple: "/apple-icon.png",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html lang="th">
      <body className="antialiased bg-slate-50 min-h-screen text-slate-800">
        <ToastContainer />
        {user ? (
          <div className="flex flex-col lg:flex-row min-h-screen">
            <Sidebar user={user} />
            <div className="flex-1 flex flex-col min-w-0 pb-8">
              {children}
            </div>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}