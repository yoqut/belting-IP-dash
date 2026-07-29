"use client";

import { useState } from "react";
import Sidebar from "@/components/Sidebar";
import StatCards from "@/components/StatCards";
import CdrTable from "@/features/yeastar/CdrTable";
import FilterPanel from "@/components/FilterPanel";
import DateRangePicker from "@/components/ui/DateRangePicker";
import { IconButton } from "@/components/ui/Controls";
import { ErrorAlert } from "@/components/ui/Feedback";
import { useCdr } from "@/hooks/useCdr";
import { useCdrFilters } from "@/hooks/useCdrFilters";
import { TRUNK_LINES } from "@/utils/calls";
import { DateRange, todayRange } from "@/utils/date";

/** Yeastar PBX qo'ng'iroqlar tarixi (xom CDR ko'rinishi). */
export default function YeastarPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [range, setRange] = useState<DateRange>(todayRange);

  const { records, calledBackNumbers, isLoading, isLoadingMore, error, dataUpdatedAt, refetch } = useCdr(range);
  const {
    callFilter, setCallFilter, draftFilters, setDraftFilters,
    applyDraft, clearFilters, hasActiveFilters, stats, visibleRecords, employees,
  } = useCdrFilters({ records, calledBackNumbers });

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString("uz-UZ") : null;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-950 flex flex-col">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-4 py-3 flex items-center gap-4 sticky top-0 z-30">
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Menyuni ochish"
          className="text-gray-500 hover:text-gray-700 transition-colors p-1"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>

        <h1 className="text-lg font-semibold text-gray-800 dark:text-slate-100 flex-1">
          Qo&apos;ng&apos;iroqlar tarixi
        </h1>

        <div className="flex items-center gap-2">
          {isLoadingMore ? (
            <span className="flex items-center gap-1.5 text-xs text-blue-500">
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9" strokeLinecap="round" />
              </svg>
              Yuklanmoqda...
            </span>
          ) : lastUpdated && (
            <span className="text-xs text-gray-400 hidden sm:block">{lastUpdated}</span>
          )}

          <DateRangePicker
            value={range}
            onChange={r => { setRange(r); setCallFilter("all"); }}
          />

          <IconButton
            onClick={() => void refetch()}
            title="Yangilash"
            disabled={isLoading || isLoadingMore}
            spinning={isLoading}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </IconButton>

          <button
            onClick={() => setFilterOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium border transition-colors ${
              hasActiveFilters
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-300 border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M3 4h18M7 8h10M11 12h2M9 16h6" strokeLinecap="round" />
            </svg>
            Barcha filtrlar
            {hasActiveFilters && (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" /></svg>
            )}
          </button>
        </div>
      </header>

      <main className="flex-1 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          {error && <div className="p-3"><ErrorAlert message={error} onRetry={() => void refetch()} /></div>}

          <StatCards stats={stats} active={callFilter} onChange={setCallFilter} />
          <CdrTable records={visibleRecords} loading={isLoading} />
        </div>
      </main>

      <FilterPanel
        open={filterOpen}
        values={draftFilters}
        employees={employees}
        lines={TRUNK_LINES}
        onChange={setDraftFilters}
        onApply={() => { applyDraft(); setFilterOpen(false); }}
        onClear={clearFilters}
        onClose={() => setFilterOpen(false)}
      />
    </div>
  );
}
