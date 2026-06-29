"use client";

import { useCallback, useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import { MZCall, MZStats } from "@/types/moizvonki";
import { MZEmployee } from "@/lib/moizvonki";

const EMPTY_STATS: MZStats = { total: 0, inbound: 0, outbound: 0, answered: 0, missed: 0 };

function formatDuration(sec: number): string {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatTime(unix: number): string {
  if (!unix) return "—";
  return new Date(unix * 1000).toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 py-4">
      <div className={`text-2xl font-bold ${color ?? "text-gray-800"}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

export default function MoiZvonkiPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [calls, setCalls] = useState<MZCall[]>([]);
  const [stats, setStats] = useState<MZStats>(EMPTY_STATS);
  const [employeeMap, setEmployeeMap] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/moizvonki");
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Xato");
      setCalls(data.calls ?? []);
      setStats(data.stats ?? EMPTY_STATS);
      const map = new Map<string, string>();
      for (const e of (data.employees ?? []) as MZEmployee[]) map.set(e.email, e.display_name);
      setEmployeeMap(map);
      setLastUpdated(new Date().toLocaleTimeString("uz-UZ"));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Noma'lum xato");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const sorted = [...calls].sort((a, b) => (b.start_time ?? 0) - (a.start_time ?? 0));

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 sticky top-0 z-30">
        <button onClick={() => setSidebarOpen(true)} className="text-gray-500 hover:text-gray-700 p-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-gray-800 flex-1">MoiZvonki — Qo&apos;ng&apos;iroqlar</h1>
        <div className="flex items-center gap-2">
          {lastUpdated && <span className="text-xs text-gray-400 hidden sm:block">{lastUpdated}</span>}
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 border border-gray-300 rounded-md text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <StatCard label="Jami" value={stats.total} />
          <StatCard label="Kiruvchi" value={stats.inbound} />
          <StatCard label="Chiquvchi" value={stats.outbound} />
          <StatCard label="Javob berilgan" value={stats.answered} color="text-green-600" />
          <StatCard label="Javobsiz" value={stats.missed} color={stats.missed > 0 ? "text-red-600" : undefined} />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {error && (
            <div className="bg-red-50 border-b border-red-100 px-4 py-3 text-sm text-red-700">{error}</div>
          )}

          {loading && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">Yuklanmoqda...</div>
          )}

          {!loading && !error && sorted.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-400">Bugun qo&apos;ng&apos;iroq yo&apos;q</div>
          )}

          {!loading && sorted.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-4 py-3 text-left">Vaqt</th>
                    <th className="px-4 py-3 text-left">Xodim</th>
                    <th className="px-4 py-3 text-left">Yo&apos;nalish</th>
                    <th className="px-4 py-3 text-left">Mijoz raqami</th>
                    <th className="px-4 py-3 text-left">Mijoz ismi</th>
                    <th className="px-4 py-3 text-left">Holat</th>
                    <th className="px-4 py-3 text-left">Davomiylik</th>
                    <th className="px-4 py-3 text-left">Yozuv</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sorted.map((c, i) => (
                    <tr key={c.db_call_id ?? i} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">{formatTime(c.start_time)}</td>
                      <td className="px-4 py-2.5 text-gray-800 font-medium">
                        {c.user_account ? (employeeMap.get(c.user_account) ?? c.user_account) : "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          c.direction === 0 ? "bg-blue-100 text-blue-700" : "bg-purple-100 text-purple-700"
                        }`}>
                          {c.direction === 0 ? "Kiruvchi" : "Chiquvchi"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-800 font-mono">{c.client_number}</td>
                      <td className="px-4 py-2.5 text-gray-600">{c.client_name ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          c.answered === 1 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                        }`}>
                          {c.answered === 1 ? "Javob berilgan" : "Javobsiz"}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{formatDuration(c.duration)}</td>
                      <td className="px-4 py-2.5">
                        {c.recording ? (
                          <a href={c.recording} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-xs">
                            Tinglash
                          </a>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
