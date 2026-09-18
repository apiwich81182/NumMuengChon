import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const revalidate = 60; // แคช 60 วินาที

export default async function Home() {
  const user = await getCurrentUser();

  // ดึงสถิติภาพรวมแบบ Real-time จากฐานข้อมูล
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
    <div className="min-h-screen bg-slate-50 text-slate-800 selection:bg-blue-500 selection:text-white">
      {/* 🌟 1. Top Bar สำหรับผู้ที่ยังไม่ได้เข้าสู่ระบบ (ถ้าล็อกอินแล้ว Navbar ด้านบนจะทำงาน) */}
      {!user && (
        <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-md border-b border-slate-200/80">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl p-1.5 bg-blue-50 rounded-xl border border-blue-100">
                🚛
              </span>
              <div>
                <span className="font-extrabold text-slate-900 text-lg sm:text-xl tracking-tight block">
                  หนุ่มเมืองชน
                </span>
                <span className="text-[10px] text-slate-500 font-medium -mt-1 block">
                  Waste Truck Management System
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="px-4 py-2 bg-[#0c1322] hover:bg-slate-900 text-white rounded-xl text-xs sm:text-sm font-semibold transition shadow-sm hover:shadow flex items-center gap-1.5"
              >
                <span>🔐</span>
                <span>เข้าสู่ระบบ</span>
              </Link>
            </div>
          </div>
        </header>
      )}

      {/* 🌟 2. Hero Section */}
      <section className="relative overflow-hidden pt-8 pb-16 sm:pt-14 sm:pb-24">
        {/* แสงสี Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-b from-blue-100/60 via-emerald-50/40 to-transparent blur-3xl -z-10 pointer-events-none" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center space-y-6">

          {/* Main Headline */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.2] sm:leading-[1.15]">
            บริหารจัดการงานสูบสิ่งปฏิกูล
            <br />
            <span className="bg-gradient-to-r from-blue-600 via-teal-600 to-emerald-600 bg-clip-text text-transparent">
              รวดเร็ว แม่นยำ โปร่งใส เรียลไทม์
            </span>
          </h1>

          {/* Subtitle */}
          <p className="max-w-2xl mx-auto text-sm sm:text-base lg:text-lg text-slate-600 leading-relaxed font-normal">
            ยกระดับประสิทธิภาพงานบริการสูบส้วม ส่งงานง่ายด้วยภาพถ่ายและ GPS หน้างาน
            พร้อมระบบควบคุมกระแสเงินสด ค่าใช้จ่ายน้ำมัน บันทึกเวลาพนักงาน
            และแดชบอร์ดสำหรับผู้บริหารในที่เดียว
          </p>

          {/* CTA Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-md mx-auto sm:max-w-none">
            {user ? (
              <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-3">
                <Link
                  href={user.role === "ADMIN" ? "/admin/dashboard" : "/jobs/new"}
                  className="w-full sm:w-auto px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm sm:text-base transition shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <span>🚀</span>
                  <span>
                    ไปยังระบบงาน
                  </span>
                </Link>
                <Link
                  href="/jobs"
                  className="w-full sm:w-auto px-5 py-3.5 bg-white hover:bg-slate-100 text-slate-700 rounded-2xl font-semibold text-sm sm:text-base border border-slate-200 transition shadow-xs flex items-center justify-center gap-2"
                >
                  <span>📋</span>
                  <span>รายการงานทั้งหมด</span>
                </Link>
              </div>
            ) : (
              <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-3">
                <Link
                  href="/login"
                  className="w-full sm:w-auto px-7 py-3.5 bg-[#0c1322] hover:bg-black text-white rounded-2xl font-bold text-sm sm:text-base transition shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  <span>🔐</span>
                  <span>เข้าสู่ระบบพนักงาน</span>
                </Link>
                <a
                  href="#features"
                  className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-slate-100 text-slate-700 rounded-2xl font-semibold text-sm sm:text-base border border-slate-200 transition shadow-xs flex items-center justify-center gap-1.5"
                >
                  <span>📖</span>
                  <span>ดูความสามารถระบบ</span>
                </a>
              </div>
            )}
          </div>

          {/* Quick Trust Highlights */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-y-2 gap-x-6 text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span> ใช้งานบนมือถือง่าย 100%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span> บันทึก GPS
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span> บันทึกรูปก่อน-หลัง & สลิปโอน
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-emerald-500 font-bold">✓</span> ตรวจสอบเงินสดป้องกันสูญหาย
            </span>
          </div>
        </div>
      </section>

      {/* 🌟 3. Live Stats Bar */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 -mt-4 mb-16">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-7 grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
          <div className="text-center pt-2 sm:pt-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-blue-600">
              {totalJobs.toLocaleString()}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              🚚 งานที่ให้บริการแล้ว
            </div>
          </div>

          <div className="text-center pt-2 sm:pt-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
              {totalVolume > 0 ? totalVolume.toLocaleString() : "0"}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              💧 ลิตร (ปริมาตรสูบสะสม)
            </div>
          </div>

          <div className="text-center pt-2 sm:pt-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-800">
              {activeVehicles > 0 ? activeVehicles : "พร้อมบริการ"}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              🚛 รถสูบในระบบพร้อมใช้งาน
            </div>
          </div>

          <div className="text-center pt-2 sm:pt-0">
            <div className="text-2xl sm:text-3xl font-extrabold text-purple-600">
              {activeDrivers > 0 ? activeDrivers : "ทีมงานมืออาชีพ"}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              👷‍♂️ พนักงานขับรถประจำการ
            </div>
          </div>
        </div>
      </section>

      {/* 🌟 4. Dual Workflow Section (หน้างาน vs ผู้บริหาร) */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 mb-20">
        <div className="text-center space-y-2 mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            ออกแบบเพื่อตอบโจทย์ทั้ง &ldquo;คนหน้างาน&rdquo; และ &ldquo;ผู้บริหาร&rdquo;
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
            เชื่อมต่อข้อมูลแบบเรียลไทม์ พนักงานส่งงานจากมือถือ ผู้บริหารดูตัวเลขได้ทันที
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: พนักงานหน้างาน */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm hover:shadow-md transition space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200/80 flex items-center justify-center text-2xl">
              👷‍♂️
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                สำหรับพนักงานขับรถ & ผู้ช่วย
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                ใช้งานง่ายด้วยมือถือเครื่องเดียว ไม่ซับซ้อน ใส่ถุงมือก็แตะส่งงานได้สะดวก
              </p>
            </div>

            <ul className="space-y-3 text-xs sm:text-sm text-slate-700">
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-500 font-bold">✓</span>
                <span>
                  <strong>ส่งงานใน 30 วินาที:</strong> ถ่ายภาพหน้างาน บันทึกปริมาตร และยอดเงินได้ทันที
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-500 font-bold">✓</span>
                <span>
                  <strong>จับพิกัด GPS อัตโนมัติ:</strong> ยืนยันสถานที่ปฏิบัติงานจริง ป้องกันการทุจริต
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-500 font-bold">✓</span>
                <span>
                  <strong>บีบอัดภาพอัตโนมัติ:</strong> อัปโหลดภาพถ่ายไว ไม่เปลืองอินเทอร์เน็ตมือถือ
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-500 font-bold">✓</span>
                <span>
                  <strong>บันทึกค่าน้ำมัน & ค่าเททิ้ง:</strong> ถ่ายสลิปเบิกจ่ายค่าใช้จ่ายหน้างานได้ทันที
                </span>
              </li>
            </ul>

            <div className="pt-2">
              <Link
                href={user ? "/jobs/new" : "/login"}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline"
              >
                <span>เข้าสู่ฟอร์มส่งงานหน้างาน</span>
                <span>→</span>
              </Link>
            </div>
          </div>

          {/* Card 2: ผู้บริหารและแอดมิน */}
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm hover:shadow-md transition space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-2xl">
              📊
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                สำหรับผู้บริหาร & ฝ่ายจัดการ
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-1">
                มองเห็นภาพรวมกระแสเงินสด ประสิทธิภาพรถ และความพร้อมของทีมงานแบบเรียลไทม์
              </p>
            </div>

            <ul className="space-y-3 text-xs sm:text-sm text-slate-700">
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-500 font-bold">✓</span>
                <span>
                  <strong>แดชบอร์ดสรุปผลประกอบการ:</strong> ติดตามรายรับ, รายจ่าย และกำไรสุทธิตลอดเวลา
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-500 font-bold">✓</span>
                <span>
                  <strong>ตรวจสอบเงินสดค้างส่ง:</strong> คุมยอดเงินสดที่คนขับถือ ป้องกันเงินรั่วไหล
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-500 font-bold">✓</span>
                <span>
                  <strong>เมทริกซ์การเข้างาน 31 วัน:</strong> ตรวจสอบสถิติการวิ่งงานของพนักงานรายวันแม่นยำ
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-500 font-bold">✓</span>
                <span>
                  <strong>วิเคราะห์ประสิทธิภาพรถรายคัน:</strong> เช็กต้นทุนค่าน้ำมันและค่าซ่อมบำรุงเทียบรายได้
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-500 font-bold">✓</span>
                <span>
                  <strong>ส่งออกข้อมูล Excel / CSV:</strong> สรุปบัญชีและรายงานผู้บริหารได้ในคลิกเดียว
                </span>
              </li>
            </ul>

            <div className="pt-2">
              <Link
                href={user?.role === "ADMIN" ? "/admin/dashboard" : "/login"}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
              >
                <span>เข้าสู่แดชบอร์ดผู้บริหาร</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 🌟 5. Core Features Grid */}
      <section id="features" className="max-w-5xl mx-auto px-4 sm:px-6 mb-20">
        <div className="text-center space-y-2 mb-10">

          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            ระบบที่ครบเครื่องที่สุดสำหรับธุรกิจสูบส้วม
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto">
            แก้ปัญหาเอกสารสูญหาย บัญชีไม่ตรง และควบคุมการทำงานของรถทุกคันได้อย่างมีมาตรฐาน
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* F1 */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition space-y-3">
            <div className="text-2xl">📸</div>
            <h4 className="font-bold text-slate-900 text-base">
              ภาพถ่ายหลักฐาน 3 จุด
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              เก็บบันทึกภาพถ่ายก่อนสูบ, ภาพหลังสูบ และสลิปหลักฐานการโอนเงิน ตรวจสอบย้อนหลังได้ทุกงาน
            </p>
          </div>

          {/* F2 */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition space-y-3">
            <div className="text-2xl">📍</div>
            <h4 className="font-bold text-slate-900 text-base">
              ระบบ GPS
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              ดึงพิกัดอัตโนมัติขณะส่งงาน พร้อมปุ่มเปิด Google Maps ให้ทีมงานหรือผู้บริหารตรวจสอบตำแหน่งได้ทันที
            </p>
          </div>

          {/* F3 */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition space-y-3">
            <div className="text-2xl">💵</div>
            <h4 className="font-bold text-slate-900 text-base">
              ระบบตรวจรับเงินสด
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              ติดตามยอดเงินสดที่พนักงานเก็บจากลูกค้า แอดมินสามารถกดตรวจรับเงินเมื่อส่งเงินคืนแล้ว ป้องกันเงินตกหล่น
            </p>
          </div>

          {/* F4 */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition space-y-3">
            <div className="text-2xl">⛽</div>
            <h4 className="font-bold text-slate-900 text-base">
              บันทึกรายจ่ายแยกหมวด
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              บันทึกค่าน้ำมัน, ค่าเททิ้ง, ค่าซ่อมบำรุง และค่าแรง พร้อมแนบรูปใบเสร็จเพื่อคำนวณกำไรสุทธิที่แท้จริง
            </p>
          </div>

          {/* F5 */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition space-y-3">
            <div className="text-2xl">⏱️</div>
            <h4 className="font-bold text-slate-900 text-base">
              ลงเวลาทำงาน
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              คำนวณวันเข้างานจากงานที่วิ่งจริงอัตโนมัติ
            </p>
          </div>

          {/* F6 */}
          <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs hover:border-slate-300 transition space-y-3">
            <div className="text-2xl">📲</div>
            <h4 className="font-bold text-slate-900 text-base">
              แจ้งเตือนเข้า LINE อัตโนมัติ
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              ทันทีที่พนักงานส่งงาน ระบบจะยิงแจ้งเตือนรายละเอียดงาน พิกัด และยอดเงินเข้ากลุ่ม LINE ทันที
            </p>
          </div>
        </div>
      </section>

      {/* 🌟 7. Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs text-slate-500">
        <div className="max-w-5xl mx-auto px-4 space-y-2">
          <div className="flex items-center justify-center gap-2 font-bold text-slate-800 text-sm">
            <span>🚛 หนุ่มเมืองชน</span>
          </div>
          <p className="text-slate-400">
            ระบบบริหารจัดการรถสูบส้วมและสิ่งปฏิกูล สำหรับงานบริการและบริหารจัดการต้นทุน
          </p>
          <p className="text-[11px] text-slate-400 pt-2">
            © {new Date().getFullYear()} NumMuengChon. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
