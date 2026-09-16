import Link from "next/link";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  buildPageUrl: (pageNumber: number) => string;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  buildPageUrl,
  className,
}: PaginationProps) {
  const containerClass =
    className ||
    "bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500";

  return (
    <div className={containerClass}>
      <div>
        แสดง {totalItems === 0 ? 0 : startIndex + 1} - {endIndex} จาก {totalItems} รายการ
      </div>

      <div className="flex items-center gap-2">
        {currentPage > 1 ? (
          <Link
            href={buildPageUrl(currentPage - 1)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition font-medium"
          >
            ◀ ก่อนหน้า
          </Link>
        ) : (
          <span className="px-3 py-1.5 bg-slate-50 text-slate-300 rounded-lg cursor-not-allowed select-none">
            ◀ ก่อนหน้า
          </span>
        )}

        <span className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg font-bold text-slate-800 shadow-sm">
          หน้า {currentPage} / {totalPages}
        </span>

        {currentPage < totalPages ? (
          <Link
            href={buildPageUrl(currentPage + 1)}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition font-medium"
          >
            ถัดไป ▶
          </Link>
        ) : (
          <span className="px-3 py-1.5 bg-slate-50 text-slate-300 rounded-lg cursor-not-allowed select-none">
            ถัดไป ▶
          </span>
        )}
      </div>
    </div>
  );
}

