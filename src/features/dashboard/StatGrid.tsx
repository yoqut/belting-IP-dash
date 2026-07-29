"use client";

import { memo, useMemo } from "react";
import { UnifiedStats } from "@/types/unified";
import { ActiveGroup } from "@/utils/calls";

/* ─────────────────────────── Atomlar ─────────────────────────── */

interface SubStatProps {
  label: string;
  value: number;
  color: string;
  active: boolean;
  groupKey: ActiveGroup;
  onSelect: (key: ActiveGroup) => void;
}

const SubStat = memo(function SubStat({ label, value, color, active, groupKey, onSelect }: SubStatProps) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onSelect(groupKey); }}
      aria-pressed={active}
      className={`flex-1 flex flex-col items-start px-3 py-2 rounded-lg border transition-all text-left ${
        active
          ? "bg-blue-600 border-blue-600 shadow-sm"
          : "bg-white dark:bg-slate-800 border-gray-100 dark:border-slate-700 hover:border-blue-200 hover:shadow-sm"
      }`}
    >
      <span className={`text-xl font-bold ${active ? "text-white" : color}`}>{value}</span>
      <span className={`text-[11px] mt-0.5 leading-tight ${active ? "text-blue-100" : "text-gray-500 dark:text-slate-400"}`}>
        {label}
      </span>
    </button>
  );
});

interface GroupCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
  active: boolean;
  groupKey: ActiveGroup;
  onSelect: (key: ActiveGroup) => void;
  children?: React.ReactNode;
}

const GroupCard = memo(function GroupCard({
  label, value, icon, accent, active, groupKey, onSelect, children,
}: GroupCardProps) {
  return (
    <div
      className={`rounded-xl border transition-all overflow-hidden ${
        active
          ? "border-blue-400 dark:border-blue-500 shadow-md"
          : "bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700"
      }`}
      style={active ? { background: "linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)" } : undefined}
    >
      <button
        onClick={() => onSelect(groupKey)}
        aria-pressed={active}
        className="w-full flex items-center gap-3 px-4 py-3 hover:opacity-90 transition-opacity text-left"
      >
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${active ? "bg-white/20 text-white" : accent}`}>
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <span className={`text-[11px] font-semibold uppercase tracking-wide block ${active ? "text-blue-200" : "text-gray-500 dark:text-slate-400"}`}>
            {label}
          </span>
          <span className={`text-2xl font-bold leading-none ${active ? "text-white" : "text-gray-800 dark:text-slate-100"}`}>
            {value}
          </span>
        </div>
      </button>
      {children && <div className="flex gap-2 px-3 pb-3">{children}</div>}
    </div>
  );
});

/* ─────────────────────────── Ikonkalar ─────────────────────────── */

const ICONS = {
  all: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  outbound: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M7 17L17 7M17 7H7M17 7v10" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  inbound: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M7 7v10h10" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  internal: <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" strokeLinecap="round" strokeLinejoin="round" /></svg>,
} as const;

/* ─────────────────────────── Grid ─────────────────────────── */

interface StatGridProps {
  stats: UnifiedStats;
  /** "Barchasi" kartochkasidagi son — filterlangan umumiy soni. */
  totalCount: number;
  activeGroup: ActiveGroup;
  onSelect: (key: ActiveGroup) => void;
}

/**
 * Stat kartochkalar. `memo` bilan o'ralgan — sahifa raqami yoki qidiruv
 * matni o'zgarganda (statistika o'zgarmasa) qayta chizilmaydi.
 */
const StatGrid = memo(function StatGrid({ stats, totalCount, activeGroup, onSelect }: StatGridProps) {
  // Rang shartli hisoblanadi — nol bo'lganda diqqatni tortmasin
  const missedColor = useMemo(() => (stats.missed > 0 ? "text-red-500" : "text-gray-400"), [stats.missed]);
  const failedColor = useMemo(() => (stats.outbound_failed > 0 ? "text-amber-500" : "text-gray-400"), [stats.outbound_failed]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
      <GroupCard
        label="Barchasi"
        value={totalCount}
        icon={ICONS.all}
        accent="bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-slate-300"
        active={activeGroup === "all"}
        groupKey="all"
        onSelect={onSelect}
      />

      <GroupCard
        label="Chiquvchi"
        value={stats.outbound}
        icon={ICONS.outbound}
        accent="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
        active={activeGroup === "outbound"}
        groupKey="outbound"
        onSelect={onSelect}
      >
        <SubStat
          label="Muvaffaqiyatli" value={stats.outbound_success} color="text-green-600"
          active={activeGroup === "outbound_success"} groupKey="outbound_success" onSelect={onSelect}
        />
        <SubStat
          label="Muvaffaqiyatsiz" value={stats.outbound_failed} color={failedColor}
          active={activeGroup === "outbound_failed"} groupKey="outbound_failed" onSelect={onSelect}
        />
      </GroupCard>

      <GroupCard
        label="Kiruvchi"
        value={stats.inbound}
        icon={ICONS.inbound}
        accent="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400"
        active={activeGroup === "inbound"}
        groupKey="inbound"
        onSelect={onSelect}
      >
        <SubStat
          label="Javob berilgan" value={stats.answered} color="text-green-600"
          active={activeGroup === "answered"} groupKey="answered" onSelect={onSelect}
        />
        <SubStat
          label="O'tkazib berilgan" value={stats.missed} color={missedColor}
          active={activeGroup === "missed"} groupKey="missed" onSelect={onSelect}
        />
      </GroupCard>

      <GroupCard
        label="Ichki"
        value={stats.internal}
        icon={ICONS.internal}
        accent="bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
        active={activeGroup === "internal"}
        groupKey="internal"
        onSelect={onSelect}
      />
    </div>
  );
});

export default StatGrid;
