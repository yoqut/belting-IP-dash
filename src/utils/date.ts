export interface DateRange {
  start: Date;
  end: Date;
}

export function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

export function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 0);
  return r;
}

/** Standart boshlang'ich oraliq: bugungi kun. */
export function todayRange(): DateRange {
  const now = new Date();
  return { start: startOfDay(now), end: endOfDay(now) };
}

/** Yeastar PBX kutadigan format: "DD/MM/YYYY HH:mm:ss". */
export function formatPBX(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/** Foydalanuvchiga ko'rsatiladigan format: "DD.MM.YYYY HH:mm". */
export function formatDisplayDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export type DatePresetKey = "today" | "yesterday" | "week" | "month" | "prev_month";

export const DATE_PRESETS: { key: DatePresetKey; label: string }[] = [
  { key: "today", label: "Bugun" },
  { key: "yesterday", label: "Kecha" },
  { key: "week", label: "Shu hafta" },
  { key: "month", label: "Shu oy" },
  { key: "prev_month", label: "O'tkan oy" },
];

export function getPresetRange(key: DatePresetKey): DateRange {
  const now = new Date();
  const today = startOfDay(now);
  switch (key) {
    case "yesterday": {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { start: y, end: endOfDay(y) };
    }
    case "week": {
      // Hafta dushanbadan boshlanadi
      const d = new Date(today);
      const day = d.getDay();
      d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
      return { start: d, end: endOfDay(now) };
    }
    case "month":
      return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: endOfDay(now) };
    case "prev_month": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start, end: endOfDay(end) };
    }
    case "today":
    default:
      return { start: today, end: endOfDay(now) };
  }
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Oyning birinchi kuni haftaning nechanchi ustuniga tushishi (Dushanba = 0). */
export function getFirstWeekdayOfMonth(year: number, month: number): number {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

export const MONTH_NAMES = [
  "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
  "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr",
];

export const WEEKDAY_NAMES = ["Du", "Se", "Cho", "Pa", "Ju", "Sha", "Ya"];

/**
 * `DateRange` ni React Query kaliti uchun barqaror (stabil) qatorga aylantiradi.
 * `Date` obyektlari har renderda yangi identifikatsiyaga ega bo'lgani uchun
 * ularni to'g'ridan-to'g'ri `queryKey` ga qo'yib bo'lmaydi.
 */
export function rangeKey(range: DateRange): string {
  return `${range.start.getTime()}-${range.end.getTime()}`;
}
