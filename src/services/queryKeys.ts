import { DateRange, rangeKey } from "@/utils/date";

/**
 * Barcha query kalitlari bitta joyda.
 * Kalitni invalidatsiya qilish kerak bo'lganda qidirib yurmaslik uchun,
 * va tasodifiy nomlanish farqlari keshni ikkiga bo'lib yubormasligi uchun.
 */
export const queryKeys = {
  calls: (range: DateRange) => ["calls", rangeKey(range)] as const,
  cdr: (range: DateRange) => ["cdr", rangeKey(range)] as const,
  moizvonki: () => ["moizvonki"] as const,
  settings: () => ["settings"] as const,
};
