"use client";

import React, { useState, useTransition } from "react";
import type { CalendarMonthData, CalendarDayData } from "@/lib/calendar-stats";
import { getExpenseCategoryLabel, getPaymentMethodLabel } from "@/lib/labels";
import { THAI_MONTHS_FULL } from "@/lib/formatters";

interface FinancialCalendarProps {
  initialData: CalendarMonthData;
}

const WEEKDAYS = [
  { short: "SUN", thai: "อา." },
  { short: "MON", thai: "จ." },
  { short: "TUE", thai: "อ." },
  { short: "WED", thai: "พ." },
  { short: "THU", thai: "พฤ." },
  { short: "FRI", thai: "ศ." },
  { short: "SAT", thai: "ส." },
];

export default function FinancialCalendar({ initialData }: FinancialCalendarProps) {
  const [data, setData] = useState<CalendarMonthData>(initialData);
  const [isPending, startTransition] = useTransition();
  const [selectedDay, setSelectedDay] = useState<CalendarDayData | null>(null);

  // ฟังก์ชันโหลดข้อมูลเดือนที่ต้องการ
  const loadMonthData = (targetYear: number, targetMonth: number) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/calendar?year=${targetYear}&month=${targetMonth}`);
        if (res.ok) {
          const json: CalendarMonthData = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Failed to load month calendar:", err);
      }
    });
  };

  const handlePrevMonth = () => {
    const nextMonth = data.month === 1 ? 12 : data.month - 1;
    const nextYear = data.month === 1 ? data.year - 1 : data.year;
    loadMonthData(nextYear, nextMonth);
  };

  const handleNextMonth = () => {
    const nextMonth = data.month === 12 ? 1 : data.month + 1;
    const nextYear = data.month === 12 ? data.year + 1 : data.year;
    loadMonthData(nextYear, nextMonth);
  };

  const handleMonthSelect = (newMonth: number) => {
    loadMonthData(data.year, newMonth);
  };

  const handleYearSelect = (newYear: number) => {
    loadMonthData(newYear, data.month);
  };

  const handleGoToToday = () => {
    const now = new Date();
    loadMonthData(now.getFullYear(), now.getMonth() + 1);
  };

  // สร้างรายการปีสำหรับ Dropdown:
  // - สิ้นสุดที่ปีปัจจุบัน (ไม่จำเป็นต้องมีปีในอนาคต เพราะเป็นประวัติรายรับ-รายจ่ายจริง)
  // - ย้อนหลังได้ครอบคลุม 10 ปี
  // - เรียงจากปีล่าสุดลงไปอดีต เพื่อความสะดวกในการเลือก
  const currentActualYear = new Date().getFullYear();
  const maxYear = Math.max(data.year, currentActualYear);
  const minYear = Math.min(data.year, currentActualYear - 10);
  const yearOptions: number[] = [];
  for (let y = maxYear; y >= minYear; y--) {
    yearOptions.push(y);
  }

  // คำนวณ Donut Ring สำหรับ Win Rate %
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (data.winRate / 100) * circumference;

  // จัดการ Best / Worst Day
  const bestDayAmount = data.bestDay?.net || 0;
  const worstDayAmount = data.worstDay?.net || 0;

  return (
    <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-4 sm:p-6 lg:p-7 space-y-6">
      {/* 🌟 1. Top Summary Gradient Cards (Monthly Net Total & Annual Net Total) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-5">
        {/* Card 1: Monthly Net Total */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#059669] to-[#10b981] rounded-2xl p-4 sm:p-5 text-white shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/30">
            <svg
              className="w-6 h-6 sm:w-7 sm:h-7 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-emerald-100">
              รายรับสุทธิเดือนนี้
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {data.monthlyNetTotal >= 0 ? `+฿${data.monthlyNetTotal.toLocaleString()}` : `-฿${Math.abs(data.monthlyNetTotal).toLocaleString()}`}
            </div>
            <div className="text-[11px] text-emerald-100/90 font-medium">
              รายรับ ฿{data.monthlyRevenue.toLocaleString()} • รายจ่าย ฿{data.monthlyExpense.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Card 2: Annual Net Total */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#0d9488] to-[#14b8a6] rounded-2xl p-4 sm:p-5 text-white shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/30">
            <svg
              className="w-6 h-6 sm:w-7 sm:h-7 text-white"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div className="space-y-0.5">
            <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-teal-100">
              รายรับสุทธิปี {data.year} 
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {data.annualNetTotal >= 0 ? `+฿${data.annualNetTotal.toLocaleString()}` : `-฿${Math.abs(data.annualNetTotal).toLocaleString()}`}
            </div>
            <div className="text-[11px] text-teal-100/90 font-medium">
              กำไรสุทธิสะสมตลอดทั้งปี {data.year} ({data.year + 543})
            </div>
          </div>
        </div>
      </div>

      {/* 🌟 3. Month & Year Switcher Bar (Dropdowns + Today + Prev/Next) */}
      <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-2.5 sm:p-3 flex items-center justify-between gap-2 shadow-xs">
        {/* Left: Previous Month Button */}
        <button
          type="button"
          onClick={handlePrevMonth}
          disabled={isPending}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 active:scale-95 transition disabled:opacity-50 cursor-pointer shrink-0 shadow-2xs"
          title="เดือนก่อนหน้า"
          aria-label="เดือนก่อนหน้า"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Center: Dropdowns for Month and Year + Jump to Today */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap justify-center">
          {/* Month Selector */}
          <div className="relative">
            <select
              value={data.month}
              disabled={isPending}
              onChange={(e) => handleMonthSelect(Number(e.target.value))}
              className="appearance-none bg-white border border-slate-200 text-slate-800 font-bold text-xs sm:text-sm py-2 pl-2.5 sm:pl-3 pr-6 sm:pr-7 rounded-xl shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition cursor-pointer"
            >
              {THAI_MONTHS_FULL.map((name, idx) => (
                <option key={name} value={idx + 1}>
                  {name}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 sm:px-2 text-slate-500">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Year Selector */}
          <div className="relative">
            <select
              value={data.year}
              disabled={isPending}
              onChange={(e) => handleYearSelect(Number(e.target.value))}
              className="appearance-none bg-white border border-slate-200 text-slate-800 font-bold text-xs sm:text-sm py-2 pl-2.5 sm:pl-3 pr-6 sm:pr-7 rounded-xl shadow-2xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition cursor-pointer"
            >
              {yearOptions.map((yr) => (
                <option key={yr} value={yr}>
                  {yr} ({yr + 543})
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-1.5 sm:px-2 text-slate-500">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Jump to Today Button */}
          <button
            type="button"
            onClick={handleGoToToday}
            disabled={isPending}
            className="px-2.5 sm:px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold text-xs rounded-xl transition-all active:scale-95 cursor-pointer flex items-center gap-1 shadow-2xs whitespace-nowrap"
            title="กลับมาเดือนปัจจุบัน"
          >
            <span>🔄</span>
            <span className="hidden sm:inline">เดือนปัจจุบัน</span>
            <span className="sm:hidden">ปัจจุบัน</span>
          </button>

          {isPending && (
            <span className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin ml-0.5" />
          )}
        </div>

        {/* Right: Next Month Button */}
        <button
          type="button"
          onClick={handleNextMonth}
          disabled={isPending}
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 active:scale-95 transition disabled:opacity-50 cursor-pointer shrink-0 shadow-2xs"
          title="เดือนถัดไป"
          aria-label="เดือนถัดไป"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* 🌟 4. Main Body: Left Calendar Grid + Right Statistics Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 7-Day Calendar Grid (lg:col-span-8 or 9) */}
        <div className="lg:col-span-8 xl:col-span-9 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Header Row: SUN, MON, TUE, WED, THU, FRI, SAT */}
          <div className="grid grid-cols-7 bg-slate-50/90 border-b border-slate-200 text-center text-xs font-bold text-slate-600 py-3">
            {WEEKDAYS.map((w) => (
              <div key={w.short} className="truncate">
                <span className="hidden sm:inline">{w.short}</span>
                <span className="sm:hidden">{w.thai}</span>
              </div>
            ))}
          </div>

          {/* Calendar Cells Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 border-b border-slate-200">
            {/* Previous Month Pad Days */}
            {data.prevMonthDaysToPad.map((dayNum) => (
              <div
                key={`prev-${dayNum}`}
                className="min-h-[75px] sm:min-h-[95px] p-1.5 sm:p-2 bg-slate-50/40 text-slate-300 font-medium select-none flex flex-col justify-start"
              >
                <span className="text-xs sm:text-sm">{dayNum}</span>
              </div>
            ))}

            {/* Current Month Active Days */}
            {Array.from({ length: data.daysInMonth }, (_, idx) => {
              const d = idx + 1;
              const dayData = data.days[d];
              if (!dayData) return null;

              const hasJobs = dayData.jobCount > 0;
              const hasExpenses = dayData.expense > 0;
              const hasActivity = hasJobs || hasExpenses;

              const isProfitable = hasActivity && dayData.net > 0;
              const isLoss = hasActivity && dayData.net < 0;
              const isBreakEven = hasActivity && dayData.net === 0;

              // Cell Background & Border Colors
              let cellBg = "bg-white hover:bg-slate-50/80";
              let netTextColor = "text-slate-400";

              if (isProfitable) {
                cellBg = "bg-[#dcfce7]/70 hover:bg-[#bbf7d0]/80"; // Soft light emerald green
                netTextColor = "text-emerald-700";
              } else if (isLoss) {
                cellBg = "bg-[#ffe4e6]/70 hover:bg-[#fecdd3]/80"; // Soft light rose pink
                netTextColor = "text-rose-600";
              } else if (isBreakEven) {
                cellBg = "bg-slate-100 hover:bg-slate-200/70";
                netTextColor = "text-slate-700";
              }

              return (
                <div
                  key={`day-${d}`}
                  onClick={() => hasActivity && setSelectedDay(dayData)}
                  className={`min-h-[75px] sm:min-h-[95px] p-1.5 sm:p-2.5 flex flex-col justify-between transition-all select-none border-b border-slate-100 ${cellBg} ${
                    hasActivity ? "cursor-pointer active:scale-95" : ""
                  }`}
                  title={
                    hasActivity
                      ? `วันที่ ${d}: กำไร ฿${dayData.net.toLocaleString()} (${dayData.jobCount} งาน)`
                      : `วันที่ ${d}`
                  }
                >
                  {/* Top: Day Number */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs sm:text-sm font-semibold ${
                        isProfitable
                          ? "text-emerald-950"
                          : isLoss
                          ? "text-rose-950"
                          : "text-slate-600"
                      }`}
                    >
                      {d}
                    </span>
                    {hasActivity && (
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-400/50 sm:hidden" />
                    )}
                  </div>

                  {/* Middle: Net Income */}
                  {hasActivity ? (
                    <div className="my-auto text-center py-0.5">
                      <div
                        className={`text-[11px] sm:text-xs md:text-sm font-extrabold tracking-tight truncate ${netTextColor}`}
                      >
                        {dayData.net > 0
                          ? `+฿${dayData.net >= 1000 ? `${(dayData.net / 1000).toFixed(dayData.net % 1000 === 0 ? 0 : 1)}k` : dayData.net}`
                          : dayData.net < 0
                          ? `-฿${Math.abs(dayData.net) >= 1000 ? `${(Math.abs(dayData.net) / 1000).toFixed(Math.abs(dayData.net) % 1000 === 0 ? 0 : 1)}k` : Math.abs(dayData.net)}`
                          : "฿0"}
                      </div>
                      <div
                        className={`text-[9px] sm:text-[10px] font-medium leading-tight ${
                          isProfitable
                            ? "text-emerald-800/80"
                            : isLoss
                            ? "text-rose-800/80"
                            : "text-slate-500"
                        }`}
                      >
                        {dayData.jobCount} งาน
                      </div>
                    </div>
                  ) : (
                    <div className="my-auto" />
                  )}

                  {/* Bottom: subtle touch prompt */}
                  <div className="h-1" />
                </div>
              );
            })}

            {/* Next Month Pad Days */}
            {data.nextMonthDaysToPad.map((dayNum) => (
              <div
                key={`next-${dayNum}`}
                className="min-h-[75px] sm:min-h-[95px] p-1.5 sm:p-2 bg-slate-50/40 text-slate-300 font-medium select-none flex flex-col justify-start"
              >
                <span className="text-xs sm:text-sm">{dayNum}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Month Statistics Panel (lg:col-span-4 or 3) */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-1.5">
              <span>{data.monthName} {data.year}</span>
            </h3>
          </div>

          {/* Card 1: WIN RATE */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
                วันกำไร
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-blue-600">
                {data.winRate}%
              </div>
              <div className="text-xs text-slate-500 font-medium">
                <strong className="text-emerald-600 font-bold">{data.profitableDaysCount} วันกำไร</strong> /{" "}
                <span className="text-rose-600 font-bold">{data.lossDaysCount} วันขาดทุน</span>
              </div>
            </div>

            {/* Circular Donut Ring */}
            <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
                {/* Background circle */}
                <circle
                  cx="32"
                  cy="32"
                  r={radius}
                  className="stroke-slate-100"
                  strokeWidth="5"
                  fill="none"
                />
                {/* Progress circle */}
                <circle
                  cx="32"
                  cy="32"
                  r={radius}
                  className="stroke-blue-600 transition-all duration-700 ease-out"
                  strokeWidth="5"
                  strokeDasharray={circumference}
                  strokeDashoffset={isNaN(strokeDashoffset) ? circumference : strokeDashoffset}
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
              <div className="absolute text-[11px] font-extrabold text-slate-700">
                {Math.round(data.winRate)}%
              </div>
            </div>
          </div>

          {/* Card 2: TOTAL JOBS */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-1">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              งานทั้งหมด
            </span>
            <div className="text-2xl sm:text-3xl font-extrabold text-blue-600">
              {data.totalJobsCount}{" "}
              <span className="text-xs font-normal text-slate-500">งาน</span>
            </div>
            <div className="text-xs text-slate-500 font-medium pt-0.5">
              สูบสะสม {data.totalVolume.toLocaleString()} ลิตรในเดือนนี้
            </div>
          </div>

          {/* Card 3: DAILY PERFORMANCE (Best & Worst Day) */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-3">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              ประสิทธิภาพรายวัน
            </span>

            {/* Best Day */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">
                  ดีที่สุด (วันที่ {data.bestDay?.day || "-"})
                </span>
                <span className="font-bold text-emerald-600 text-sm">
                  {bestDayAmount > 0 ? `+฿${bestDayAmount.toLocaleString()}` : "฿0"}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: bestDayAmount > 0 ? "100%" : "0%" }}
                />
              </div>
            </div>

            {/* Worst Day */}
            <div className="space-y-1 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">
                  แย่ที่สุด (วันที่ {data.worstDay?.day || "-"})
                </span>
                <span className="font-bold text-rose-600 text-sm">
                  {worstDayAmount < 0 ? `-฿${Math.abs(worstDayAmount).toLocaleString()}` : "฿0"}
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-rose-500 h-full rounded-full transition-all duration-500"
                  style={{ width: worstDayAmount < 0 ? "100%" : "0%" }}
                />
              </div>
            </div>
          </div>

          {/* Card 4: AVERAGE DAILY NET */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-xs space-y-2">
            <span className="text-[11px] font-bold tracking-wider text-slate-400 uppercase">
              ประมาณกำไรสุทธิเฉลี่ยต่อวัน
            </span>
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-slate-500">กำไรสุทธิเฉลี่ย/วัน:</span>
              <span className="text-base sm:text-lg font-bold text-slate-900">
                ฿{data.avgDailyNet.toLocaleString()}
              </span>
            </div>
            <div className="flex items-baseline justify-between text-xs border-t border-slate-100 pt-2 text-slate-500">
              <span>วันที่มีงานทำ:</span>
              <span className="font-semibold text-slate-800">
                {data.activeDaysCount} วัน (จาก {data.daysInMonth} วัน)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 🌟 5. Interactive Day Detail Modal */}
      {selectedDay && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200"
          onClick={() => setSelectedDay(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span>📅 รายละเอียดวันที่ {selectedDay.day} {data.monthName} {data.year}</span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  ({selectedDay.dateStr})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Financial Summary Pill for the Day */}
            <div className="grid grid-cols-3 gap-2 text-center p-3 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">รายรับ</span>
                <span className="text-xs sm:text-sm font-bold text-emerald-600">
                  ฿{selectedDay.revenue.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">รายจ่าย</span>
                <span className="text-xs sm:text-sm font-bold text-rose-600">
                  ฿{selectedDay.expense.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">กำไรสุทธิ</span>
                <span
                  className={`text-xs sm:text-sm font-extrabold ${
                    selectedDay.net >= 0 ? "text-emerald-700" : "text-rose-700"
                  }`}
                >
                  {selectedDay.net >= 0 ? `+฿${selectedDay.net.toLocaleString()}` : `-฿${Math.abs(selectedDay.net).toLocaleString()}`}
                </span>
              </div>
            </div>

            {/* Jobs List for the Day */}
            <div className="space-y-2">
              <h5 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span>🚛 งานที่ทำสำเร็จ ({selectedDay.jobs.length} งาน)</span>
              </h5>
              {selectedDay.jobs.length === 0 ? (
                <div className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl text-center">
                  ไม่มีงานที่ส่งในวันนี้
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {selectedDay.jobs.map((j) => (
                    <div
                      key={j.id}
                      className="p-2.5 rounded-xl border border-slate-100 bg-emerald-50/30 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-800">{j.customerName}</span>
                        <div className="text-[11px] text-slate-400">
                          สูบ {j.volumePumped.toLocaleString()} ลิตร • ชำระ: {getPaymentMethodLabel(j.paymentMethod)}
                        </div>
                      </div>
                      <span className="font-bold text-emerald-600 text-sm">
                        +฿{j.price.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Expenses List for the Day */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <h5 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <span>💸 ค่าใช้จ่ายในวันนี้ ({selectedDay.expenses.length} รายการ)</span>
              </h5>
              {selectedDay.expenses.length === 0 ? (
                <div className="text-xs text-slate-400 bg-slate-50 p-3 rounded-xl text-center">
                  ไม่มีค่าใช้จ่ายบันทึกในวันนี้
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {selectedDay.expenses.map((e) => (
                    <div
                      key={e.id}
                      className="p-2.5 rounded-xl border border-slate-100 bg-rose-50/30 flex items-center justify-between text-xs"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-slate-800">
                          {getExpenseCategoryLabel(e.category)}
                        </span>
                        {e.note && (
                          <div className="text-[11px] text-slate-400 truncate max-w-[200px]">
                            {e.note}
                          </div>
                        )}
                      </div>
                      <span className="font-bold text-rose-600 text-sm">
                        -฿{e.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="w-full py-2.5 bg-slate-900 hover:bg-black text-white font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

