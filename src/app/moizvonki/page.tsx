"use client";

import { memo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { IconButton } from "@/components/ui/Controls";
import { ErrorAlert } from "@/components/ui/Feedback";
import { StatCardsSkeleton } from "@/components/ui/Skeleton";
import MoizvonkiTable from "@/features/moizvonki/MoizvonkiTable";
import { useMoizvonki } from "@/hooks/useMoizvonki";

const StatCard = memo(function StatCard({
  label, value, color,
}: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm px-5 py-4">
      <div className={`text-2xl font-bold ${color ?? "text-gray-800 dark:text-slate-100"}`}>{value}</div>
      <div className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{label}</div>
    </div>
  );
});

/** MoiZvonki (SIM) qo'ng'iroqlari — bugungi kun kesimi. */
export default function MoizvonkiPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { calls, employeeMap, stats, isLoading, isFetching, error, dataUpdatedAt, refetch } = useMoizvonki();

  const lastUpdated = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString("uz-UZ") : null;

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-950 flex flex-col">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-4 py-3 flex items-center gap-4 sticky top-0 z-30">
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Menyuni ochish"
          className="text-gray-500 hover:text-gray-700 p-1"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>

        <h1 className="text-lg font-semibold text-gray-800 dark:text-slate-100 flex-1">
          MoiZvonki — Qo&apos;ng&apos;iroqlar
        </h1>

        <div className="flex items-center gap-2">
          {lastUpdated && <span className="text-xs text-gray-400 hidden sm:block">{lastUpdated}</span>}
          <IconButton
            onClick={() => void refetch()}
            title="Yangilash"
            disabled={isFetching}
            spinning={isFetching}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </IconButton>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4">
        {isLoading ? (
          <StatCardsSkeleton count={5} />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <StatCard label="Jami" value={stats.total} />
            <StatCard label="Kiruvchi" value={stats.inbound} />
            <StatCard label="Chiquvchi" value={stats.outbound} />
            <StatCard label="Javob berilgan" value={stats.answered} color="text-green-600" />
            <StatCard label="Javobsiz" value={stats.missed} color={stats.missed > 0 ? "text-red-600" : undefined} />
          </div>
        )}

        {error && <ErrorAlert message={error} onRetry={() => void refetch()} />}

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          <MoizvonkiTable calls={calls} employeeMap={employeeMap} loading={isLoading} />
        </div>
      </main>
    </div>
  );
}
