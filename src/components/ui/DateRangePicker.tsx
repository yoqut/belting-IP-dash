"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DATE_PRESETS,
  DateRange,
  MONTH_NAMES,
  WEEKDAY_NAMES,
  endOfDay,
  formatDisplayDate,
  getDaysInMonth,
  getFirstWeekdayOfMonth,
  getPresetRange,
  startOfDay,
} from "@/utils/date";

interface Props {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

/**
 * Sana oralig'i tanlagich.
 *
 * Barcha sana mantiqi `@/utils/date` ga ko'chirilgan — bu komponent faqat
 * ko'rsatish va tanlash bilan shug'ullanadi (SRP).
 */
const DateRangePicker = memo(function DateRangePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => value.start.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => value.start.getMonth());
  /** Birinchi bosilgan kun — ikkinchisi bosilguncha oraliq yakunlanmaydi. */
  const [anchor, setAnchor] = useState<Date | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Tashqariga bosilganda yopish — listener faqat panel ochiqligida osiladi
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setAnchor(null);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); setAnchor(null); }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const handleDayClick = useCallback((day: number) => {
    const clicked = new Date(viewYear, viewMonth, day);
    if (!anchor) {
      setAnchor(clicked);
      return;
    }
    const [s, e] = clicked < anchor ? [clicked, anchor] : [anchor, clicked];
    onChange({ start: startOfDay(s), end: endOfDay(e) });
    setAnchor(null);
    setOpen(false);
  }, [anchor, viewYear, viewMonth, onChange]);

  const goPrevMonth = useCallback(() => {
    setViewMonth(m => (m === 0 ? 11 : m - 1));
    setViewYear(y => (viewMonth === 0 ? y - 1 : y));
  }, [viewMonth]);

  const goNextMonth = useCallback(() => {
    setViewMonth(m => (m === 11 ? 0 : m + 1));
    setViewYear(y => (viewMonth === 11 ? y + 1 : y));
  }, [viewMonth]);

  // Kalendar kataklari — oy o'zgarmaguncha qayta hisoblanmaydi
  const cells = useMemo<(number | null)[]>(() => [
    ...Array<null>(getFirstWeekdayOfMonth(viewYear, viewMonth)).fill(null),
    ...Array.from({ length: getDaysInMonth(viewYear, viewMonth) }, (_, i) => i + 1),
  ], [viewYear, viewMonth]);

  const todayKey = new Date().toDateString();

  function dayState(day: number) {
    const d = new Date(viewYear, viewMonth, day);
    const [lo, hi] = anchor
      ? (d < anchor ? [d, anchor] : [anchor, d])
      : [value.start, value.end];

    const inRange = d >= startOfDay(lo) && d <= endOfDay(hi);
    const isStart = d.toDateString() === startOfDay(anchor ?? value.start).toDateString();
    const isEnd = !anchor && d.toDateString() === value.end.toDateString();
    return { inRange, isEdge: isStart || isEnd, isToday: d.toDateString() === todayKey };
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 border border-gray-300 dark:border-slate-600 rounded-md px-3 py-1.5 text-sm text-gray-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:border-blue-400 transition-colors"
      >
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" />
        </svg>
        <span className="whitespace-nowrap">
          {formatDisplayDate(value.start)} – {formatDisplayDate(value.end)}
        </span>
        <span
          role="button"
          tabIndex={0}
          aria-label="Bugunga qaytarish"
          onClick={e => { e.stopPropagation(); onChange(getPresetRange("today")); }}
          onKeyDown={e => {
            if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); onChange(getPresetRange("today")); }
          }}
          className="text-gray-400 hover:text-gray-600 ml-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
          </svg>
        </span>
      </button>

      {open && (
        <div className="absolute top-full mt-1 right-0 z-50 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-xl flex">
          <div className="flex flex-col gap-1 p-3 border-r border-gray-100 dark:border-slate-700 min-w-[120px]">
            {DATE_PRESETS.map(p => (
              <button
                key={p.key}
                onClick={() => { onChange(getPresetRange(p.key)); setOpen(false); setAnchor(null); }}
                className="text-left px-3 py-1.5 rounded-md text-sm text-gray-700 dark:text-slate-300 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-600 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="p-3 w-[280px]">
            <div className="flex items-center justify-between mb-3">
              <button onClick={goPrevMonth} aria-label="Oldingi oy" className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M15 18l-6-6 6-6" strokeLinecap="round" />
                </svg>
              </button>
              <span className="text-sm font-semibold text-gray-800 dark:text-slate-100">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>
              <button onClick={goNextMonth} aria-label="Keyingi oy" className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M9 18l6-6-6-6" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-7 mb-1">
              {WEEKDAY_NAMES.map(d => (
                <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-0.5">
              {cells.map((day, i) => {
                if (!day) return <div key={`empty-${i}`} />;
                const { inRange, isEdge, isToday } = dayState(day);
                return (
                  <button
                    key={day}
                    onClick={() => handleDayClick(day)}
                    className={`h-8 w-full text-sm rounded transition-colors
                      ${isEdge ? "bg-blue-600 text-white font-semibold" : ""}
                      ${inRange && !isEdge ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300" : ""}
                      ${!inRange ? "text-gray-700 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700" : ""}
                      ${isToday && !isEdge ? "font-bold underline" : ""}`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700 flex gap-2 justify-end">
              <button
                onClick={() => { setAnchor(null); setOpen(false); }}
                className="px-3 py-1.5 text-sm text-gray-600 dark:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-700 rounded"
              >
                Bekor qilish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default DateRangePicker;
export type { DateRange };
