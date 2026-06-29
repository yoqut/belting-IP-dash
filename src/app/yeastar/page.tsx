"use client";

import { useCallback, useEffect, useState } from "react";
import StatCards from "@/components/StatCards";
import CallTable from "@/components/CallTable";
import DateRangePicker, { DateRange } from "@/components/DateRangePicker";
import FilterPanel, { FilterValues, EMPTY_FILTERS } from "@/components/FilterPanel";
import Sidebar from "@/components/Sidebar";
import { CDRRecord, CDRStats, CallFilter } from "@/types/cdr";

const EMPTY_STATS: CDRStats = {
  all: 0, inbound: 0, answered: 0, missed: 0, no_answer: 0,
  outbound: 0, outbound_success: 0, outbound_failed: 0, internal: 0,
};

function todayRange(): DateRange {
  const s = new Date(); s.setHours(0, 0, 0, 0);
  const e = new Date(); e.setHours(23, 59, 59, 0);
  return { start: s, end: e };
}

function formatPBX(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function computeStats(records: CDRRecord[], calledBack: Set<string>): CDRStats {
  const s: CDRStats = { all: records.length, inbound: 0, answered: 0, missed: 0, no_answer: 0, outbound: 0, outbound_success: 0, outbound_failed: 0, internal: 0 };
  const missedCallers = new Set<string>();
  for (const r of records) {
    if (r.call_type === "Inbound") {
      s.inbound++;
      if (r.disposition === "ANSWERED") {
        s.answered++;
      } else {
        s.missed++;
        if (r.call_from_number) missedCallers.add(r.call_from_number);
      }
    } else if (r.call_type === "Outbound") {
      s.outbound++;
      if (r.disposition === "ANSWERED") s.outbound_success++; else s.outbound_failed++;
    } else if (r.call_type === "Internal") {
      s.internal++;
    }
  }
  // Bog'lanilmagan = o'tkazib yuborilgan, lekin qaytib qo'ng'iroq qilinmagan noyob raqamlar
  for (const num of missedCallers) {
    if (!calledBack.has(num)) s.no_answer++;
  }
  return s;
}

function applyFilters(records: CDRRecord[], callFilter: CallFilter, calledBack: Set<string>, f: FilterValues): CDRRecord[] {
  let r = records;

  // Call type filter
  switch (callFilter) {
    case "inbound": r = r.filter(x => x.call_type === "Inbound"); break;
    case "answered": r = r.filter(x => x.call_type === "Inbound" && x.disposition === "ANSWERED"); break;
    case "missed": r = r.filter(x => x.call_type === "Inbound" && x.disposition !== "ANSWERED"); break;
    case "no_answer": r = r.filter(x => x.call_type === "Inbound" && x.disposition !== "ANSWERED" && !calledBack.has(x.call_from_number)); break;
    case "outbound": r = r.filter(x => x.call_type === "Outbound"); break;
    case "outbound_success": r = r.filter(x => x.call_type === "Outbound" && x.disposition === "ANSWERED"); break;
    case "outbound_failed": r = r.filter(x => x.call_type === "Outbound" && x.disposition !== "ANSWERED"); break;
    case "internal": r = r.filter(x => x.call_type === "Internal"); break;
  }

  // Panel filters
  if (f.excludeInternal) r = r.filter(x => x.call_type !== "Internal");
  if (f.line) r = r.filter(x =>
    normalizeLineNumber(x.src_trunk) === f.line ||
    normalizeLineNumber(x.dst_trunk) === f.line
  );
  if (f.from) r = r.filter(x => x.call_from_number === f.from);
  if (f.to) r = r.filter(x => x.call_to_number === f.to);
  if (f.type) r = r.filter(x => x.call_type === f.type);
  if (f.disposition) r = r.filter(x => x.disposition === f.disposition);

  if (f.deduplicateExternal) {
    const seen = new Set<string>();
    r = r.filter(x => {
      const external =
        x.call_type === "Inbound" ? x.call_from_number :
        x.call_type === "Outbound" ? x.call_to_number : null;
      if (!external) return true;
      const date = x.time?.slice(0, 10) ?? "";
      const key = `${external}|${date}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  return r;
}

const TRUNK_LINES = ["781223344", "781507500", "787771188", "787773322"];

function normalizeLineNumber(n: string): string {
  if (!n) return "";
  if (n.startsWith("998") && n.length === 12) return n.slice(3);
  return n;
}

function isEmployee(number: string, name: string): boolean {
  if (!number || !name || name === number) return false;
  if (name.toLowerCase().startsWith("automatic")) return false;
  return number.length <= 5;
}

function getUniqueEmployees(records: CDRRecord[]): { number: string; name: string }[] {
  const map = new Map<string, string>();
  for (const r of records) {
    if (r.call_to_number && isEmployee(r.call_to_number, r.call_to_name))
      map.set(r.call_to_number, r.call_to_name);
    if (r.call_from_number && isEmployee(r.call_from_number, r.call_from_name))
      map.set(r.call_from_number, r.call_from_name);
  }
  return Array.from(map.entries())
    .map(([number, name]) => ({ number, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>(todayRange);
  const [callFilter, setCallFilter] = useState<CallFilter>("all");
  const [filterValues, setFilterValues] = useState<FilterValues>(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<FilterValues>(EMPTY_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [allRecords, setAllRecords] = useState<CDRRecord[]>([]);
  const [calledBackNumbers, setCalledBackNumbers] = useState<Set<string>>(new Set());
  const [stats, setStats] = useState<CDRStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState("");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setLoadingMore(false);
    setError(null);
    const base = new URLSearchParams({
      start: formatPBX(dateRange.start),
      end: formatPBX(dateRange.end),
    });
    try {
      // 1-bosqich: birinchi sahifani tez ko'rsatish
      const quickRes = await fetch(`/api/cdr?${base}&quick=1`);
      const quickData = await quickRes.json();
      if (!quickRes.ok) throw new Error(quickData.error || "Xato");
      const qRecords = quickData.records ?? [];
      const qCalledBack = new Set<string>(quickData.called_back_numbers ?? []);
      setAllRecords(qRecords);
      setCalledBackNumbers(qCalledBack);
      setStats(computeStats(qRecords, qCalledBack));
      setLastUpdated(new Date().toLocaleTimeString("uz-UZ"));
      setLoading(false);

      // 2-bosqich: qolgan sahifalarni fonda yuklash (90s timeout — Cloudflare limit)
      if (quickData.has_more) {
        setLoadingMore(true);
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 90_000);
        const fullRes = await fetch(`/api/cdr?${base}`, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
        const fullData = await fullRes.json();
        if (fullRes.ok) {
          const fRecords = fullData.records ?? [];
          const fCalledBack = new Set<string>(fullData.called_back_numbers ?? []);
          setAllRecords(fRecords);
          setCalledBackNumbers(fCalledBack);
          setStats(computeStats(fRecords, fCalledBack));
          setLastUpdated(new Date().toLocaleTimeString("uz-UZ"));
        }
      }
    } catch (e: unknown) {
      // AbortError — to'liq fetch timeout bo'ldi, quick data allaqachon ko'rsatilgan
      if (e instanceof Error && e.name === "AbortError") {
        // ma'lumotlar ko'rinmoqda, xato ko'rsatmaymiz
      } else {
        setError(e instanceof Error ? e.message : "Noma'lum xato");
      }
      setLoading(false);
    } finally {
      setLoadingMore(false);
    }
  }, [dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Panel filterlari qo'llanilgan (callFilter yo'q) — stat kartochkalar shu asosida hisoblanadi
  const panelFiltered = applyFilters(allRecords, "all", calledBackNumbers, appliedFilters);
  const filteredStats = computeStats(panelFiltered, calledBackNumbers);

  // callFilter + saralash — jadval shu ro'yxatni ko'rsatadi
  const visibleRecords = applyFilters(allRecords, callFilter, calledBackNumbers, appliedFilters)
    .slice()
    .sort((a, b) => (b.time ?? "").localeCompare(a.time ?? ""));
  const hasActiveFilters = (Object.entries(appliedFilters) as [string, unknown][]).some(([, v]) => v !== "" && v !== false);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center gap-4 sticky top-0 z-30">
        <button onClick={() => setSidebarOpen(true)} className="text-gray-500 hover:text-gray-700 transition-colors p-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>

        <h1 className="text-lg font-semibold text-gray-800 flex-1">Qo&apos;ng&apos;iroqlar tarixi</h1>

        <div className="flex items-center gap-2">
          {loadingMore && (
            <span className="flex items-center gap-1.5 text-xs text-blue-500">
              <svg className="w-3.5 h-3.5 animate-spin" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9" strokeLinecap="round" />
              </svg>
              Yuklanmoqda...
            </span>
          )}
          {lastUpdated && !loadingMore && (
            <span className="text-xs text-gray-400 hidden sm:block">
              {lastUpdated}
            </span>
          )}

          <DateRangePicker value={dateRange} onChange={(r) => { setDateRange(r); setCallFilter("all"); }} />

          {/* XLS export placeholder */}
          <button title="Excel yuklab olish" className="p-2 border border-gray-300 rounded-md text-gray-500 hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Column settings placeholder */}
          <button title="Ustunlarni sozlash" className="p-2 border border-gray-300 rounded-md text-gray-500 hover:bg-gray-50 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2v-4M9 21H5a2 2 0 01-2-2v-4m0 0h18" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Refresh */}
          <button onClick={fetchData} disabled={loading} title="Yangilash" className="p-2 border border-gray-300 rounded-md text-gray-500 hover:bg-gray-50 disabled:opacity-40 transition-colors">
            <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Barcha filtrlar */}
          <button
            onClick={() => setFilterOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium border transition-colors
              ${hasActiveFilters ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M3 4h18M7 8h10M11 12h2M9 16h6" strokeLinecap="round" />
            </svg>
            Barcha filtrlar
            {hasActiveFilters && (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="8" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

          {error && (
            <div className="bg-red-50 border-b border-red-100 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
              {error}
            </div>
          )}

          <StatCards
            stats={hasActiveFilters ? filteredStats : stats}
            active={callFilter}
            onChange={(f) => { setCallFilter(f); }}
          />

          <CallTable records={visibleRecords} loading={loading} />
        </div>
      </main>

      {/* Filter panel */}
      <FilterPanel
        open={filterOpen}
        values={filterValues}
        employees={getUniqueEmployees(allRecords)}
        lines={TRUNK_LINES}
        onChange={setFilterValues}
        onApply={() => { setAppliedFilters(filterValues); setFilterOpen(false); }}
        onClear={() => { setFilterValues(EMPTY_FILTERS); setAppliedFilters(EMPTY_FILTERS); }}
        onClose={() => setFilterOpen(false)}
      />
    </div>
  );
}
