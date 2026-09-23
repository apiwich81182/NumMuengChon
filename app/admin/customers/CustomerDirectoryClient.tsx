"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveOrUpdateCustomer, deleteCustomer } from "@/actions/customers";
import { toast } from "@/components/Toast";
import {
  Users,
  Search,
  Phone,
  MapPin,
  Calendar,
  ExternalLink,
  Plus,
  ArrowRight,
  ClipboardList,
  Edit2,
  Trash2,
  X,
  Loader2,
} from "lucide-react";

interface CustomerItem {
  id: string;
  phone: string;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  note: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  jobCount: number;
  lastJobDate: Date | string | null;
  lastJobPrice: number | null;
}

interface CustomerDirectoryClientProps {
  initialCustomers: CustomerItem[];
  initialTotal: number;
  initialTotalPages: number;
  currentPage: number;
  searchQuery: string;
}

export default function CustomerDirectoryClient({
  initialCustomers,
  initialTotal,
  initialTotalPages,
  currentPage,
  searchQuery,
}: CustomerDirectoryClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState(searchQuery);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Modal form states
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formLatitude, setFormLatitude] = useState("");
  const [formLongitude, setFormLongitude] = useState("");
  const [formNote, setFormNote] = useState("");

  function openCreateModal() {
    setEditingCustomer(null);
    setFormName("");
    setFormPhone("");
    setFormAddress("");
    setFormLatitude("");
    setFormLongitude("");
    setFormNote("");
    setModalOpen(true);
  }

  function openEditModal(customer: CustomerItem) {
    setEditingCustomer(customer);
    setFormName(customer.name);
    setFormPhone(customer.phone);
    setFormAddress(customer.address || "");
    setFormLatitude(customer.latitude ? String(customer.latitude) : "");
    setFormLongitude(customer.longitude ? String(customer.longitude) : "");
    setFormNote(customer.note || "");
    setModalOpen(true);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams();
    if (search.trim()) p.set("search", search.trim());
    p.set("page", "1");
    router.push(`/admin/customers?${p.toString()}`);
  }

  async function handleSaveCustomer(e: React.FormEvent) {
    e.preventDefault();
    if (!formPhone.trim()) {
      toast.error("กรุณาระบุเบอร์โทรศัพท์ลูกค้า");
      return;
    }

    setSaving(true);
    try {
      const res = await saveOrUpdateCustomer({
        phone: formPhone.trim(),
        name: formName.trim() || "ไม่ระบุชื่อ",
        address: formAddress.trim() || null,
        latitude: formLatitude ? parseFloat(formLatitude) : null,
        longitude: formLongitude ? parseFloat(formLongitude) : null,
        note: formNote.trim() || null,
      });

      if (!res.success) {
        toast.error(res.error || "เกิดข้อผิดพลาดในการบันทึก");
        setSaving(false);
        return;
      }

      toast.success("บันทึกข้อมูลลูกค้าสำเร็จ");
      setModalOpen(false);
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteCustomer(id: string, name: string) {
    if (!confirm(`คุณต้องการลบข้อมูลลูกค้า "${name}" ใช่หรือไม่?\n(ประวัติงานเดิมจะไม่สูญหาย)`)) {
      return;
    }
    try {
      const res = await deleteCustomer(id);
      if (res.success) {
        toast.success("ลบข้อมูลลูกค้าเรียบร้อยแล้ว");
        router.refresh();
      } else {
        toast.error(res.error || "เกิดข้อผิดพลาดในการลบข้อมูล");
      }
    } catch {
      toast.error("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    }
  }

  return (
    <div className="space-y-6">
      {/* Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-7 h-7 text-purple-600" />
            <span>ฐานข้อมูลลูกค้า</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-semibold">
              {initialTotal} ราย
            </span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            ค้นหาข้อมูลลูกค้าเก่า ประวัติการรับบริการ และจ่ายงานได้ทันที
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/admin/jobs/assign"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs transition"
          >
            <ClipboardList className="w-4 h-4" />
            <span>จ่ายงาน (Dispatch)</span>
          </Link>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มลูกค้า</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาด้วย เบอร์โทรศัพท์, ชื่อลูกค้า หรือ ที่อยู่..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition font-medium"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold rounded-xl transition shadow-xs cursor-pointer"
          >
            ค้นหา
          </button>
        </form>
      </div>

      {/* Customer List / Table */}
      {initialCustomers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-600 font-semibold text-base">ไม่พบข้อมูลลูกค้า</p>
          <p className="text-slate-400 text-xs mt-1">
            {search ? "ลองเปลี่ยนคำค้นหาใหม่" : "เมื่อมีการบันทึกงาน ระบบจะเก็บข้อมูลลูกค้าให้อัตโนมัติ"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="divide-y divide-slate-100">
            {initialCustomers.map((cust) => {
              const mapUrl =
                cust.latitude && cust.longitude
                  ? `https://www.google.com/maps/search/?api=1&query=${cust.latitude},${cust.longitude}`
                  : cust.address
                  ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cust.address)}`
                  : null;

              return (
                <div
                  key={cust.id}
                  className="p-4 sm:p-5 hover:bg-slate-50/80 transition flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                >
                  {/* Left Column: Customer details */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-base text-slate-900">{cust.name}</span>
                      <a
                        href={`tel:${cust.phone}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200 transition"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{cust.phone}</span>
                      </a>
                      <span className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100">
                        รับบริการ {cust.jobCount} ครั้ง
                      </span>
                    </div>

                    {cust.address && (
                      <p className="text-xs text-slate-600 flex items-start gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>{cust.address}</span>
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-0.5">
                      {cust.lastJobDate && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>
                            บริการล่าสุด:{" "}
                            {new Date(cust.lastJobDate).toLocaleDateString("th-TH", {
                              day: "numeric",
                              month: "short",
                              year: "2-digit",
                            })}
                          </span>
                          {cust.lastJobPrice && (
                            <span className="font-semibold text-emerald-600">
                              (฿{cust.lastJobPrice.toLocaleString()})
                            </span>
                          )}
                        </span>
                      )}

                      {mapUrl && (
                        <a
                          href={mapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>แผนที่</span>
                        </a>
                      )}

                      {cust.note && (
                        <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 text-[11px]">
                          โน้ต: {cust.note}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openEditModal(cust)}
                      className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
                      title="แก้ไขข้อมูลลูกค้า"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteCustomer(cust.id, cust.name)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition cursor-pointer"
                      title="ลบข้อมูลลูกค้า"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <Link
                      href={`/admin/jobs/assign?phone=${encodeURIComponent(cust.phone)}`}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white border border-blue-200 transition shadow-2xs"
                    >
                      <span>จ่ายงาน</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {initialTotalPages > 1 && (
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>
                หน้า {currentPage} จาก {initialTotalPages} (ทั้งหมด {initialTotal} ราย)
              </span>
              <div className="flex items-center gap-1.5">
                {currentPage > 1 && (
                  <Link
                    href={`/admin/customers?page=${currentPage - 1}${search ? `&search=${search}` : ""}`}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition"
                  >
                    ก่อนหน้า
                  </Link>
                )}
                {currentPage < initialTotalPages && (
                  <Link
                    href={`/admin/customers?page=${currentPage + 1}${search ? `&search=${search}` : ""}`}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition"
                  >
                    ถัดไป
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal: เพิ่ม / แก้ไขข้อมูลลูกค้า */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                <span>{editingCustomer ? "แก้ไขข้อมูลลูกค้า" : "เพิ่มลูกค้าใหม่"}</span>
              </h3>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  เบอร์โทรศัพท์ลูกค้า <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="เช่น 0812345678"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อลูกค้า / หน่วยงาน <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="เช่น คุณสมชาย หรือ หจก. รุ่งเรือง"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ที่อยู่ / สถานที่ / จุดสังเกต
                </label>
                <textarea
                  rows={2}
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="เช่น 123/45 ซอยเทศบาล 8 ตรงข้ามวัดดอนไก่ดี"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Latitude</label>
                  <input
                    type="text"
                    value={formLatitude}
                    onChange={(e) => setFormLatitude(e.target.value)}
                    placeholder="เช่น 13.543210"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Longitude</label>
                  <input
                    type="text"
                    value={formLongitude}
                    onChange={(e) => setFormLongitude(e.target.value)}
                    placeholder="เช่น 100.278910"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">หมายเหตุ</label>
                <input
                  type="text"
                  value={formNote}
                  onChange={(e) => setFormNote(e.target.value)}
                  placeholder="เช่น ซอยแคบ ห้ามรถใหญ่เข้าช่วงเช้า"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingCustomer ? "บันทึกการแก้ไข" : "เพิ่มลูกค้า"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
