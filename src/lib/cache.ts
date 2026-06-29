import { createClient } from "@supabase/supabase-js";
import { CDRRecord } from "@/types/cdr";
import { MZCall } from "@/types/moizvonki";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface DayCache {
  pbx: CDRRecord[];
  mz: MZCall[];
  cachedAt: number; // unix ms
}

// ── Sana yordamchi funksiyalar ─────────────────────────────────────────────

// "DD/MM/YYYY HH:mm:ss" → Date (UTC+5 offset bilan)
export function parsePBXDate(s: string): Date {
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})/);
  if (!m) return new Date(0);
  return new Date(`${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:${m[6]}+05:00`);
}

// Date → "DD/MM/YYYY HH:mm:ss" (PBX format, UTC+5)
export function formatPBXDate(d: Date): string {
  const uz = new Date(d.getTime() + 5 * 60 * 60 * 1000);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(uz.getUTCDate())}/${p(uz.getUTCMonth() + 1)}/${uz.getUTCFullYear()} ${p(uz.getUTCHours())}:${p(uz.getUTCMinutes())}:${p(uz.getUTCSeconds())}`;
}

// Date → "YYYY-MM-DD" (O'zbekiston UTC+5)
export function toISODate(d: Date): string {
  const uz = new Date(d.getTime() + 5 * 60 * 60 * 1000);
  return uz.toISOString().slice(0, 10);
}

// Bugungi sana "YYYY-MM-DD" UTC+5
export function todayISO(): string {
  return toISODate(new Date());
}

// PBX sana oralig'ini kunlik ISO massivga bo'lish
export function splitRangeIntoDays(startPBX: string, endPBX: string): string[] {
  const start = parsePBXDate(startPBX);
  const end = parsePBXDate(endPBX);
  const days: string[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  while (cursor <= end) {
    days.push(toISODate(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return [...new Set(days)]; // takrorlanmasligini ta'minlaymiz
}

// "YYYY-MM-DD" → PBX format (DD/MM/YYYY HH:mm:ss)
export function isoToPBXRange(iso: string): { start: string; end: string } {
  const [y, mo, d] = iso.split("-");
  return {
    start: `${d}/${mo}/${y} 00:00:00`,
    end:   `${d}/${mo}/${y} 23:59:59`,
  };
}

// "YYYY-MM-DD" → unix timestamp oralig'i
export function isoToUnixRange(iso: string): { from: number; to: number } {
  const { start, end } = isoToPBXRange(iso);
  return {
    from: Math.floor(parsePBXDate(start).getTime() / 1000),
    to:   Math.floor(parsePBXDate(end).getTime()   / 1000),
  };
}

// ── L1 in-memory cache (Supabase ning ustidagi tez qatlam) ────────────────
const memCache = new Map<string, DayCache>();

// ── Inflight deduplication ─────────────────────────────────────────────────
// Bir xil kun uchun parallel API chaqiruvlarning oldini olish
const inflightDays = new Map<string, Promise<DayCache>>();

export function getInflight(isoDate: string): Promise<DayCache> | undefined {
  return inflightDays.get(isoDate);
}

export function setInflight(isoDate: string, p: Promise<DayCache>): void {
  inflightDays.set(isoDate, p);
  p.finally(() => inflightDays.delete(isoDate));
}

// ── Supabase CRUD ──────────────────────────────────────────────────────────

// Bir nechta kunni bir so'rovda olish (L1: xotira, L2: Supabase)
export async function getCachedDays(isoDates: string[]): Promise<Map<string, DayCache>> {
  if (!isoDates.length) return new Map();

  const result = new Map<string, DayCache>();
  const missing: string[] = [];

  // L1: xotiradan
  for (const d of isoDates) {
    const m = memCache.get(d);
    if (m) result.set(d, m);
    else missing.push(d);
  }

  if (!missing.length) return result; // L1 hit

  // L2: Supabase
  const { data, error } = await supabase
    .from("cdr_cache")
    .select("cache_date, pbx_records, mz_records, cached_at")
    .in("cache_date", missing);

  if (error) {
    console.error("[cache] getCachedDays xato:", error.message);
    return result;
  }

  for (const row of data ?? []) {
    const entry: DayCache = {
      pbx: (row.pbx_records as CDRRecord[]) ?? [],
      mz:  (row.mz_records  as MZCall[])   ?? [],
      cachedAt: new Date(row.cached_at).getTime(),
    };
    result.set(row.cache_date, entry);
    memCache.set(row.cache_date, entry); // L1 ni isintiramiz
  }

  return result;
}

// Bitta kunni o'chirish (xato bilan saqlangan bo'sh yozuvlarni tozalash)
export async function deleteCachedDay(isoDate: string): Promise<void> {
  memCache.delete(isoDate); // L1 dan ham o'chiramiz
  const { error } = await supabase.from("cdr_cache").delete().eq("cache_date", isoDate);
  if (error) console.error("[cache] deleteCachedDay xato:", isoDate, error.message);
}

// Bitta kunni saqlash / yangilash
export async function setCachedDay(
  isoDate: string,
  pbx: CDRRecord[],
  mz: MZCall[]
): Promise<void> {
  const { error } = await supabase
    .from("cdr_cache")
    .upsert(
      { cache_date: isoDate, pbx_records: pbx, mz_records: mz, cached_at: new Date().toISOString() },
      { onConflict: "cache_date" }
    );
  if (error) {
    console.error("[cache] setCachedDay XATO:", isoDate, error.message, error.code);
  } else {
    memCache.set(isoDate, { pbx, mz, cachedAt: Date.now() }); // L1 ham yangilaymiz
  }
}
