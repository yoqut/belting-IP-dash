"use client";

import { memo, useMemo } from "react";
import { PAGE_SIZES } from "@/hooks/useCallFilters";

const MAX_PAGE_BUTTONS = 5;

interface Props {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  /** Standart variantlar mos kelmasa (masalan CDR jadvalida). */
  pageSizes?: readonly number[];
}

function NavButton({
  onClick, disabled, label, children,
}: { onClick: () => void; disabled: boolean; label: string; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="p-1.5 rounded text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
    >
      {children}
    </button>
  );
}

const PaginationBar = memo(function PaginationBar({
  page, pageSize, totalItems, totalPages, onPageChange, onPageSizeChange, pageSizes = PAGE_SIZES,
}: Props) {
  /**
   * Ko'rinadigan sahifa raqamlari.
   * Avvalgi kodda `Array.from` ichida `null` qaytariladigan mantiq bor edi va
   * `totalPages < 5` bo'lganda `start` manfiy chiqib, noto'g'ri raqamlar
   * ko'rsatilardi. Endi diapazon oldindan qirqib olinadi.
   */
  const pages = useMemo(() => {
    const count = Math.min(MAX_PAGE_BUTTONS, totalPages);
    const start = Math.max(1, Math.min(page - 2, totalPages - count + 1));
    return Array.from({ length: count }, (_, i) => start + i);
  }, [page, totalPages]);

  const from = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  return (
    <div className="sticky bottom-0 z-20 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 px-4 py-2.5 flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400 dark:text-slate-500 whitespace-nowrap">Sahifada:</span>
        <div className="flex gap-1">
          {pageSizes.map(size => (
            <button
              key={size}
              onClick={() => onPageSizeChange(size)}
              aria-pressed={pageSize === size}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                pageSize === size
                  ? "bg-blue-600 text-white"
                  : "text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"
              }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <span className="text-xs text-gray-400 dark:text-slate-500 mr-2 whitespace-nowrap">
          {totalItems === 0 ? "0" : `${from}–${to}`} / {totalItems}
        </span>

        <NavButton onClick={() => onPageChange(1)} disabled={page <= 1} label="Birinchi sahifa">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M11 19l-7-7 7-7M18 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </NavButton>
        <NavButton onClick={() => onPageChange(page - 1)} disabled={page <= 1} label="Oldingi sahifa">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </NavButton>

        {pages.map(p => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            aria-current={p === page ? "page" : undefined}
            className={`w-7 h-7 text-xs rounded font-medium transition-colors ${
              p === page
                ? "bg-blue-600 text-white"
                : "text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"
            }`}
          >
            {p}
          </button>
        ))}

        <NavButton onClick={() => onPageChange(page + 1)} disabled={page >= totalPages} label="Keyingi sahifa">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </NavButton>
        <NavButton onClick={() => onPageChange(totalPages)} disabled={page >= totalPages} label="Oxirgi sahifa">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M13 5l7 7-7 7M6 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </NavButton>
      </div>
    </div>
  );
});

export default PaginationBar;
