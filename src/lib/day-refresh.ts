import { queryCDRChunked } from "./yeastar";
import { queryMZCalls } from "./moizvonki";
import {
  DayCache, setCachedDay, deleteCachedDay,
  isoToPBXRange, isoToUnixRange,
  parsePBXDate, formatPBXDate,
  getInflight, setInflight,
} from "./cache";
import { CDRRecord } from "@/types/cdr";
import { log } from "./logger";

// ── Bitta kun uchun to'liq API so'rov ────────────────────────────────────

export async function fetchDayFull(isoDate: string): Promise<DayCache> {
  const { start, end } = isoToPBXRange(isoDate);
  const { from, to }   = isoToUnixRange(isoDate);

  const [cdrRes, mzRes] = await Promise.allSettled([
    queryCDRChunked(start, end),
    queryMZCalls(from, to),
  ]);

  const cdrOk = cdrRes.status === "fulfilled" && cdrRes.value.errcode === 0;
  const pbx   = cdrOk ? (cdrRes.value.data ?? []) as CDRRecord[] : [];
  const mz    = mzRes.status === "fulfilled" ? mzRes.value : [];

  if (!cdrOk) {
    const err = cdrRes.status === "rejected" ? String(cdrRes.reason) : cdrRes.value.errmsg;
    throw new Error(`CDR xato: ${err}`);
  }

  const entry: DayCache = { pbx, mz, cachedAt: Date.now() };
  await setCachedDay(isoDate, pbx, mz);
  return entry;
}

// ── Inkremental: faqat oxirgi yozuvdan keyingi ma'lumotlar ───────────────

export async function incrementalUpdateDay(
  isoDate: string,
  existing: DayCache,
  cachedMap: Map<string, DayCache>
): Promise<void> {
  const { end }      = isoToPBXRange(isoDate);
  const { from, to } = isoToUnixRange(isoDate);

  let sinceMs = existing.cachedAt - 5 * 60 * 1000;
  if (existing.pbx.length > 0) {
    const maxMs = Math.max(...existing.pbx.map(r => parsePBXDate(r.time ?? "").getTime()));
    if (maxMs > 0) sinceMs = maxMs - 60 * 1000;
  }
  const since = formatPBXDate(new Date(sinceMs));
  log.info("day-refresh", `Inkremental: ${since} → ${end}`);

  const [cdrRes, mzRes] = await Promise.allSettled([
    queryCDRChunked(since, end),
    queryMZCalls(from, to),
  ]);

  if (cdrRes.status === "rejected" || cdrRes.value.errcode !== 0) {
    const err = cdrRes.status === "rejected" ? String(cdrRes.reason) : cdrRes.value.errmsg;
    log.error("day-refresh", `Inkremental CDR xato: ${err}`);
    return;
  }

  const newPbx = cdrRes.value.data ?? [];
  const newMz  = mzRes.status === "fulfilled" ? mzRes.value : existing.mz;

  const byUid = new Map<string, CDRRecord>();
  for (const r of existing.pbx) byUid.set(r.uid, r);
  for (const r of newPbx)      byUid.set(r.uid, r);
  const merged = [...byUid.values()];

  log.info("day-refresh", `Inkremental: ${existing.pbx.length}+${newPbx.length}→${merged.length}`);
  await setCachedDay(isoDate, merged, newMz);
  cachedMap.set(isoDate, { pbx: merged, mz: newMz, cachedAt: Date.now() });
}

// ── Refresh timing (modul darajasida — server restart da yangilanadi) ────

const INCREMENTAL_COOLDOWN_MS = 30 * 1000;
const DOUBLE_TAP_WINDOW_MS    = 8  * 1000;

const lastRefreshMap = new Map<string, number>(); // isoDate → timestamp

export type RefreshResult = "full" | "incremental" | "cooldown" | "fetched";

// Refresh so'rovini qayta ishlash: to'liq / inkremental / cooldown
export async function handleRefresh(
  isoDate: string,
  cachedMap: Map<string, DayCache>
): Promise<RefreshResult> {
  const now = Date.now();
  const lastAt = lastRefreshMap.get(isoDate) ?? 0;
  const since = now - lastAt;

  const isDoubleTap   = since < DOUBLE_TAP_WINDOW_MS;
  const incrementalOk = since >= INCREMENTAL_COOLDOWN_MS;

  if (isDoubleTap) {
    // To'liq qayta yuklash
    log.info("day-refresh", `${isoDate}: ikki marta bosish → to'liq yuklash`);
    lastRefreshMap.set(isoDate, now);
    deleteCachedDay(isoDate).catch(() => {});
    cachedMap.delete(isoDate);

    const existing = getInflight(isoDate);
    if (existing) { cachedMap.set(isoDate, await existing); return "full"; }

    const p = fetchDayFull(isoDate).then(entry => {
      cachedMap.set(isoDate, entry);
      return entry;
    });
    setInflight(isoDate, p);
    cachedMap.set(isoDate, await p);
    return "full";
  }

  if (incrementalOk) {
    lastRefreshMap.set(isoDate, now);
    const cached = cachedMap.get(isoDate);
    if (!cached) {
      // Cache yo'q — to'liq yuklash
      const existing = getInflight(isoDate);
      if (existing) { cachedMap.set(isoDate, await existing); return "fetched"; }
      const p = fetchDayFull(isoDate).then(entry => { cachedMap.set(isoDate, entry); return entry; });
      setInflight(isoDate, p);
      cachedMap.set(isoDate, await p);
      return "fetched";
    }
    await incrementalUpdateDay(isoDate, cached, cachedMap);
    return "incremental";
  }

  const remaining = Math.ceil((INCREMENTAL_COOLDOWN_MS - since) / 1000);
  log.info("day-refresh", `${isoDate}: cooldown ${remaining}s qoldi`);
  return "cooldown";
}
