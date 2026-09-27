import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import { getCurrentUser } from "@/lib/auth";
import { ToastContainer } from "@/components/Toast";

export const metadata: Metadata = {
  title: "ระบบจัดการรถสูบส้วม | หนุ่มเมืองชน",
  description: "ระบบบริหารจัดการงานสูบสิ่งปฏิกูลและรถบริการแบบครบวงจร รวดเร็ว แม่นยำ โปร่งใส เรียลไทม์",
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
      <body className="antialiased bg-slate-50 min-h-screen text-slate-800 selection:bg-blue-600 selection:text-white">
        <ToastContainer />
        <AppShell user={user}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}