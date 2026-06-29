"use client";

import { CDRStats, CallFilter } from "@/types/cdr";

interface StatCard {
  key: CallFilter;
  label: string;
  count: number;
  warn?: boolean;
}

interface Props {
  stats: CDRStats;
  active: CallFilter;
  onChange: (f: CallFilter) => void;
}

export default function StatCards({ stats, active, onChange }: Props) {
  const cards: StatCard[] = [
    { key: "all", label: "Barchasi", count: stats.all },
    { key: "inbound", label: "Kiruvchi", count: stats.inbound },
    { key: "answered", label: "Qabul qilingan", count: stats.answered },
    { key: "missed", label: "O'tkazib yuborilgan", count: stats.missed, warn: true },
    { key: "no_answer", label: "Bog'lanilmagan", count: stats.no_answer, warn: true },
    { key: "outbound", label: "Chiquvchi", count: stats.outbound },
    { key: "outbound_success", label: "Muvaffaqiyatli", count: stats.outbound_success },
    { key: "outbound_failed", label: "Muvaffaqiyatsiz", count: stats.outbound_failed, warn: true },
    { key: "internal", label: "Ichki", count: stats.internal },
  ];

  return (
    <div className="flex border-b border-gray-200 overflow-x-auto bg-white">
      {cards.map((card, i) => {
        const isActive = active === card.key;
        return (
          <button
            key={card.key}
            onClick={() => onChange(card.key)}
            className={`
              flex flex-col items-center justify-center px-4 py-3 min-w-[100px] flex-1
              border-r border-gray-200 last:border-r-0 cursor-pointer transition-all select-none
              ${isActive ? "bg-blue-600" : card.warn && card.count > 0 ? "bg-red-50 hover:bg-red-100" : "bg-white hover:bg-gray-50"}
              ${i === 0 ? "" : ""}
            `}
          >
            <span className={`text-xs leading-tight text-center mb-1 ${isActive ? "text-blue-100" : "text-gray-500"}`}>
              {card.label}
            </span>
            <span className={`text-2xl font-bold leading-none ${isActive ? "text-white" : card.warn && card.count > 0 ? "text-red-500" : "text-gray-800"}`}>
              {card.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
