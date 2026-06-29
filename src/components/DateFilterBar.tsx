"use client";

import { DateFilter } from "@/types/cdr";

interface Props {
  active: DateFilter;
  onChange: (f: DateFilter) => void;
}

const filters: { key: DateFilter; label: string }[] = [
  { key: "today", label: "Bugun" },
  { key: "week", label: "Shu hafta" },
  { key: "month", label: "Oy" },
  { key: "year", label: "Yil" },
];

export default function DateFilterBar({ active, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-md p-1">
      {filters.map((f) => (
        <button
          key={f.key}
          onClick={() => onChange(f.key)}
          className={`px-3 py-1.5 rounded text-sm font-medium transition-all ${
            active === f.key
              ? "bg-white text-blue-600 shadow-sm"
              : "text-gray-600 hover:text-gray-800"
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}
