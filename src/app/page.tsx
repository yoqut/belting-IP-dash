"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Sidebar from "@/components/Sidebar";
import UnifiedCallTable from "@/components/UnifiedCallTable";
import DateRangePicker, { DateRange } from "@/components/DateRangePicker";
import { UnifiedCall, UnifiedStats } from "@/types/unified";

const TRUNK_LINES = ["781223344", "781507500", "787771188", "787773322"];
const PAGE_SIZES = [10, 20, 50, 100];


function todayRange(): DateRange {
  const s = new Date(); s.setHours(0, 0, 0, 0);
  const e = new Date(); e.setHours(23, 59, 59, 0);
  return { start: s, end: e };
}
function formatPBX(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

type FilterKey = "inbound" | "answered" | "missed" | "outbound" | "outbound_success" | "outbound_failed" | "internal";
type ActiveFilter = "all" | FilterKey;

interface Filters {
  search: string;
  employee: string;
  channel: string;
  status: string;
  trunk: string;  // "" | one of TRUNK_LINES
}
const EMPTY_FILTERS: Filters = { search: "", employee: "", channel: "", status: "", trunk: "" };

function matchesKey(c: UnifiedCall, key: FilterKey): boolean {
  switch (key) {
    case "inbound": return c.direction === "inbound";
    case "answered": return c.direction === "inbound" && c.answered;
    case "missed": return c.direction === "inbound" && !c.answered;
    case "outbound": return c.direction === "outbound";
    case "outbound_success": return c.direction === "outbound" && c.answered;
    case "outbound_failed": return c.direction === "outbound" && !c.answered;
    case "internal": return c.direction === "internal";
  }
}


function applyFilters(calls: UnifiedCall[], f: Filters): UnifiedCall[] {
  return calls.filter(c => {
    if (f.employee && c.employeeName !== f.employee) return false;
    if (f.channel && c.channel !== f.channel) return false;
    if (f.trunk && c.trunkLine !== f.trunk) return false;
    if (f.status === "answered" && !c.answered) return false;
    if (f.status === "missed" && c.answered) return false;
    if (f.search.trim()) {
      const q = f.search.toLowerCase();
      if (!c.employeeName.toLowerCase().includes(q) && !c.clientNumber.includes(q) && !c.clientName.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}

function computeStats(calls: UnifiedCall[]): UnifiedStats {
  const s: UnifiedStats = { all: 0, inbound: 0, answered: 0, missed: 0, outbound: 0, outbound_success: 0, outbound_failed: 0, internal: 0 };
  for (const c of calls) {
    s.all++;
    if (c.direction === "inbound") { s.inbound++; c.answered ? s.answered++ : s.missed++; }
    else if (c.direction === "outbound") { s.outbound++; c.answered ? s.outbound_success++ : s.outbound_failed++; }
    else s.internal++;
  }
  return s;
}

interface SubStatProps { label: string; value: number; color: string; active: boolean; onClick: () => void; }
function SubStat({ label, value, color, active, onClick }: SubStatProps) {
  return (
    <button onClick={e => { e.stopPropagation(); onClick(); }} className={`flex-1 flex flex-col items-start px-3 py-2 rounded-lg border transition-all text-left ${
      active
        ? "bg-blue-600 border-blue-600 shadow-sm"
        : "bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 hover:border-blue-200 hover:shadow-sm"
    }`}>
      <span className={`text-xl font-bold ${active ? "text-white" : color}`}>{value}</span>
      <span className={`text-[11px] mt-0.5 leading-tight ${active ? "text-blue-100" : "text-gray-500 dark:text-slate-400"}`}>{label}</span>
    </button>
  );
}

interface GroupCardProps {
  label: string; value: number; icon: React.ReactNode; accent: string; activeAccent: string;
  active: boolean; onSelect: () => void;
  children?: React.ReactNode;
}
function GroupCard({ label, value, icon, accent, activeAccent, active, onSelect, children }: GroupCardProps) {
  return (
    <div className={`rounded-xl border transition-all overflow-hidden ${
      active ? "border-blue-400 dark:border-blue-500 shadow-md" : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700"
    }`}
      style={active ? { background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)" } : undefined}>
      <button onClick={onSelect} className="w-full flex items-center gap-3 px-4 py-3 hover:opacity-90 transition-opacity text-left">
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${active ? activeAccent : accent}`}>{icon}</span>
        <div className="flex-1 min-w-0">
          <span className={`text-[11px] font-semibold uppercase tracking-wide block ${active ? "text-blue-200" : "text-gray-500 dark:text-slate-400"}`}>{label}</span>
          <span className={`text-2xl font-bold leading-none ${active ? "text-white" : "text-gray-800 dark:text-slate-100"}`}>{value}</span>
        </div>
      </button>
      {children && (
        <div className="flex gap-2 px-3 pb-3">
          {children}
        </div>
      )}
    </div>
  );
}

function RadioOpt({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg border text-sm text-left transition-colors ${active ? "bg-blue-600 border-blue-600 text-white" : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:border-blue-300"}`}>
      <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${active ? "border-white" : "border-gray-300 dark:border-slate-500"}`}>
        {active && <span className="w-2 h-2 rounded-full bg-white" />}
      </span>
      {label}
    </button>
  );
}

export default function DashboardPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>(todayRange);
  const [allCalls, setAllCalls] = useState<UnifiedCall[]>([]);
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pbxError, setPbxError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Cache dan tez yuklaymiz
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPbxError(null);
    setActiveFilter("all");
    setFilters(EMPTY_FILTERS);
    setPage(1);

    const params = new URLSearchParams({ start: formatPBX(dateRange.start), end: formatPBX(dateRange.end) });
    try {
      const res = await fetch(`/api/calls?${params}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Xato");
      if (data.pbxError) setPbxError(data.pbxError);
      setAllCalls(data.calls ?? []);
      setLastUpdated(new Date().toLocaleTimeString("uz-UZ"));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Noma'lum xato");
    } finally { setLoading(false); }
  }, [dateRange]);

  // Faqat bugungi ma'lumotlarni API dan yangilaydi
  const refreshToday = useCallback(async () => {
    setRefreshing(true);
    setPbxError(null);
    const params = new URLSearchParams({ start: formatPBX(dateRange.start), end: formatPBX(dateRange.end), refresh: "1" });
    try {
      const res = await fetch(`/api/calls?${params}`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Xato");
      if (data.pbxError) setPbxError(data.pbxError);
      setAllCalls(data.calls ?? []);
      setLastUpdated(new Date().toLocaleTimeString("uz-UZ"));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Noma'lum xato");
    } finally { setRefreshing(false); }
  }, [dateRange]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => { setPage(1); }, [filters, activeFilter, pageSize]);

  const employeeList = useMemo(() => [...new Set(allCalls.map(c => c.employeeName).filter(n => n && n !== "—"))].sort(), [allCalls]);
  const hasFilters = !!(filters.employee || filters.channel || filters.status || filters.search || filters.trunk);
  const activeFilterCount = [filters.employee, filters.channel, filters.status, filters.trunk].filter(Boolean).length;

  // 1. Drawer filterlari
  const filteredCalls = useMemo(() => applyFilters(allCalls, filters), [allCalls, filters]);

  // 2. Umumiy statistika (stat kartochkalar uchun — har doim to'liq)
  const filteredStats = useMemo(() => computeStats(filteredCalls), [filteredCalls]);

  // 3. Aktiv filtr bo'yicha qo'ng'iroqlar
  const visibleCalls = useMemo(() => {
    if (activeFilter === "all") return filteredCalls;
    return filteredCalls.filter(c => matchesKey(c, activeFilter));
  }, [filteredCalls, activeFilter]);

  // 4. Pagination
  const totalPages = Math.ceil(visibleCalls.length / pageSize);
  const paginated = useMemo(() => visibleCalls.slice((page - 1) * pageSize, page * pageSize), [visibleCalls, page, pageSize]);

  const selectFilter = (key: ActiveFilter) => {
    setActiveFilter(prev => prev === key ? "all" : key);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-slate-950 flex flex-col">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3 sticky top-0 z-30">
        <button onClick={() => setSidebarOpen(true)} className="text-gray-500 dark:text-slate-400 hover:text-gray-700 dark:hover:text-slate-200 p-1">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M4 6h16M4 12h16M4 18h16" strokeLinecap="round" />
          </svg>
        </button>
        <h1 className="text-base font-semibold text-gray-800 dark:text-slate-100 flex-1">Qo&apos;ng&apos;iroqlar</h1>
        <div className="flex items-center gap-2">
          {lastUpdated && <span className="text-xs text-gray-400 hidden sm:block">{lastUpdated}</span>}
          <DateRangePicker value={dateRange} onChange={r => setDateRange(r)} />
          <button onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-md border transition-colors ${showFilters || hasFilters ? "bg-blue-600 border-blue-600 text-white" : "border-gray-300 dark:border-slate-600 text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800"}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M3 4h18M7 8h10M11 12h2M9 16h6" strokeLinecap="round" />
            </svg>
            Filter{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
          </button>
          <button onClick={refreshToday} disabled={refreshing || loading} title="Bugungi ma'lumotlarni yangilash" className="p-2 border border-gray-300 dark:border-slate-600 rounded-md text-gray-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors">
            <svg className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </header>

      <main className="flex-1 p-4 space-y-3">
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {/* Barchasi */}
          <GroupCard
            label="Barchasi"
            value={filteredCalls.length}
            accent="bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-300"
            activeAccent="bg-white/20 text-white"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            active={activeFilter === "all"}
            onSelect={() => setActiveFilter("all")}
          />

          {/* Chiquvchi */}
          <GroupCard
            label="Chiquvchi"
            value={filteredStats.outbound}
            accent="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
            activeAccent="bg-white/20 text-white"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M7 17L17 7M17 7H7M17 7v10" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            active={activeFilter === "outbound"}
            onSelect={() => selectFilter("outbound")}
          >
            <SubStat label="Muvaffaqiyatli" value={filteredStats.outbound_success} color="text-green-600" active={activeFilter === "outbound_success"} onClick={() => selectFilter("outbound_success")} />
            <SubStat label="Muvaffaqiyatsiz" value={filteredStats.outbound_failed} color={filteredStats.outbound_failed > 0 ? "text-amber-500" : "text-gray-400"} active={activeFilter === "outbound_failed"} onClick={() => selectFilter("outbound_failed")} />
          </GroupCard>

          {/* Kiruvchi */}
          <GroupCard
            label="Kiruvchi"
            value={filteredStats.inbound}
            accent="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400"
            activeAccent="bg-white/20 text-white"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M7 7v10h10" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            active={activeFilter === "inbound"}
            onSelect={() => selectFilter("inbound")}
          >
            <SubStat label="Javob berilgan" value={filteredStats.answered} color="text-green-600" active={activeFilter === "answered"} onClick={() => selectFilter("answered")} />
            <SubStat label="O'tkazib berilgan" value={filteredStats.missed} color={filteredStats.missed > 0 ? "text-red-500" : "text-gray-400"} active={activeFilter === "missed"} onClick={() => selectFilter("missed")} />
          </GroupCard>

          {/* Ichki */}
          <GroupCard
            label="Ichki"
            value={filteredStats.internal}
            accent="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
            activeAccent="bg-white/20 text-white"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>}
            active={activeFilter === "internal"}
            onSelect={() => selectFilter("internal")}
          />
        </div>

        {/* PBX xato xabari */}
        {pbxError && (
          <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-sm text-amber-800 dark:text-amber-300">
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" />
            </svg>
            <div className="flex-1 min-w-0">
              <span className="font-semibold">PBX qo&apos;ng&apos;iroqlari yuklanmadi</span>
              <span className="text-amber-600 dark:text-amber-400 ml-2 font-mono text-xs break-all">{pbxError}</span>
            </div>
            <button onClick={() => setPbxError(null)} className="shrink-0 text-amber-400 hover:text-amber-600 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" /></svg>
            </button>
          </div>
        )}

        {/* Filter drawer backdrop */}
        {showFilters && <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setShowFilters(false)} />}

        {/* Filter drawer */}
        <div className={`fixed top-0 right-0 h-full w-80 bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col transition-transform duration-300 ${showFilters ? "translate-x-0" : "translate-x-full"}`}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
            <h2 className="text-sm font-semibold text-gray-800 dark:text-slate-100">Filtrlarni qo&apos;llash</h2>
            <button onClick={() => setShowFilters(false)} className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" /></svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6 bg-white dark:bg-slate-900">

            {/* Xodim */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Xodim</label>
              <div className="relative">
                <select value={filters.employee} onChange={e => setFilters(f => ({ ...f, employee: e.target.value }))}
                  className="w-full pl-3 pr-8 py-2.5 text-sm border border-gray-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                  <option value="">Barchasi</option>
                  {employeeList.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeLinecap="round" /></svg>
              </div>
            </div>

            {/* Kanal */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Kanal</label>
              <div className="flex flex-col gap-1.5">
                {[{ value: "", label: "Barchasi" }, { value: "pbx", label: "Ofis tizimi (PBX)" }, { value: "sim", label: "Mobil tizim (SIM)" }].map(opt => (
                  <RadioOpt key={opt.value} label={opt.label} active={filters.channel === opt.value} onClick={() => setFilters(f => ({ ...f, channel: opt.value }))} />
                ))}
              </div>
            </div>

            {/* Trunk liniyalar */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Liniya (Trunk)</label>
              <div className="flex flex-col gap-1.5">
                <RadioOpt label="Barchasi" active={filters.trunk === ""} onClick={() => setFilters(f => ({ ...f, trunk: "" }))} />
                {TRUNK_LINES.map(line => (
                  <RadioOpt key={line} label={line} active={filters.trunk === line} onClick={() => setFilters(f => ({ ...f, trunk: f.trunk === line ? "" : line }))} />
                ))}
              </div>
            </div>

            {/* Holat */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">Holat</label>
              <div className="flex flex-col gap-1.5">
                {[{ value: "", label: "Barchasi" }, { value: "answered", label: "Javob berilgan" }, { value: "missed", label: "Javobsiz" }].map(opt => (
                  <RadioOpt key={opt.value} label={opt.label} active={filters.status === opt.value} onClick={() => setFilters(f => ({ ...f, status: opt.value }))} />
                ))}
              </div>
            </div>
          </div>

          <div className="px-5 py-4 border-t border-gray-100 dark:border-slate-700 bg-white dark:bg-slate-900 flex gap-2">
            <button onClick={() => { setFilters(EMPTY_FILTERS); setShowFilters(false); }}
              className="flex-1 py-2.5 text-sm font-medium border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
              Tozalash
            </button>
            <button onClick={() => setShowFilters(false)}
              className="flex-1 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Qo&apos;llash
            </button>
          </div>
        </div>

        {/* Table card */}
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden">
          {error && <div className="bg-red-50 dark:bg-red-900/20 border-b border-red-100 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">{error}</div>}

          <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100 dark:border-slate-700">
            <div className="relative flex-1 max-w-xs">
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-slate-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" />
              </svg>
              <input type="text" placeholder="Xodim, raqam yoki mijoz..." value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-800 dark:text-slate-200 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400" />
            </div>
            <span className="text-xs text-gray-400 dark:text-slate-500 ml-auto">{visibleCalls.length} ta</span>
          </div>

          <UnifiedCallTable records={paginated} loading={loading} />

        </div>
      </main>

      {/* Sticky pagination */}
      <div className="sticky bottom-0 z-20 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700 px-4 py-2.5 flex items-center justify-between gap-4">
        {/* Sahifadagi yozuvlar soni */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 dark:text-slate-500 whitespace-nowrap">Sahifada:</span>
          <div className="flex gap-1">
            {PAGE_SIZES.map(s => (
              <button key={s} onClick={() => { setPageSize(s); setPage(1); }}
                className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${pageSize === s ? "bg-blue-600 text-white" : "text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Sahifa navigatsiyasi */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-400 dark:text-slate-500 mr-2 whitespace-nowrap">
            {visibleCalls.length === 0 ? "0" : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, visibleCalls.length)}`} / {visibleCalls.length}
          </span>
          <button onClick={() => setPage(1)} disabled={page === 1}
            className="p-1.5 rounded text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M11 19l-7-7 7-7M18 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="p-1.5 rounded text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const start = Math.max(1, Math.min(page - 2, totalPages - 4));
            const p = start + i;
            if (p > totalPages) return null;
            return (
              <button key={p} onClick={() => setPage(p)}
                className={`w-7 h-7 text-xs rounded font-medium transition-colors ${p === page ? "bg-blue-600 text-white" : "text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700"}`}>
                {p}
              </button>
            );
          })}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages || totalPages === 0}
            className="p-1.5 rounded text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
          <button onClick={() => setPage(totalPages)} disabled={page === totalPages || totalPages === 0}
            className="p-1.5 rounded text-gray-400 dark:text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-30 transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M13 5l7 7-7 7M6 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
}
