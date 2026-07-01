"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import DateRangePicker, { DateRange } from "@/components/DateRangePicker";
import { EmployeeStat } from "@/app/api/employees/route";
import EmployeeDetailPanel from "@/components/EmployeeDetailPanel";

function todayRange(): DateRange {
  const s = new Date(); s.setHours(0, 0, 0, 0);
  const e = new Date(); e.setHours(23, 59, 59, 0);
  return { start: s, end: e };
}

function formatPBX(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function fmtDur(sec: number): string {
  if (!sec) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}s ${m}d ${s}s`;
  if (m > 0) return `${m}d ${s}s`;
  return `${s}s`;
}

function pct(a: number, b: number): string {
  if (!b) return "";
  return `${Math.round((a / b) * 100)}%`;
}

type SortKey = "name" | "total" | "outbound" | "outbound_success" | "outbound_failed" | "inbound" | "inbound_answered" | "inbound_missed" | "total_talk_sec";
type SortDir = "asc" | "desc";

function SummaryCard({
  label,
  total,
  success,
  successLabel,
  fail,
  failLabel,
  colorTotal,
}: {
  label: string;
  total: number;
  success: number;
  successLabel: string;
  fail: number;
  failLabel: string;
  colorTotal: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-5 flex flex-col gap-3">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{label}</span>
      <span className={`text-4xl font-bold ${colorTotal}`}>{total}</span>
      <div className="flex gap-4">
        <div className="flex flex-col">
          <span className="text-xs text-gray-400">{successLabel}</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-green-600">{success}</span>
            <span className="text-xs text-green-500">{pct(success, total)}</span>
          </div>
        </div>
        <div className="w-px bg-gray-100" />
        <div className="flex flex-col">
          <span className="text-xs text-gray-400">{failLabel}</span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-xl font-bold text-red-500">{fail}</span>
            <span className="text-xs text-red-400">{pct(fail, total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TotalCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-6 py-5 flex flex-col gap-3">
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{label}</span>
      <span className="text-4xl font-bold text-gray-800">{value}</span>
    </div>
  );
}

export default function EmployeesPage() {
  const [dateRange, setDateRange] = useState<DateRange>(todayRange);
  const [employees, setEmployees] = useState<EmployeeStat[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("total");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [search, setSearch] = useState("");
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);

  const fetchData = useCallback(async (refresh = false) => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      start: formatPBX(dateRange.start),
      end: formatPBX(dateRange.end),
    });
    if (refresh) params.set("refresh", "1");
    try {
      const res = await fetch(`/api/employees?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Xato");
      setEmployees(data.employees ?? []);
      setLastUpdated(new Date().toLocaleTimeString("uz-UZ"));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Noma'lum xato");
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => { fetchData(false); }, [fetchData]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  const filtered = search
    ? employees.filter(e =>
        e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.number.includes(search)
      )
    : employees;

  const sorted = [...filtered].sort((a, b) => {
    if (sortKey === "name") {
      const c = a.name.localeCompare(b.name);
      return sortDir === "asc" ? c : -c;
    }
    const av = (a[sortKey] as number) ?? 0;
    const bv = (b[sortKey] as number) ?? 0;
    return sortDir === "asc" ? av - bv : bv - av;
  });

  const T = filtered.reduce(
    (acc, e) => ({
      total: acc.total + e.total,
      inbound: acc.inbound + e.inbound,
      inbound_answered: acc.inbound_answered + e.inbound_answered,
      inbound_missed: acc.inbound_missed + e.inbound_missed,
      outbound: acc.outbound + e.outbound,
      outbound_success: acc.outbound_success + e.outbound_success,
      outbound_failed: acc.outbound_failed + e.outbound_failed,
      total_talk_sec: acc.total_talk_sec + e.total_talk_sec,
    }),
    { total: 0, inbound: 0, inbound_answered: 0, inbound_missed: 0, outbound: 0, outbound_success: 0, outbound_failed: 0, total_talk_sec: 0 }
  );

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <span className="text-gray-300 ml-0.5">↕</span>;
    return <span className="text-blue-500 ml-0.5">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  function Th({ label, k, className = "" }: { label: string; k: SortKey; className?: string }) {
    return (
      <th
        onClick={() => toggleSort(k)}
        className={`px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide cursor-pointer select-none hover:text-gray-800 whitespace-nowrap ${className}`}
      >
        {label}<SortIcon k={k} />
      </th>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <EmployeeDetailPanel
        number={selectedNumber}
        start={formatPBX(dateRange.start)}
        end={formatPBX(dateRange.end)}
        onClose={() => setSelectedNumber(null)}
      />

      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="flex items-center px-4 gap-1 h-11 border-b border-gray-100 text-xs">
          <Link href="/" className="text-gray-400 hover:text-gray-600 font-medium uppercase tracking-wide">Biznes-analitika</Link>
          <svg className="w-3 h-3 text-gray-300 mx-1" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" /></svg>
          {[
            { href: "/", label: "Qo'ng'iroqlar bo'yicha" },
            { href: "/employees", label: "Xodimlar bo'yicha" },
          ].map(tab => {
            const active = tab.href === "/employees";
            return (
              <Link key={tab.href} href={tab.href}
                className={`px-4 h-11 flex items-center font-semibold uppercase tracking-wide border-b-2 transition-colors ${
                  active ? "border-blue-600 text-blue-600" : "border-transparent text-gray-400 hover:text-gray-700"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
          <div className="flex-1" />
          {lastUpdated && !loading && (
            <span className="text-gray-400 mr-3">{lastUpdated}</span>
          )}
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <button
            onClick={() => fetchData(true)}
            disabled={loading}
            className="ml-2 p-1.5 border border-gray-200 rounded text-gray-400 hover:bg-gray-50 disabled:opacity-40 transition-colors"
          >
            <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* Umumiy statistika */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <TotalCard label="Jami qo'ng'iroqlar" value={T.total} />
          <SummaryCard
            label="Kiruvchi"
            total={T.inbound}
            success={T.inbound_answered}
            successLabel="Qabul qilindi"
            fail={T.inbound_missed}
            failLabel="O'tkazib yuborildi"
            colorTotal="text-gray-800"
          />
          <SummaryCard
            label="Chiquvchi"
            total={T.outbound}
            success={T.outbound_success}
            successLabel="Muvaffaqiyatli"
            fail={T.outbound_failed}
            failLabel="Muvaffaqiyatsiz"
            colorTotal="text-gray-800"
          />
        </div>

        {/* Xodimlar jadvali */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-700">{filtered.length} xodim</span>
            <div className="relative">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                placeholder="Xodim qidirish..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Yuklanmoqda...</div>
          ) : sorted.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">Ma&apos;lumot topilmadi</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-3 w-8 text-xs font-semibold text-gray-400">#</th>
                    <Th label="Xodim" k="name" className="text-left" />
                    <Th label="Jami" k="total" className="text-right" />

                    {/* Chiquvchi */}
                    <th className="px-3 py-3 text-xs font-semibold text-blue-500 text-center border-l border-gray-100 whitespace-nowrap">
                      ↗ Chiquvchi
                    </th>
                    <th
                      onClick={() => toggleSort("outbound_success")}
                      className="px-3 py-3 text-xs font-semibold text-green-600 text-right cursor-pointer hover:text-green-800 whitespace-nowrap"
                    >
                      ✓ Muvaffaq<SortIcon k="outbound_success" />
                    </th>
                    <th
                      onClick={() => toggleSort("outbound_failed")}
                      className="px-3 py-3 text-xs font-semibold text-red-400 text-right cursor-pointer hover:text-red-600 whitespace-nowrap"
                    >
                      ✗ Muvaffaqsiz<SortIcon k="outbound_failed" />
                    </th>

                    {/* Kiruvchi */}
                    <th className="px-3 py-3 text-xs font-semibold text-emerald-500 text-center border-l border-gray-100 whitespace-nowrap">
                      ↙ Kiruvchi
                    </th>
                    <th
                      onClick={() => toggleSort("inbound_answered")}
                      className="px-3 py-3 text-xs font-semibold text-green-600 text-right cursor-pointer hover:text-green-800 whitespace-nowrap"
                    >
                      ✓ Qabul<SortIcon k="inbound_answered" />
                    </th>
                    <th
                      onClick={() => toggleSort("inbound_missed")}
                      className="px-3 py-3 text-xs font-semibold text-red-400 text-right cursor-pointer hover:text-red-600 whitespace-nowrap"
                    >
                      ✗ O&apos;tkazib<SortIcon k="inbound_missed" />
                    </th>

                    {/* Vaqt */}
                    <Th label="Suhbat vaqti" k="total_talk_sec" className="text-right border-l border-gray-100" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {sorted.map((emp, i) => (
                    <tr
                      key={emp.number}
                      onClick={() => setSelectedNumber(emp.number)}
                      className="hover:bg-blue-50/50 transition-colors cursor-pointer"
                    >
                      <td className="px-3 py-3 text-gray-400 text-xs">{i + 1}</td>
                      <td className="px-3 py-3">
                        <div className="font-medium text-gray-800">{emp.name}</div>
                        <div className="text-xs text-gray-400 font-mono">{emp.number}</div>
                      </td>
                      <td className="px-3 py-3 text-right font-semibold text-gray-700">{emp.total || "—"}</td>

                      {/* Chiquvchi */}
                      <td className="px-3 py-3 text-right text-gray-600 border-l border-gray-100">{emp.outbound || "—"}</td>
                      <td className="px-3 py-3 text-right text-green-600 font-medium">{emp.outbound_success || "—"}</td>
                      <td className="px-3 py-3 text-right">
                        <span className={emp.outbound_failed > 0 ? "text-red-500" : "text-gray-300"}>
                          {emp.outbound_failed || "—"}
                        </span>
                      </td>

                      {/* Kiruvchi */}
                      <td className="px-3 py-3 text-right text-gray-600 border-l border-gray-100">{emp.inbound || "—"}</td>
                      <td className="px-3 py-3 text-right text-green-600 font-medium">{emp.inbound_answered || "—"}</td>
                      <td className="px-3 py-3 text-right">
                        <span className={emp.inbound_missed > 0 ? "text-red-500" : "text-gray-300"}>
                          {emp.inbound_missed || "—"}
                        </span>
                      </td>

                      {/* Vaqt */}
                      <td className="px-3 py-3 text-right font-mono text-xs text-gray-600 border-l border-gray-100 whitespace-nowrap">
                        {fmtDur(emp.total_talk_sec)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
                    <td className="px-3 py-3" colSpan={2}>
                      <span className="text-xs text-gray-600">Jami ({filtered.length} xodim)</span>
                    </td>
                    <td className="px-3 py-3 text-right text-gray-800">{T.total}</td>

                    <td className="px-3 py-3 text-right text-gray-700 border-l border-gray-100">{T.outbound}</td>
                    <td className="px-3 py-3 text-right text-green-600">{T.outbound_success}</td>
                    <td className="px-3 py-3 text-right text-red-500">{T.outbound_failed}</td>

                    <td className="px-3 py-3 text-right text-gray-700 border-l border-gray-100">{T.inbound}</td>
                    <td className="px-3 py-3 text-right text-green-600">{T.inbound_answered}</td>
                    <td className="px-3 py-3 text-right text-red-500">{T.inbound_missed}</td>

                    <td className="px-3 py-3 text-right font-mono text-xs text-gray-600 border-l border-gray-100 whitespace-nowrap">
                      {fmtDur(T.total_talk_sec)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
