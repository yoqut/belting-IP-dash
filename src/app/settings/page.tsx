"use client";

import { useEffect, useState, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import { EmployeeLink, AppSettings } from "@/types/unified";
import { MZEmployee } from "@/lib/moizvonki";

interface YeastarEmployee { number: string; name: string; }

export default function SettingsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [employees, setEmployees] = useState<EmployeeLink[]>([]);
  const [mzList, setMzList] = useState<MZEmployee[]>([]);
  const [yList, setYList] = useState<YeastarEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      setEmployees((data.settings as AppSettings).employees ?? []);
      setMzList(data.mzEmployees ?? []);
      setYList(data.yeastarEmployees ?? []);
      if (data.yeastarError) setError(`PBX xodimlar yuklanmadi: ${data.yeastarError}`);
    } catch {
      setError("Sozlamalar yuklanmadi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = (i: number, field: keyof EmployeeLink, value: string) => {
    setEmployees(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: value } : e));
    setSaved(false);
  };

  const addRow = () => {
    setEmployees(prev => [...prev, { displayName: "", mzEmail: "", yeastarExtName: "" }]);
    setSaved(false);
  };

  const removeRow = (i: number) => {
    setEmployees(prev => prev.filter((_, idx) => idx !== i));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employees } satisfies AppSettings),
      });
      if (!res.ok) throw new Error("Saqlashda xato");
      setSaved(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Xato");
    } finally {
      setSaving(false);
    }
  };

  const usedMz = new Set(employees.map(e => e.mzEmail).filter(Boolean));
  const usedY = new Set(employees.map(e => e.yeastarExtName).filter(Boolean));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-950 flex flex-col">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Header */}
      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-5 py-3.5 flex items-center gap-4 sticky top-0 z-30">
        <button onClick={() => setSidebarOpen(true)} className="text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>
        <h1 className="text-base font-semibold text-gray-800 dark:text-slate-100 flex-1">Sozlamalar</h1>
        <button
          onClick={save}
          disabled={saving || loading}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all disabled:opacity-40 ${
            saved
              ? "bg-green-600 text-white"
              : "bg-blue-600 hover:bg-blue-700 text-white"
          }`}
        >
          {saving ? (
            <>
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9" strokeLinecap="round" />
              </svg>
              Saqlanmoqda
            </>
          ) : saved ? (
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
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-600 flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
            </svg>
            {error}
          </div>
        )}

        {/* Main card */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
          {/* Card header */}
          <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-gray-800 dark:text-slate-100">Xodimlarni birlashtirish</h2>
              <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">Ikki tizimdagi bir xodimni bog&apos;lang</p>
            </div>
            <button
              onClick={addRow}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                <path d="M12 4v16m8-8H4" strokeLinecap="round" />
              </svg>
              Qo&apos;shish
            </button>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-[1fr_32px_120px_32px_1fr_32px] items-center px-6 py-2.5 bg-gray-50 dark:bg-slate-700/30 border-b border-gray-100 dark:border-slate-700">
            <span className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Ofis tizimi (PBX)</span>
            <span />
            <span className="text-[10px] font-semibold text-blue-500 uppercase tracking-wider text-center">Ism</span>
            <span />
            <span className="text-[10px] font-semibold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Mobil tizim</span>
            <span />
          </div>

          {/* Rows */}
          <div className="divide-y divide-gray-50 dark:divide-slate-700/50">
            {loading && (
              <div className="px-6 py-10 text-center">
                <div className="inline-flex items-center gap-2 text-sm text-gray-400">
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9" strokeLinecap="round" />
                  </svg>
                  Yuklanmoqda...
                </div>
              </div>
            )}

            {!loading && employees.length === 0 && (
              <div className="px-6 py-10 text-center text-sm text-gray-400">
                Hech narsa yo&apos;q — &quot;Qo&apos;shish&quot; tugmasini bosing
              </div>
            )}

            {!loading && employees.map((e, i) => {
              const availableY = yList.filter(y => !usedY.has(y.name) || y.name === e.yeastarExtName);
              const availableMz = mzList.filter(m => !usedMz.has(m.email) || m.email === e.mzEmail);
              const ySelected = yList.find(y => y.name === e.yeastarExtName);
              const mzSelected = mzList.find(m => m.email === e.mzEmail);

              return (
                <div key={i} className="grid grid-cols-[1fr_32px_120px_32px_1fr_32px] items-center gap-0 px-6 py-3 hover:bg-gray-50/60 dark:hover:bg-slate-700/30 transition-colors group">
                  {/* Yeastar dropdown */}
                  <div className="relative">
                    <select
                      value={e.yeastarExtName}
                      onChange={ev => update(i, "yeastarExtName", ev.target.value)}
                      className={`w-full pl-3 pr-7 py-2 text-xs rounded-lg border transition-colors appearance-none bg-white dark:bg-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 ${
                        ySelected ? "border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200" : "border-dashed border-gray-200 dark:border-slate-600 text-gray-400 dark:text-slate-500"
                      }`}
                    >
                      <option value="">— tanlang —</option>
                      {e.yeastarExtName && !yList.find(y => y.name === e.yeastarExtName) && (
                        <option value={e.yeastarExtName}>{e.yeastarExtName}</option>
                      )}
                      {availableY.map(y => (
                        <option key={y.number} value={y.name}>{y.name}</option>
                      ))}
                    </select>
                    <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {ySelected && (
                      <div className="mt-1 text-[10px] text-gray-400 pl-0.5">#{ySelected.number}</div>
                    )}
                  </div>

                  {/* Left arrow */}
                  <div className="flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path d="M13 7l5 5m0 0l-5 5m5-5H6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>

                  {/* Display name */}
                  <input
                    type="text"
                    value={e.displayName}
                    onChange={ev => update(i, "displayName", ev.target.value)}
                    placeholder="Ism"
                    className="w-full px-2.5 py-2 text-xs font-semibold text-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 placeholder:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
                  />

                  {/* Right arrow */}
                  <div className="flex items-center justify-center">
                    <svg className="w-3.5 h-3.5 text-gray-300" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path d="M13 7l5 5m0 0l-5 5m5-5H6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>

                  {/* MoiZvonki dropdown */}
                  <div className="relative">
                    <select
                      value={e.mzEmail}
                      onChange={ev => update(i, "mzEmail", ev.target.value)}
                      className={`w-full pl-3 pr-7 py-2 text-xs rounded-lg border transition-colors appearance-none bg-white dark:bg-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 ${
                        mzSelected ? "border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200" : "border-dashed border-gray-200 dark:border-slate-600 text-gray-400 dark:text-slate-500"
                      }`}
                    >
                      <option value="">— tanlang —</option>
                      {e.mzEmail && !mzList.find(m => m.email === e.mzEmail) && (
                        <option value={e.mzEmail}>{e.mzEmail}</option>
                      )}
                      {availableMz.map(m => (
                        <option key={m.email} value={m.email}>{m.display_name}</option>
                      ))}
                    </select>
                    <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {mzSelected && (
                      <div className="mt-1 text-[10px] text-gray-400 pl-0.5 truncate">{mzSelected.email}</div>
                    )}
                  </div>

                  {/* Delete */}
                  <div className="flex items-center justify-center">
                    <button
                      onClick={() => removeRow(i)}
                      className="p-1 text-gray-200 hover:text-red-400 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Info block */}
        <div className="flex items-stretch gap-3 text-xs">
          <div className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3.5 flex flex-col gap-1">
            <div className="font-semibold text-gray-700">Ofis tizimi</div>
            <div className="text-gray-400">IP-telefon, PBX orqali qo&apos;ng&apos;iroqlar</div>
          </div>
          <div className="flex items-center text-gray-300">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex-1 bg-blue-600 rounded-xl px-4 py-3.5 flex flex-col gap-1">
            <div className="font-semibold text-white">Ko&apos;rsatiladigan ism</div>
            <div className="text-blue-200">Dashboardda birlashtirilgan ko&apos;rinish</div>
          </div>
          <div className="flex items-center text-gray-300">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="flex-1 bg-white border border-gray-200 rounded-xl px-4 py-3.5 flex flex-col gap-1">
            <div className="font-semibold text-gray-700">Mobil tizim</div>
            <div className="text-gray-400">SIM karta orqali qo&apos;ng&apos;iroqlar</div>
          </div>
        </div>
      </main>
    </div>
  );
}
