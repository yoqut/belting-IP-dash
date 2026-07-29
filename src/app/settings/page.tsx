"use client";

import { useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { ErrorAlert } from "@/components/ui/Feedback";
import { Skeleton } from "@/components/ui/Skeleton";
import EmployeeLinkRow from "@/features/settings/EmployeeLinkRow";
import { useSettings } from "@/hooks/useSettings";

const GRID = "grid-cols-[1fr_32px_120px_32px_1fr_32px]";

/** Ikki tizimdagi (PBX / SIM) xodimlarni bitta ismga bog'lash sahifasi. */
export default function SettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const {
    employees, mzList, yeastarList, isLoading, error,
    updateRow, addRow, removeRow, save, isSaving, isSaved, saveError,
  } = useSettings();

  // Band qilingan qiymatlar bir marta hisoblanadi — har qatorda emas.
  // Avval har bir qator render'ida `filter` + `find` chaqirilardi (O(n²)).
  const usedMzEmails = useMemo(
    () => new Set(employees.map(e => e.mzEmail).filter(Boolean)),
    [employees],
  );
  const usedYeastarNames = useMemo(
    () => new Set(employees.map(e => e.yeastarExtName).filter(Boolean)),
    [employees],
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-5 py-3.5 flex items-center gap-4 sticky top-0 z-30">
        <button
          onClick={() => setSidebarOpen(true)}
          aria-label="Menyuni ochish"
          className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>

        <h1 className="text-base font-semibold text-gray-800 dark:text-slate-100 flex-1">Sozlamalar</h1>

        <button
          onClick={save}
          disabled={isSaving || isLoading}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all disabled:opacity-40 text-white ${
            isSaved ? "bg-green-600" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isSaving ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9" strokeLinecap="round" />
              </svg>
              Saqlanmoqda
            </>
          ) : isSaved ? (
            <>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Saqlandi
            </>
          ) : "Saqlash"}
        </button>
      </header>

      <main className="flex-1 p-5 max-w-3xl mx-auto w-full space-y-4">
        {error && <ErrorAlert message={error} />}
        {saveError && <ErrorAlert message={saveError} onRetry={save} />}

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-800 dark:text-slate-100">Xodimlarni birlashtirish</h2>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Ikki tizimdagi bir xodimni bog&apos;lang</p>
            </div>
            <button
              onClick={addRow}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path d="M12 4v16m8-8H4" strokeLinecap="round" />
              </svg>
              Qo&apos;shish
            </button>
          </div>

          <div className={`grid ${GRID} items-center px-6 py-2.5 bg-gray-50 dark:bg-slate-700/30 border-b border-gray-100 dark:border-slate-700`}>
            <span className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Ofis tizimi (PBX)</span>
            <span />
            <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider text-center">Ism</span>
            <span />
            <span className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Mobil tizim</span>
            <span />
          </div>

          <div className="divide-y divide-gray-50 dark:divide-slate-700/50">
            {isLoading && (
              <div className="px-6 py-4 space-y-3">
                {Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-9" />)}
              </div>
            )}

            {!isLoading && employees.length === 0 && (
              <div className="px-6 py-10 text-center text-sm text-gray-400">
                Hech narsa yo&apos;q — &quot;Qo&apos;shish&quot; tugmasini bosing
              </div>
            )}

            {!isLoading && employees.map((link, i) => (
              <EmployeeLinkRow
                key={i}
                index={i}
                link={link}
                mzList={mzList}
                yeastarList={yeastarList}
                usedMzEmails={usedMzEmails}
                usedYeastarNames={usedYeastarNames}
                onChange={updateRow}
                onRemove={removeRow}
              />
            ))}
          </div>
        </div>

        {/* Tushuntirish bloki */}
        <div className="flex items-stretch gap-3 text-xs">
          <div className="flex-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3.5 flex flex-col gap-1">
            <div className="font-semibold text-gray-700 dark:text-slate-300">Ofis tizimi</div>
            <div className="text-gray-400 dark:text-slate-500">IP-telefon, PBX orqali qo&apos;ng&apos;iroqlar</div>
          </div>
          <div className="flex items-center text-gray-300 dark:text-slate-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex-1 bg-blue-600 rounded-xl px-4 py-3.5 flex flex-col gap-1">
            <div className="font-semibold text-white">Ko&apos;rsatiladigan ism</div>
            <div className="text-blue-200">Dashboardda birlashtirilgan ko&apos;rinish</div>
          </div>
          <div className="flex items-center text-gray-300 dark:text-slate-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex-1 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3.5 flex flex-col gap-1">
            <div className="font-semibold text-gray-700 dark:text-slate-300">Mobil tizim</div>
            <div className="text-gray-400 dark:text-slate-500">SIM karta orqali qo&apos;ng&apos;iroqlar</div>
          </div>
        </div>
      </main>
    </div>
  );
}
