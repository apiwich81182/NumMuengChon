"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Truck,
  ShieldCheck,
  CheckCircle2,
  Camera,
  MapPin,
  CreditCard,
  Bell,
  Fuel,
  Calendar,
  FileSpreadsheet,
  ChevronRight,
  Menu,
  X,
  ExternalLink,
  Sparkles,
  Clock,
  ArrowUpRight,
  BarChart3,
  PhoneCall,
  MessageSquare,
  Lock,
  Check,
  Sliders,
  DollarSign,
  TrendingUp,
  Activity,
  Users,
  Compass,
} from "lucide-react";

interface LandingPageProps {
  user: {
    id: string;
    name: string;
    role: string;
  } | null;
  stats: {
    totalJobs: number;
    totalVolume: number;
    activeVehicles: number;
    activeDrivers: number;
  };
}

export default function LandingPage({ user, stats }: LandingPageProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 selection:bg-blue-600 selection:text-white font-sans antialiased">
      {/* ========================================================= */}
      {/* 🌟 1. NAVBAR ด้านบน (STICKY + GLASSMORPHISM) */}
      {/* ========================================================= */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-extrabold text-slate-900 tracking-tight leading-tight group-hover:text-blue-600 transition-colors">
                หนุ่มเมืองชน
              </span>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider -mt-0.5">
                Waste Truck Operations
              </span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2 text-sm font-semibold text-slate-600">
            <a
              href="#features"
              className="px-3.5 py-2 rounded-xl hover:text-slate-900 hover:bg-slate-100/80 transition-colors"
            >
              ฟีเจอร์เด่น
            </a>
            <a
              href="#field-workers"
              className="px-3.5 py-2 rounded-xl hover:text-slate-900 hover:bg-slate-100/80 transition-colors"
            >
              สำหรับคนหน้างาน
            </a>
            <a
              href="#executives"
              className="px-3.5 py-2 rounded-xl hover:text-slate-900 hover:bg-slate-100/80 transition-colors"
            >
              สำหรับผู้บริหาร
            </a>
            <a
              href="#demo"
              className="px-3.5 py-2 rounded-xl hover:text-slate-900 hover:bg-slate-100/80 transition-colors"
            >
              ตัวอย่างระบบ
            </a>
            <a
              href="#contact"
              className="px-3.5 py-2 rounded-xl hover:text-slate-900 hover:bg-slate-100/80 transition-colors"
            >
              ติดต่อเรา
            </a>
          </nav>

          {/* Desktop Action Buttons */}
          <div className="hidden sm:flex items-center gap-3">
            {user ? (
              <div className="flex items-center gap-2">
                <Link
                  href={user.role === "ADMIN" ? "/admin/dashboard" : "/jobs/new"}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm shadow-blue-500/20 hover:shadow-md transition active:scale-[0.98]"
                >
                  <Activity className="w-4 h-4" />
                  <span>เข้าสู่ระบบงาน ({user.name})</span>
                </Link>
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100/80 rounded-xl transition-colors"
                >
                  เข้าสู่ระบบ
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-1.5 px-4.5 py-2.5 rounded-xl bg-[#0c1322] hover:bg-slate-900 text-white text-sm font-bold shadow-sm hover:shadow-md transition active:scale-[0.98]"
                >
                  <span>เริ่มใช้งานฟรี</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center gap-2">
            {user && (
              <Link
                href={user.role === "ADMIN" ? "/admin/dashboard" : "/jobs/new"}
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold"
              >
                เข้าระบบ
              </Link>
            )}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-700 hover:bg-slate-100 active:scale-95 transition"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white/95 backdrop-blur-lg px-4 pt-3 pb-6 space-y-3 shadow-xl animate-in slide-in-from-top-2 duration-150">
            <div className="flex flex-col space-y-1 text-sm font-semibold text-slate-700">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl hover:bg-slate-100"
              >
                ฟีเจอร์เด่น
              </a>
              <a
                href="#field-workers"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl hover:bg-slate-100"
              >
                สำหรับคนหน้างาน
              </a>
              <a
                href="#executives"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl hover:bg-slate-100"
              >
                สำหรับผู้บริหาร
              </a>
              <a
                href="#demo"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl hover:bg-slate-100"
              >
                ตัวอย่างระบบ
              </a>
              <a
                href="#contact"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-xl hover:bg-slate-100"
              >
                ติดต่อเรา
              </a>
            </div>

            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              {user ? (
                <Link
                  href={user.role === "ADMIN" ? "/admin/dashboard" : "/jobs/new"}
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 bg-blue-600 text-white rounded-xl text-center text-sm font-bold shadow"
                >
                  ไปยังระบบงาน
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="w-full py-2.5 bg-[#0c1322] text-white rounded-xl text-center text-sm font-bold shadow"
                  >
                    เข้าสู่ระบบ / เริ่มใช้งาน
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ========================================================= */}
      {/* 🌟 2. HERO SECTION (CLEAN MINIMALISM + BROWSER SHOWCASE) */}
      {/* ========================================================= */}
      <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 overflow-hidden">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[520px] bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(37,99,235,0.12),rgba(16,185,129,0.05),transparent)] -z-10 pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Eyebrow Pill */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 text-blue-700 text-xs font-bold mb-6 shadow-xs animate-in fade-in duration-300">
            <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            <span>แพลตฟอร์มบริหารรถสูบสิ่งปฏิกูลยุคใหม่</span>
            <span className="text-blue-400">|</span>
            <span className="text-slate-500 font-medium">B2B Operations SaaS</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15] mb-6">
            บริหารจัดการงานสูบสิ่งปฏิกูล
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-emerald-600 bg-clip-text text-transparent">
              รวดเร็ว แม่นยำ โปร่งใส เรียลไทม์
            </span>
          </h1>

          {/* Subtitle */}
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-600 font-normal leading-relaxed mb-8">
            ระบบปฏิบัติการดิจิทัลสำหรับรถบริการสูบส้วมและกำจัดสิ่งปฏิกูล เชื่อมต่อคนขับหน้างานสู่แดชบอร์ดผู้บริหาร
            บันทึกรูปถ่ายหลักฐาน พิกัด GPS คุมค่าน้ำมัน และป้องกันเงินสดรั่วไหลแบบ 100%
          </p>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-14 max-w-md mx-auto sm:max-w-none">
            {user ? (
              <Link
                href={user.role === "ADMIN" ? "/admin/dashboard" : "/jobs/new"}
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 transition active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <span>เข้าสู่ระบบงาน</span>
                <ChevronRight className="w-5 h-5" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-500/25 hover:shadow-blue-500/35 transition active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <span>ทดลองใช้งานฟรี</span>
                  <ArrowUpRight className="w-5 h-5" />
                </Link>
                <a
                  href="#demo"
                  className="w-full sm:w-auto px-7 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-base border border-slate-200/90 shadow-xs hover:shadow transition active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  <span>ดูตัวอย่างระบบ</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </a>
              </>
            )}
          </div>

          {/* UI Showcase: Realistic Laptop / Browser Frame Mockup */}
          <div
            id="demo"
            className="relative mx-auto max-w-5xl"
          >
            {/* Radial gradient glow behind the mockup */}
            <div className="absolute -inset-6 bg-[radial-gradient(ellipse_70%_50%_at_50%_50%,rgba(37,99,235,0.08),rgba(16,185,129,0.04),transparent)] -z-10 pointer-events-none rounded-full blur-xl" />

            <div className="rounded-2xl sm:rounded-3xl p-2 sm:p-3 bg-gradient-to-b from-slate-200 via-slate-100 to-slate-200/50 border border-slate-300/80 shadow-2xl shadow-blue-900/10 ring-1 ring-slate-900/5">
            {/* Browser Outer Shell */}
            <div className="bg-white rounded-xl sm:rounded-2xl border border-slate-200/90 overflow-hidden shadow-inner text-left">
              {/* Browser Window Bar */}
              <div className="h-10 bg-slate-50/90 border-b border-slate-200/80 px-4 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-400/90 border border-rose-500/30" />
                  <div className="w-3 h-3 rounded-full bg-amber-400/90 border border-amber-500/30" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400/90 border border-emerald-500/30" />
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-lg border border-slate-200/80 text-[11px] font-mono text-slate-500 shadow-2xs">
                  <Lock className="w-3 h-3 text-emerald-600" />
                  <span>https://app.nummuengchon.com/admin/dashboard</span>
                </div>
                <div className="flex items-center gap-1 text-slate-400">
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                  <span className="w-2 h-2 rounded-full bg-slate-300" />
                </div>
              </div>

              {/* Inside Dashboard Content Preview */}
              <div className="p-4 sm:p-6 bg-slate-50/50 space-y-5">
                {/* Operations Bar */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/70">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-xs sm:text-sm font-bold text-slate-900">
                      ศูนย์ควบคุมปฏิบัติการ (Live Operations Control)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                      ระบบออนไลน์พร้อมใช้งาน
                    </span>
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>อัปเดตแบบเรียลไทม์ 10:45 น.</span>
                  </div>
                </div>

                {/* Dashboard KPI Metric Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                  <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs">
                    <div className="text-[11px] font-semibold text-slate-500">รายรับรวมวันนี้</div>
                    <div className="text-xl sm:text-2xl font-extrabold text-slate-900 mt-1">฿48,500</div>
                    <div className="text-[11px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      <span>+18.4% จากสัปดาห์ก่อน</span>
                    </div>
                  </div>

                  <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs">
                    <div className="text-[11px] font-semibold text-slate-500">งานสำเร็จวันนี้</div>
                    <div className="text-xl sm:text-2xl font-extrabold text-blue-600 mt-1">16 / 18 คัน</div>
                    <div className="text-[11px] text-slate-500 font-medium mt-1">
                      อัตราสำเร็จ 88.8%
                    </div>
                  </div>

                  <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs">
                    <div className="text-[11px] font-semibold text-slate-500">ปริมาตรดูดสะสม</div>
                    <div className="text-xl sm:text-2xl font-extrabold text-indigo-600 mt-1">84,000 ลิตร</div>
                    <div className="text-[11px] text-indigo-600 font-semibold mt-1">
                      เฉลี่ย 5,250 ลิตร/งาน
                    </div>
                  </div>

                  <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/80 shadow-2xs">
                    <div className="text-[11px] font-semibold text-slate-500">เงินสดค้างส่งมอบ</div>
                    <div className="text-xl sm:text-2xl font-extrabold text-emerald-600 mt-1">฿0.00</div>
                    <div className="text-[11px] text-emerald-700 font-bold mt-1 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>ตรวจรับครบ 100% ปลอดภัย</span>
                    </div>
                  </div>
                </div>

                {/* Dashboard Middle Split: Revenue Bar Chart + Mini Live GPS Map */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  {/* Left: Weekly Jobs/Revenue Bar Chart */}
                  <div className="lg:col-span-7 bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-xs font-bold text-slate-800">สถิติงานวิ่งรายสัปดาห์</div>
                        <div className="text-[10px] text-slate-400">จำนวนเที่ยวและรายรับแต่ละวัน</div>
                      </div>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                        7 วันล่าสุด
                      </span>
                    </div>
                    {/* Simulated CSS Bar Chart */}
                    <div className="h-32 flex items-end justify-between gap-2 pt-4 px-2 border-b border-slate-100">
                      {[
                        { day: "จันทร์", h: "60%", val: "฿32k", count: "12 งาน" },
                        { day: "อังคาร", h: "75%", val: "฿41k", count: "15 งาน" },
                        { day: "พุธ", h: "50%", val: "฿28k", count: "10 งาน" },
                        { day: "พฤหัส", h: "85%", val: "฿46k", count: "17 งาน" },
                        { day: "ศุกร์", h: "95%", val: "฿52k", count: "19 งาน" },
                        { day: "เสาร์", h: "70%", val: "฿38k", count: "14 งาน" },
                        { day: "อาทิตย์", h: "40%", val: "฿22k", count: "8 งาน" },
                      ].map((item, idx) => (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-1 group">
                          <span className="text-[9px] font-bold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                            {item.val}
                          </span>
                          <div
                            style={{ height: item.h }}
                            className={`w-full max-w-[28px] rounded-t-md transition-all duration-300 ${
                              idx === 4
                                ? "bg-gradient-to-t from-blue-700 to-blue-500 shadow-sm shadow-blue-500/30"
                                : "bg-gradient-to-t from-slate-300 to-slate-200 hover:from-blue-400 hover:to-blue-300"
                            }`}
                          />
                          <span className="text-[10px] text-slate-500 font-medium">{item.day}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right: Mini GPS Live Tracking Widget */}
                  <div className="lg:col-span-5 bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-rose-500" />
                          <span>พิกัดรถหน้างาน (GPS Live)</span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          คัน 02 กำลังสูบ
                        </span>
                      </div>
                      {/* Map Graphic Preview */}
                      <div className="relative h-24 rounded-lg bg-slate-100 border border-slate-200/90 overflow-hidden flex items-center justify-center">
                        {/* Map Grid and Roads simulation */}
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:16px_16px]" />
                        <div className="absolute w-full h-1.5 bg-amber-200/70 rotate-12 -top-2" />
                        <div className="absolute w-1.5 h-full bg-blue-200/70 left-1/3" />
                        
                        {/* Animated Truck Pin */}
                        <div className="relative z-10 flex flex-col items-center">
                          <div className="relative flex items-center justify-center">
                            <span className="absolute w-8 h-8 rounded-full bg-blue-500/25 animate-ping" />
                            <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs shadow-md border-2 border-white">
                              🚛
                            </div>
                          </div>
                          <span className="mt-1 px-2 py-0.5 bg-slate-900/90 text-white text-[9px] font-bold rounded-md shadow-xs whitespace-nowrap">
                            ถ.สุขุมวิท ซอย 14
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2.5 mt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500">พิกัด 13.3611° N, 100.9847° E</span>
                      <span className="font-bold text-blue-600">เปิด Google Maps →</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Recent Activity Row */}
                <div className="bg-white p-3 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="font-bold text-slate-800">งานล่าสุด #JOB-1082:</span>
                    <span className="text-slate-600">โรงงานอมตะซิตี้ บ่อ 3 (รถ 01)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-slate-900">฿3,500</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                      ตรวจรับเงินสดแล้ว ✓
                    </span>
                  </div>
                </div>
              </div>
            </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 🌟 3. REAL-TIME STATS STRIP (จากฐานข้อมูลจริง) */}
      {/* ========================================================= */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6 sm:-mt-10 mb-24 relative z-20">
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-8 grid grid-cols-2 lg:grid-cols-4 gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          <div className="text-center pt-2 sm:pt-0">
            <div className="text-3xl sm:text-4xl font-extrabold text-blue-600 tracking-tight">
              {stats.totalJobs.toLocaleString()}
            </div>
            <div className="text-xs sm:text-sm text-slate-500 font-semibold mt-1.5 flex items-center justify-center gap-1">
              <Truck className="w-4 h-4 text-blue-500" />
              <span>งานที่ให้บริการสำเร็จ</span>
            </div>
          </div>

          <div className="text-center pt-4 sm:pt-0">
            <div className="text-3xl sm:text-4xl font-extrabold text-emerald-600 tracking-tight">
              {stats.totalVolume > 0 ? stats.totalVolume.toLocaleString() : "850,000+"}
            </div>
            <div className="text-xs sm:text-sm text-slate-500 font-semibold mt-1.5 flex items-center justify-center gap-1">
              <span className="text-emerald-500 font-bold">💧</span>
              <span>ปริมาตรสูบสะสม (ลิตร)</span>
            </div>
          </div>

          <div className="text-center pt-4 sm:pt-0">
            <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              {stats.activeVehicles > 0 ? stats.activeVehicles : "พร้อมบริการ"}
            </div>
            <div className="text-xs sm:text-sm text-slate-500 font-semibold mt-1.5 flex items-center justify-center gap-1">
              <Compass className="w-4 h-4 text-slate-600" />
              <span>รถสูบพร้อมปฏิบัติการ</span>
            </div>
          </div>

          <div className="text-center pt-4 sm:pt-0">
            <div className="text-3xl sm:text-4xl font-extrabold text-indigo-600 tracking-tight">
              {stats.activeDrivers > 0 ? stats.activeDrivers : "ทีมมืออาชีพ"}
            </div>
            <div className="text-xs sm:text-sm text-slate-500 font-semibold mt-1.5 flex items-center justify-center gap-1">
              <Users className="w-4 h-4 text-indigo-500" />
              <span>พนักงานประจำการ</span>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 🌟 4. DUAL PERSONA SECTION (คนหน้างาน vs ผู้บริหาร) */}
      {/* ========================================================= */}
      <section id="field-workers" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-28">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold mb-3">
            <span>TAILORED FOR OPERATIONS</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            ออกแบบตรงใจทั้ง &ldquo;คนหน้างาน&rdquo; และ &ldquo;ผู้บริหาร&rdquo;
          </h2>
          <p className="text-slate-500 text-sm sm:text-base mt-2">
            เชื่อมต่อข้อมูลแบบไร้รอยต่อ คนขับส่งงานง่ายผ่านมือถือ ผู้บริหารคุมตัวเลขได้จากทุกที่
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Card 1: พนักงานหน้างาน & คนขับ */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-600 to-indigo-500" />

            <div>
              {/* Badge & Icon */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-100">
                    FIELD OPERATIONS & DRIVER
                  </span>
                  <span className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/></svg>
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                  👷‍♂️
                </div>
              </div>

              <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
                สำหรับคนหน้างาน & คนขับ
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-6 font-medium">
                เน้นใช้งานง่ายผ่านมือถือเครื่องเดียว ไม่ซับซ้อน ใส่ถุงมือทำงานก็แตะส่งงานได้ไวใน 30 วินาที
              </p>

              {/* Feature Checklist */}
              <ul className="space-y-3.5 text-sm text-slate-700">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>ส่งงานใน 30 วินาที:</strong> ถ่ายรูป บันทึกปริมาตร และยอดเงินเสร็จในหน้าจอเดียว
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>จับพิกัด GPS อัตโนมัติ:</strong> แตะปุ่มเดียวบันทึกตำแหน่งจริง ป้องกันจำสถานที่คลาดเคลื่อน
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>บีบอัดรูปถ่ายอัจฉริยะ:</strong> ส่งภาพรวดเร็ว แม้สัญญาณเน็ตมือถือหน้างานไม่แรง
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>แนบสลิปค่าน้ำมันหน้าปั๊ม:</strong> ถ่ายรูปใบเสร็จและยอดเงินทันที ป้องกันบิลหาย
                  </span>
                </li>
              </ul>
            </div>

            {/* Mini UI Component: Mobile Submission Preview */}
            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">ฟอร์มส่งงานด่วน</span>
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold text-[10px]">
                    📍 GPS พร้อมบันทึก
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-center font-semibold text-slate-700">
                    📷 ถ่ายรูปหลักฐาน 3 จุด
                  </div>
                  <div className="p-2.5 bg-blue-600 text-white rounded-xl text-center font-bold shadow-xs">
                    ✓ กดส่งงานทันที
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <Link
                  href={user ? "/jobs/new" : "/login"}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-blue-600 hover:text-blue-700 hover:gap-2.5 transition-all"
                >
                  <span>เข้าสู่หน้าส่งงานคนขับ</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
                <span className="text-xs text-slate-400">รองรับ iOS & Android</span>
              </div>
            </div>
          </div>

          {/* Card 2: ผู้บริหาร & ฝ่ายจัดการ */}
          <div
            id="executives"
            className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between relative overflow-hidden group"
          >
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-600 to-teal-500" />

            <div>
              {/* Badge & Icon */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                    EXECUTIVE & MANAGEMENT
                  </span>
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="2" x2="22" y1="20" y2="20"/></svg>
                  </span>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                  📊
                </div>
              </div>

              <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight mb-2">
                สำหรับผู้บริหาร & ฝ่ายจัดการ
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-6 font-medium">
                แดชบอร์ดภาพรวม ป้องกันเงินรั่วไหล วิเคราะห์กำไรรายคัน คุมกระแสเงินสดและสถิติรถทุกคันแบบเรียลไทม์
              </p>

              {/* Feature Checklist */}
              <ul className="space-y-3.5 text-sm text-slate-700">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>แดชบอร์ดสรุปผลประกอบการ:</strong> ดูยอดขาย ต้นทุน และกำไรสุทธิแบบเรียลไทม์ตลอด 24 ชม.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>ตรวจสอบเงินสดค้างส่ง:</strong> คุมยอดเงินสดที่คนขับถือ ตรวจรับเมื่อเงินเข้า ป้องกันรั่วไหล 100%
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>วิเคราะห์กำไรรายคัน:</strong> เช็กต้นทุนค่าน้ำมัน ค่าซ่อม เทียบรายรับ รู้ทันทีว่าคันไหนทำกำไร
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>บันทึกเวลา & ส่งออก Excel:</strong> ตรวจสอบสถิติงานวิ่ง 31 วัน ดาวน์โหลดรายงานทำบัญชีใน 1 คลิก
                  </span>
                </li>
              </ul>
            </div>

            {/* Mini UI Component: Executive Financial Snapshot */}
            <div className="mt-8 pt-6 border-t border-slate-100">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">ศูนย์ควบคุมการเงิน</span>
                  <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 font-bold text-[10px]">
                    กำไรสุทธิ +34.2%
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 bg-white rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] text-slate-400 block">เงินสดค้างส่ง</span>
                    <strong className="text-emerald-600 font-bold">฿0 (ครบถ้วน)</strong>
                  </div>
                  <div className="p-2.5 bg-emerald-600 text-white rounded-xl text-center font-bold shadow-xs">
                    📊 ดูแดชบอร์ดรวม
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <Link
                  href={user?.role === "ADMIN" ? "/admin/dashboard" : "/login"}
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600 hover:text-emerald-700 hover:gap-2.5 transition-all"
                >
                  <span>เข้าสู่แดชบอร์ดผู้บริหาร</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
                <span className="text-xs text-slate-400">เข้าถึงได้ทั้งมือถือ & คอม</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 🌟 5. BENTO GRID FEATURES SECTION (6 CARDS + MINI-UI) */}
      {/* ========================================================= */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mb-28">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-3 border border-blue-100">
            <Sparkles className="w-3.5 h-3.5" />
            <span>POWERFUL FEATURES</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            ครบเครื่อง ทุกฟังก์ชันเพื่อธุรกิจบริการสูบส้วม
          </h2>
          <p className="text-slate-500 text-sm sm:text-base mt-2">
            แก้ปัญหาเอกสารสูญหาย ตัวเลขไม่ตรง ป้องกันทุจริต และยกระดับการทำงานให้เป็นระบบสากล
          </p>
        </div>

        {/* Bento Grid Layout - wrapped in subtle bg container */}
        <div className="bg-slate-50/70 rounded-3xl p-4 sm:p-6 border border-slate-200/50">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* ----------------------------------------------------------- */}
          {/* Card 1: ภาพถ่ายหลักฐาน 3 จุด (Span 2 บนจอใหญ่) */}
          {/* ----------------------------------------------------------- */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Camera className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200/70">
                  หลักฐานโปร่งใส 100%
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                ภาพถ่ายหลักฐาน 3 จุด คมชัด ตรวจสอบได้
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6 font-medium">
                บันทึกภาพถ่ายก่อนดูด ระหว่างทำงาน และหลังดูดเสร็จ พร้อมแนบสลิปโอนเงิน ป้องกันข้อโต้แย้งกับลูกค้า และยืนยันความพึงพอใจ
              </p>
            </div>

            {/* Mini-UI: 3 Evidence Boxes */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <div className="grid grid-cols-3 gap-3">
                {/* Before */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center space-y-1.5 shadow-2xs">
                  <div className="h-16 rounded-lg bg-amber-50 border border-amber-200/80 flex flex-col items-center justify-center text-amber-700">
                    <span className="text-lg">📷</span>
                    <span className="text-[9px] font-bold">10:14 น.</span>
                  </div>
                  <div className="text-[10px] font-bold text-slate-800">1. ก่อนทำ</div>
                  <div className="text-[9px] text-slate-500">สภาพปากบ่อ</div>
                </div>

                {/* In Progress */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center space-y-1.5 shadow-2xs">
                  <div className="h-16 rounded-lg bg-blue-50 border border-blue-200/80 flex flex-col items-center justify-center text-blue-700">
                    <span className="text-lg">🚰</span>
                    <span className="text-[9px] font-bold">10:28 น.</span>
                  </div>
                  <div className="text-[10px] font-bold text-slate-800">2. ระหว่างทำ</div>
                  <div className="text-[9px] text-slate-500">ต่อท่อสูบส้วม</div>
                </div>

                {/* After / Receipt */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center space-y-1.5 shadow-2xs">
                  <div className="h-16 rounded-lg bg-emerald-50 border border-emerald-200/80 flex flex-col items-center justify-center text-emerald-700">
                    <span className="text-lg">🧾</span>
                    <span className="text-[9px] font-bold">10:40 น.</span>
                  </div>
                  <div className="text-[10px] font-bold text-slate-800">3. หลังทำ & สลิป</div>
                  <div className="text-[9px] text-slate-500">ปิดฝา & โอนเงิน</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-slate-500">
                <span className="flex items-center gap-1 text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>บันทึกพิกัดและเวลาฝังลงในภาพ</span>
                </span>
                <span className="text-slate-400">บีบอัดรูป &lt; 300KB</span>
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------------- */}
          {/* Card 2: ระบบติดตาม GPS & แผนที่หน้างาน */}
          {/* ----------------------------------------------------------- */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200/70">
                  GPS แม่นยำ
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                ระบบติดตาม GPS หน้างาน
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6 font-medium">
                ดึงพิกัดละติจูด ลองจิจูด อัตโนมัติขณะส่งงาน พร้อมปุ่มเปิด Google Maps นำทางและตรวจสอบตำแหน่งจริง
              </p>
            </div>

            {/* Mini-UI: Simulated Map with Radar Pin */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/80 space-y-2.5">
              <div className="relative h-28 rounded-xl bg-slate-200/70 overflow-hidden flex items-center justify-center border border-slate-300/80">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#cbd5e1_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e1_1px,transparent_1px)] bg-[size:14px_14px]" />
                <div className="relative z-10 flex flex-col items-center">
                  <div className="relative flex items-center justify-center">
                    <span className="absolute w-8 h-8 rounded-full bg-rose-500/30 animate-ping" />
                    <div className="w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs shadow-md">
                      📍
                    </div>
                  </div>
                  <div className="mt-1 px-2 py-0.5 bg-slate-900/90 text-white rounded text-[10px] font-bold shadow-xs">
                    13.3611° N, 100.9847° E
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] font-bold">
                <span className="text-slate-600">อ.เมือง จ.ชลบุรี</span>
                <span className="text-blue-600 flex items-center gap-1">
                  <span>เปิด Google Maps</span>
                  <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------------- */}
          {/* Card 3: ระบบตรวจสอบเงินสด & ป้องกันทุจริต */}
          {/* ----------------------------------------------------------- */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/70">
                  Zero Leakage
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                คุมเงินสด & ป้องกันทุจริต
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6 font-medium">
                ติดตามยอดเงินสดที่คนขับรับจากลูกค้า แอดมินสามารถกดตรวจรับเงินเมื่อส่งเงินครบ ป้องกันเงินตกหล่น 100%
              </p>
            </div>

            {/* Mini-UI: Cash Status Tags */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2">
              <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
                <div>
                  <div className="text-[11px] font-bold text-slate-800">งาน #104 (สมชาย)</div>
                  <div className="text-[10px] text-slate-500">เงินสด ฿1,800</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                  ⏳ รอตรวจสอบ
                </span>
              </div>

              <div className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
                <div>
                  <div className="text-[11px] font-bold text-slate-800">งาน #103 (ธนากร)</div>
                  <div className="text-[10px] text-slate-500">เงินสด ฿2,400</div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                  ✓ ตรวจรับแล้ว
                </span>
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------------- */}
          {/* Card 4: แจ้งเตือนเข้า LINE อัตโนมัติ (Span 2 บนจอใหญ่) */}
          {/* ----------------------------------------------------------- */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-emerald-600" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#06C755]/10 text-[#06C755] border border-[#06C755]/20">
                  LINE Notify Official
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                แจ้งเตือนเข้ากลุ่ม LINE ทันทีที่ส่งงาน
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6 font-medium">
                ทันทีที่คนขับกดส่งงาน ระบบจะยิงสรุปงาน ยอดเงิน พิกัด และภาพถ่าย 3 จุดเข้ากลุ่ม LINE ของบริษัททันที ไม่ต้องโทรถาม
              </p>
            </div>

            {/* Mini-UI: LINE Chat Bubble */}
            <div className="bg-slate-100/90 p-4 rounded-2xl border border-slate-200/90">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-[#06C755] text-white flex items-center justify-center text-xs font-bold shadow-xs">
                  L
                </div>
                <span className="text-xs font-bold text-slate-800">กลุ่มงาน: รถสูบส้วมหนุ่มเมืองชน</span>
                <span className="text-[10px] text-slate-400">10:45 น.</span>
              </div>

              {/* Message Bubble */}
              <div className="max-w-md bg-[#06C755] text-white p-3.5 rounded-2xl rounded-tl-xs text-xs space-y-1.5 shadow-sm">
                <div className="font-extrabold flex items-center gap-1.5 text-sm">
                  <span>🚛</span>
                  <span>แจ้งเตือนงานสูบใหม่เสร็จสิ้น!</span>
                </div>
                <div className="text-emerald-50 space-y-0.5 text-[11px]">
                  <div>• <strong>รถประจำการ:</strong> คันที่ 01 (ทะเบียน 82-xxxx)</div>
                  <div>• <strong>ลูกค้า:</strong> โรงงานสุขุมวิทอินดัสตรีส์</div>
                  <div>• <strong>ยอดชำระ:</strong> ฿3,200 (โอนเงินเข้าบัญชี)</div>
                  <div>• <strong>สถานะหลักฐาน:</strong> แนบรูปถ่าย 3 จุดครบถ้วน ✓</div>
                </div>
                <div className="pt-1 flex items-center gap-2 text-[10px] font-bold text-emerald-100">
                  <span className="px-2 py-0.5 rounded bg-black/20">ดูภาพถ่ายในระบบ →</span>
                </div>
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------------- */}
          {/* Card 5: บันทึกรายจ่ายแยกหมวด */}
          {/* ----------------------------------------------------------- */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Fuel className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200/70">
                  Cost Control
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                บันทึกรายจ่ายแยกหมวด
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6 font-medium">
                บันทึกค่าน้ำมัน ค่าเททิ้งสิ่งปฏิกูล ค่าซ่อมบำรุง และค่าแรง พร้อมสลิปเพื่อคำนวณกำไรสุทธิแท้จริงของรถแต่ละคัน
              </p>
            </div>

            {/* Mini-UI: Expense Breakdown Bars */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-2.5">
              <div>
                <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
                  <span>⛽ ค่าน้ำมัน (52%)</span>
                  <span>฿18,200</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div className="w-[52%] h-full bg-amber-500 rounded-full" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
                  <span>🚯 ค่าเททิ้งสิ่งปฏิกูล (22%)</span>
                  <span>฿7,500</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div className="w-[22%] h-full bg-blue-500 rounded-full" />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] font-bold text-slate-700 mb-1">
                  <span>🔧 ค่าซ่อมบำรุง / ยาง (12%)</span>
                  <span>฿4,200</span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div className="w-[12%] h-full bg-indigo-500 rounded-full" />
                </div>
              </div>
            </div>
          </div>

          {/* ----------------------------------------------------------- */}
          {/* Card 6: สรุปเวลาทำงาน / ข้อมูลส่งออก Excel */}
          {/* ----------------------------------------------------------- */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 border border-purple-200/70">
                  Excel & Reports
                </span>
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                ตรวจเวลา & ส่งออก Excel
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6 font-medium">
                สรุปวันเข้างานจากงานที่วิ่งจริง 31 วัน พร้อมปุ่มส่งออกรายงานแบบ Excel / CSV ส่งฝ่ายบัญชีได้ในคลิกเดียว
              </p>
            </div>

            {/* Mini-UI: Attendance Grid + Export Button */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80 space-y-3">
              <div>
                <div className="text-[10px] font-bold text-slate-500 mb-1.5">
                  ตารางวิ่งงาน 31 วัน (มีนาคม)
                </div>
                {/* Simulated Attendance Dots Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 28 }).map((_, i) => (
                    <div
                      key={i}
                      className={`h-3 rounded-xs ${
                        i % 5 === 0
                          ? "bg-slate-200"
                          : i % 7 === 0
                          ? "bg-emerald-400"
                          : "bg-emerald-500"
                      }`}
                      title={`วันที่ ${i + 1}`}
                    />
                  ))}
                </div>
              </div>

              {/* Excel Download Button Mockup */}
              <div className="p-2.5 bg-emerald-600 text-white rounded-xl flex items-center justify-between text-xs font-bold shadow-xs">
                <div className="flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-200" />
                  <span>รายงานสรุปรายได้.xlsx</span>
                </div>
                <span className="text-[10px] bg-emerald-700 px-1.5 py-0.5 rounded">1.2 MB</span>
              </div>
            </div>
          </div>
        </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 🌟 6. TRUST & OPERATIONAL RELIABILITY */}
      {/* ========================================================= */}
      <section className="bg-white border-y border-slate-200/80 py-16 mb-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto md:mx-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900">
                ระบบความปลอดภัยระดับมาตรฐาน
              </h4>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                เก็บข้อมูลบนคลาวด์มาตรฐานสูง พร้อมเข้ารหัสรหัสผ่านและสิทธิ์เข้าถึงตามหน้าที่ (RBAC) ปลอดภัย 100%
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto md:mx-0">
                <Activity className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900">
                เชื่อมโยงข้อมูลแบบ Real-time
              </h4>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                ข้อมูลงาน ยอดเงิน และภาพถ่ายซิงก์ตรงสู่ระบบทันที เพื่อให้ฝ่ายบริหารตัดสินใจได้แม่นยำทุกนาที
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto md:mx-0">
                <PhoneCall className="w-5 h-5" />
              </div>
              <h4 className="text-base font-bold text-slate-900">
                บริการและดูแลโดยทีมงานคนไทย
              </h4>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                พัฒนาและปรับแต่งให้ตอบโจทย์การทำงานจริงของธุรกิจรถดูดส้วมและงานสิ่งปฏิกูลในประเทศไทยโดยตรง
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 🌟 7. BOTTOM CTA & CONTACT SECTION */}
      {/* ========================================================= */}
      <section id="contact" className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-24">
        <div className="rounded-3xl bg-gradient-to-br from-[#0c1322] via-slate-900 to-[#0c1322] text-white p-8 sm:p-14 text-center relative overflow-hidden shadow-2xl">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            <span className="px-3.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30">
              READY TO SCALE YOUR FLEET?
            </span>

            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              พร้อมยกระดับระบบจัดการรถสูบส้วมของคุณแล้วหรือยัง?
            </h2>

            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
              เริ่มต้นใช้งานระบบเพื่อลดเวลาทำงานหน้างาน ควบคุมเงินสด และสร้างผลกำไรที่โปร่งใสตั้งแต่วันนี้
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm sm:text-base shadow-lg shadow-blue-500/30 transition active:scale-[0.98]"
              >
                เข้าสู่ระบบ / เริ่มใช้งานทันที
              </Link>
              <a
                href="tel:0982581182"
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-white/10 hover:bg-white/15 text-white font-semibold text-sm sm:text-base border border-white/20 transition active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <PhoneCall className="w-4 h-4 text-emerald-400" />
                <span>ติดต่อสอบถาม: 098-258-1182</span>
              </a>
            </div>

            <p className="text-xs text-slate-400 pt-2">
              ใช้งานได้ทันทีผ่านเว็บบราวเซอร์ ไม่ต้องติดตั้งแอปพลิเคชันเพิ่มเติม
            </p>
          </div>
        </div>
      </section>

      {/* ========================================================= */}
      {/* 🌟 8. FOOTER คมชัด เรียบหรู */}
      {/* ========================================================= */}
      <footer className="border-t border-slate-200 bg-white py-12 text-slate-500 text-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                🚛
              </div>
              <div>
                <span className="font-extrabold text-slate-900 text-base tracking-tight block">
                  หนุ่มเมืองชน
                </span>
                <span className="text-[11px] text-slate-400 -mt-0.5 block">
                  Waste Truck Operations Platform
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-6 font-semibold text-slate-600">
              <a href="#features" className="hover:text-blue-600 transition">
                ฟีเจอร์เด่น
              </a>
              <a href="#field-workers" className="hover:text-blue-600 transition">
                คนหน้างาน
              </a>
              <a href="#executives" className="hover:text-blue-600 transition">
                ผู้บริหาร
              </a>
              <a href="#demo" className="hover:text-blue-600 transition">
                ตัวอย่างระบบ
              </a>
              <Link href="/login" className="hover:text-blue-600 transition">
                เข้าสู่ระบบ
              </Link>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-400">
            <p>
              © {new Date().getFullYear()} หนุ่มเมืองชน (NumMuengChon Operations). สงวนลิขสิทธิ์ทุกประการ.
            </p>
            <p className="flex items-center gap-2">
              <span>Clean Minimalism & Bento Grid Architecture</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
