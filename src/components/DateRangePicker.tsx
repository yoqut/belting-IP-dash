"use client";

import { useEffect, useRef, useState } from "react";

export interface DateRange {
  start: Date;
  end: Date;
}

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

const PRESETS = [
  { label: "Bugun", key: "today" },
  { label: "Kecha", key: "yesterday" },
  { label: "Shu hafta", key: "week" },
  { label: "Shu oy", key: "month" },
  { label: "O'tkan oy", key: "prev_month" },
];

const MONTHS = ["Yanvar","Fevral","Mart","Aprel","May","Iyun","Iyul","Avgust","Sentabr","Oktabr","Noyabr","Dekabr"];
const DAYS = ["Du","Se","Cho","Pa","Ju","Sha","Ya"];

function startOfDay(d: Date) { const r = new Date(d); r.setHours(0,0,0,0); return r; }
function endOfDay(d: Date) { const r = new Date(d); r.setHours(23,59,59,0); return r; }

function getPreset(key: string): DateRange {
  const now = new Date();
  const today = startOfDay(now);
  switch (key) {
    case "yesterday": {
      const y = new Date(today); y.setDate(y.getDate() - 1);
      return { start: y, end: endOfDay(y) };
    }
    case "week": {
      const d = new Date(today);
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      d.setDate(d.getDate() + diff);
      return { start: d, end: endOfDay(now) };
    }
    case "month":
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfDay(now) };
    case "prev_month": {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: s, end: endOfDay(e) };
    }
    default:
      return { start: today, end: endOfDay(now) };
  }
}

function formatDisplay(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Mon=0
}

export default function DateRangePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(value.start.getFullYear());
  const [viewMonth, setViewMonth] = useState(value.start.getMonth());
  const [selecting, setSelecting] = useState<Date | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleDayClick(day: number) {
    const clicked = new Date(viewYear, viewMonth, day);
    if (!selecting) {
      setSelecting(clicked);
    } else {
      const [s, e] = clicked < selecting
        ? [clicked, selecting]
        : [selecting, clicked];
      onChange({ start: startOfDay(s), end: endOfDay(e) });
      setSelecting(null);
      setOpen(false);
    }
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(v => v - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(v => v + 1); }
    else setViewMonth(m => m + 1);
  }

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function isInRange(day: number) {
    const d = new Date(viewYear, viewMonth, day);
    const s = selecting ?? value.start;
    const [lo, hi] = selecting
      ? d < selecting ? [d, selecting] : [selecting, d]
      : [value.start, value.end];
    return d >= startOfDay(lo) && d <= endOfDay(hi);
  }

  function isStart(day: number) {
    const d = new Date(viewYear, viewMonth, day);
    const s = selecting ?? value.start;
    return d.toDateString() === startOfDay(s).toDateString();
  }

  function isEnd(day: number) {
    if (selecting) return false;
    const d = new Date(viewYear, viewMonth, day);
    return d.toDateString() === value.end.toDateString();
  }

  function isToday(day: number) {
    return new Date(viewYear, viewMonth, day).toDateString() === new Date().toDateString();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-700 bg-white hover:border-blue-400 transition-colors"
      >
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
        </svg>
        <span>{formatDisplay(value.start)} – {formatDisplay(value.end)}</span>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onChange(getPreset("today")); }}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); onChange(getPreset("today")); } }}
          className="text-gray-400 hover:text-gray-600 ml-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="absolute top-full mt-1 right-0 z-50 bg-white border border-gray-200 rounded-xl shadow-xl flex">
          {/* Presets */}
          <div className="flex flex-col gap-1 p-3 border-r border-gray-100 min-w-[120px]">
            {PRESETS.map(p => (
              <button
                key={p.key}
                onClick={() => { onChange(getPreset(p.key)); setOpen(false); setSelecting(null); }}
                className="text-left px-3 py-1.5 rounded-md text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Calendar */}
          <div className="p-3 w-[280px]">
            <div className="flex items-center justify-between mb-3">
              <button onClick={prevMonth} className="p-1 hover:bg-gray-100 rounded">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M15 18l-6-6 6-6" strokeLinecap="round" />
                </svg>
              </button>
              <span className="text-sm font-semibold text-gray-800">
                {MONTHS[viewMonth]} {viewYear}
              </span>
              <button onClick={nextMonth} className="p-1 hover:bg-gray-100 rounded">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-7 mb-1">
              {DAYS.map(d => (
                <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-0.5">
              {cells.map((day, i) => {
                if (!day) return <div key={`e-${i}`} />;
                const inRange = isInRange(day);
                const start = isStart(day);
                const end = isEnd(day);
                const today = isToday(day);
                return (
                  <button
                    key={day}
                    onClick={() => handleDayClick(day)}
                    className={`h-8 w-full text-sm rounded transition-colors
                      ${start || end ? "bg-blue-600 text-white font-semibold" : ""}
                      ${inRange && !start && !end ? "bg-blue-50 text-blue-700" : ""}
                      ${!inRange ? "text-gray-700 hover:bg-gray-100" : ""}
                      ${today && !start && !end ? "font-bold underline" : ""}
                    `}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2 justify-end">
              <button
                onClick={() => { setSelecting(null); setOpen(false); }}
                className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
              >
                Bekor qilish
              </button>
              <button
                onClick={() => { setSelecting(null); setOpen(false); }}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Tanlash
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
