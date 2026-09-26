"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/actions/auth";
import { toast } from "@/components/Toast";
import { formatUserErrorMessage } from "@/lib/formatters";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const formData = new FormData(e.currentTarget);
      const res = await login(formData);

      if (res?.success) {
        toast.success("เข้าสู่ระบบสำเร็จ ยินดีต้อนรับครับ");
        router.push("/jobs");
        router.refresh();
      } else {
        const err = formatUserErrorMessage(res?.error, "เบอร์โทรหรือรหัสผ่านไม่ถูกต้อง");
        setErrorMsg(err);
        toast.error(err);
      }
    } catch (err) {
      const msg = formatUserErrorMessage(err, "ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อเข้าสู่ระบบได้");
      setErrorMsg(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="text-center space-y-1">
          <span className="text-3xl">🚛</span>
          <h1 className="text-2xl font-bold text-slate-900">เข้าสู่ระบบ</h1>
          <p className="text-xs text-slate-500">ระบบจัดการงานและรถสูบส้วม</p>
        </div>

        {errorMsg && (
          <div className="p-3 text-xs bg-rose-50 text-rose-600 border border-rose-200 rounded-xl">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              เบอร์โทรศัพท์ (ชื่อผู้ใช้งาน)
            </label>
            <input
              type="tel"
              name="phone"
              required
              placeholder="0982581182"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-slate-900 bg-white placeholder:text-slate-400 font-medium transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              รหัสผ่าน
            </label>
            <input
              type="password"
              name="password"
              required
              placeholder="••••"
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm text-slate-900 bg-white placeholder:text-slate-400 font-medium tracking-widest transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm transition disabled:opacity-50 text-sm"
          >
            {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
          </button>
        </form>

        <p className="text-[11px] text-center text-slate-400">
          คนขับ: บัญชีที่ลงทะเบียนในระบบ | แอดมิน: จัดการภาพรวม
        </p>
      </div>
    </main>
  );
}