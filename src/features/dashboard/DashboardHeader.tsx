"use client";

import { memo } from "react";
import DateRangePicker from "@/components/ui/DateRangePicker";
import { IconButton } from "@/components/ui/Controls";
import { DateRange } from "@/utils/date";

interface Props {
  title: string;
  range: DateRange;
  onRangeChange: (r: DateRange) => void;
  onOpenSidebar: () => void;
  onToggleFilters: () => void;
  filtersHighlighted: boolean;
  activeFilterCount: number;
  onRefresh: () => void;
  refreshDisabled: boolean;
  refreshSpinning: boolean;
  lastUpdatedLabel: string | null;
}

const DashboardHeader = memo(function DashboardHeader({
  title, range, onRangeChange, onOpenSidebar, onToggleFilters,
  filtersHighlighted, activeFilterCount, onRefresh, refreshDisabled,
  refreshSpinning, lastUpdatedLabel,
}: Props) {
  return (
    <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
      <button
        onClick={onOpenSidebar}
        aria-label="Menyuni ochish"
        className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 p-1"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
        </svg>
      </button>

      <h1 className="text-base font-semibold text-gray-800 dark:text-slate-100 flex-1">{title}</h1>

      <div className="flex items-center gap-2">
        {lastUpdatedLabel && (
          <span className="text-xs text-gray-400 hidden sm:block">{lastUpdatedLabel}</span>
        )}

        <DateRangePicker value={range} onChange={onRangeChange} />

        <button
          onClick={onToggleFilters}
          className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border transition-colors ${
            filtersHighlighted
              ? "bg-blue-600 border-blue-600 text-white"
              : "border-gray-300 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M3 4h18M7 8h10M11 12h2M9 16h6" strokeLinecap="round" />
          </svg>
          Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
        </button>

        <IconButton
          onClick={onRefresh}
          title="Bugungi ma'lumotlarni yangilash"
          disabled={refreshDisabled}
          spinning={refreshSpinning}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </IconButton>
      </div>
    </header>
  );
});

export default DashboardHeader;
