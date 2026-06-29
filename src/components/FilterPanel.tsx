"use client";

import { useEffect, useRef, useState } from "react";

export interface FilterValues {
  from: string;
  to: string;
  type: string;
  disposition: string;
  line: string;
  excludeInternal: boolean;
  deduplicateExternal: boolean;
}

interface Props {
  open: boolean;
  values: FilterValues;
  employees: { number: string; name: string }[];
  lines: string[];
  onChange: (v: FilterValues) => void;
  onApply: () => void;
  onClear: () => void;
  onClose: () => void;
}

export const EMPTY_FILTERS: FilterValues = {
  from: "",
  to: "",
  type: "",
  disposition: "",
  line: "",
  excludeInternal: true,
  deduplicateExternal: false,
};

interface DropdownProps {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
}

function Dropdown({ value, onChange, options, placeholder }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find(o => o.value === value);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
      >
        <span className={selected ? "text-gray-800 font-medium" : "text-gray-400"}>
          {selected ? selected.label : placeholder}
        </span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M19 9l-7 7-7-7" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
          <button
            type="button"
            onClick={() => { onChange(""); setOpen(false); }}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors ${!value ? "text-blue-600 font-semibold bg-blue-50" : "text-gray-500"}`}
          >
            {placeholder}
          </button>
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors ${value === o.value ? "text-blue-600 font-semibold bg-blue-50" : "text-gray-800"}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FilterPanel({ open, values, employees, lines, onChange, onApply, onClear, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const employeeOptions = employees.map(a => ({ value: a.number, label: `${a.name} (${a.number})` }));

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      <div className="flex-1 bg-black/20" onClick={onClose} />
      <div ref={ref} className="w-[320px] bg-white shadow-2xl flex flex-col h-full">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">Filtrlarni qo&apos;llash</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Линия */}
          {lines.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Линия</p>
              <Dropdown
                value={values.line}
                onChange={v => onChange({ ...values, line: v })}
                options={lines.map(l => ({ value: l, label: l }))}
                placeholder="Barcha линиялар"
              />
            </div>
          )}

          {/* Kimdan & Kimga */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-4 border border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Ishtirokchi</p>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Kimdan</label>
              <Dropdown
                value={values.from}
                onChange={v => onChange({ ...values, from: v })}
                options={employeeOptions}
                placeholder="Barcha xodimlar"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Kimga</label>
              <Dropdown
                value={values.to}
                onChange={v => onChange({ ...values, to: v })}
                options={employeeOptions}
                placeholder="Barcha xodimlar"
              />
            </div>
          </div>

          {/* Tipi & Holati */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-4 border border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Qo&apos;ng&apos;iroq</p>

            {/* Ichki qo'ng'iroqlarni chiqarib tashlash */}
            <button
              type="button"
              onClick={() => onChange({ ...values, excludeInternal: !values.excludeInternal })}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors text-sm font-medium
                ${values.excludeInternal
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"}`}
            >
              <span>Ichki qo&apos;ng&apos;iroqlarni yashirish</span>
              <div className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${values.excludeInternal ? "bg-blue-500" : "bg-gray-200"}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${values.excludeInternal ? "translate-x-4" : "translate-x-0"}`} />
              </div>
            </button>

            {/* Tashqi dublikatlarni yashirish */}
            <button
              type="button"
              onClick={() => onChange({ ...values, deduplicateExternal: !values.deduplicateExternal })}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg border transition-colors text-sm font-medium
                ${values.deduplicateExternal
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300"}`}
            >
              <span>Tashqi dublikatlarni yashirish</span>
              <div className={`w-9 h-5 rounded-full transition-colors flex items-center px-0.5 ${values.deduplicateExternal ? "bg-blue-500" : "bg-gray-200"}`}>
                <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${values.deduplicateExternal ? "translate-x-4" : "translate-x-0"}`} />
              </div>
            </button>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Tipi</label>
              <Dropdown
                value={values.type}
                onChange={v => onChange({ ...values, type: v })}
                options={[
                  { value: "Inbound", label: "Kiruvchi" },
                  { value: "Outbound", label: "Chiquvchi" },
                  { value: "Internal", label: "Ichki" },
                ]}
                placeholder="Barchasi"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Holati</label>
              <Dropdown
                value={values.disposition}
                onChange={v => onChange({ ...values, disposition: v })}
                options={[
                  { value: "ANSWERED", label: "Qabul qilingan" },
                  { value: "NO ANSWER", label: "Javobsiz" },
                  { value: "BUSY", label: "Band" },
                  { value: "FAILED", label: "Muvaffaqiyatsiz" },
                ]}
                placeholder="Barchasi"
              />
            </div>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
          <button
            onClick={onApply}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 active:scale-95 transition-all"
          >
            Qo&apos;llash
          </button>
          <button
            onClick={onClear}
            className="flex-1 border border-gray-200 text-gray-500 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 active:scale-95 transition-all"
          >
            Tozalash
          </button>
        </div>
      </div>
    </div>
  );
}
