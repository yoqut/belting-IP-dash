"use client";

import { memo, useEffect } from "react";
import { RadioOption, Select } from "@/components/ui/Controls";
import { CallFilters, TRUNK_LINES } from "@/utils/calls";

const CHANNEL_OPTIONS = [
  { value: "", label: "Barchasi" },
  { value: "pbx", label: "Ofis tizimi (PBX)" },
  { value: "sim", label: "Mobil tizim (SIM)" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Barchasi" },
  { value: "answered", label: "Javob berilgan" },
  { value: "missed", label: "Javobsiz" },
];

interface Props {
  open: boolean;
  filters: CallFilters;
  employeeNames: string[];
  onChange: (key: keyof CallFilters, value: string) => void;
  onClear: () => void;
  onClose: () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
        {title}
      </label>
      {children}
    </div>
  );
}

/**
 * Yon filter paneli. Faqat ko'rsatish bilan shug'ullanadi — qanday filterlash
 * kerakligini bilmaydi, holatni ham saqlamaydi (`useCallFilters` reduceri saqlaydi).
 */
const FilterDrawer = memo(function FilterDrawer({
  open, filters, employeeNames, onChange, onClear, onClose,
}: Props) {
  // ESC bilan yopish — avvalgi versiyada faqat backdrop bosish ishlardi
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} aria-hidden />}

      <aside
        aria-hidden={!open}
        className={`fixed top-0 right-0 h-full w-80 bg-white dark:bg-slate-900 shadow-2xl z-50 flex flex-col transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-slate-100">Filtrlarni qo&apos;llash</h2>
          <button
            onClick={onClose}
            aria-label="Yopish"
            className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-md transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          <Section title="Xodim">
            <Select value={filters.employee} onChange={v => onChange("employee", v)}>
              <option value="">Barchasi</option>
              {employeeNames.map(n => <option key={n} value={n}>{n}</option>)}
            </Select>
          </Section>

          <Section title="Kanal">
            <div className="flex flex-col gap-1.5">
              {CHANNEL_OPTIONS.map(opt => (
                <RadioOption
                  key={opt.value}
                  label={opt.label}
                  active={filters.channel === opt.value}
                  onClick={() => onChange("channel", opt.value)}
                />
              ))}
            </div>
          </Section>

          <Section title="Liniya (Trunk)">
            <div className="flex flex-col gap-1.5">
              <RadioOption label="Barchasi" active={filters.trunk === ""} onClick={() => onChange("trunk", "")} />
              {TRUNK_LINES.map(line => (
                <RadioOption
                  key={line}
                  label={line}
                  active={filters.trunk === line}
                  // Aktiv liniyani qayta bosish uni bekor qiladi
                  onClick={() => onChange("trunk", filters.trunk === line ? "" : line)}
                />
              ))}
            </div>
          </Section>

          <Section title="Holat">
            <div className="flex flex-col gap-1.5">
              {STATUS_OPTIONS.map(opt => (
                <RadioOption
                  key={opt.value}
                  label={opt.label}
                  active={filters.status === opt.value}
                  onClick={() => onChange("status", opt.value)}
                />
              ))}
            </div>
          </Section>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 dark:border-slate-700 flex gap-2">
          <button
            onClick={() => { onClear(); onClose(); }}
            className="flex-1 py-2.5 text-sm font-medium border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            Tozalash
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Qo&apos;llash
          </button>
        </div>
      </aside>
    </>
  );
});

export default FilterDrawer;
