import { NextRequest, NextResponse } from "next/server";
import { queryCDR, queryRecordingsByCallers, getDateRange, formatPBXDate } from "@/lib/yeastar";
import { CDRRecord, CDRStats } from "@/types/cdr";

interface CacheEntry {
  records: CDRRecord[];
  stats: CDRStats;
  called_back_numbers: string[];
  total: number;
  cachedAt: number;
  permanent: boolean;
}

const cache = new Map<string, CacheEntry>();
const TODAY_TTL = 2 * 60 * 1000;

function todayDateStr(): string {
  const now = new Date();
  return `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
}

function endsToday(end: string): boolean {
  return end.startsWith(todayDateStr());
}

function startsToday(start: string): boolean {
  return start.startsWith(todayDateStr());
}

function getCached(key: string): CacheEntry | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (entry.permanent) return entry;
  if (Date.now() - entry.cachedAt < TODAY_TTL) return entry;
  cache.delete(key);
  return null;
}

function computeStats(records: CDRRecord[]): CDRStats {
  const stats: CDRStats = {
    all: records.length,
    inbound: 0, answered: 0, missed: 0, no_answer: 0,
    outbound: 0, outbound_success: 0, outbound_failed: 0, internal: 0,
  };
  const calledBackNums = new Set(
    records.filter(r => r.call_type === "Outbound" && r.call_to_number).map(r => r.call_to_number)
  );
  const missedCallers = new Set<string>();
  for (const r of records) {
    if (r.call_type === "Inbound") {
      stats.inbound++;
      if (r.disposition === "ANSWERED") stats.answered++;
      else { stats.missed++; if (r.call_from_number) missedCallers.add(r.call_from_number); }
    } else if (r.call_type === "Outbound") {
      stats.outbound++;
      if (r.disposition === "ANSWERED") stats.outbound_success++;
      else stats.outbound_failed++;
    } else if (r.call_type === "Internal") {
      stats.internal++;
    }
  }
  for (const num of missedCallers) {
    if (!calledBackNums.has(num)) stats.no_answer++;
  }
  return stats;
}

function pbxToUnix(pbxDate: string): number {
  const m = pbxDate.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})/);
  if (!m) return 0;
  return Math.floor(new Date(`${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:${m[6]}`).getTime() / 1000);
}

// Bugunning boshlanishi: "DD/MM/YYYY 00:00:00"
function todayStartPBX(): string {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return formatPBXDate(now);
}

// Kechaning oxiri: "DD/MM/YYYY 23:59:59"  (bugundan bir kun oldin)
function yesterdayEndPBX(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(23, 59, 59, 0);
  return formatPBXDate(d);
}

async function fetchRange(start: string, end: string): Promise<CDRRecord[]> {
  const PAGE_SIZE = 500;
  const [first, recMap] = await Promise.all([
    queryCDR(start, end, 1, PAGE_SIZE),
    queryRecordingsByCallers([], pbxToUnix(start), pbxToUnix(end)),
  ]);
  if (first.errcode !== 0) throw new Error(first.errmsg || "CDR xatosi");

  const rawRecords = [...(first.data ?? [])];
  const total = first.total_number ?? rawRecords.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (totalPages > 1) {
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) => queryCDR(start, end, i + 2, PAGE_SIZE))
    );
    for (const resp of rest) {
      if (resp.errcode === 0 && resp.data) rawRecords.push(...resp.data);
    }
  }

  return rawRecords.map(r => ({ ...r, rec_id: recMap.get(r.uid) ?? null }));
}

function buildEntry(records: CDRRecord[], permanent: boolean): CacheEntry {
  const stats = computeStats(records);
  const called_back_numbers = Array.from(
    new Set(records.filter(r => r.call_type === "Outbound" && r.call_to_number).map(r => r.call_to_number))
  );
  return { records, stats, called_back_numbers, total: records.length, cachedAt: Date.now(), permanent };
}

// O'tgan kunlar + bugun ni ajratib yuklash
// O'tgan qism: doimiy cache; bugungi qism: 2-daqiqalik cache
async function fetchSplit(start: string, end: string): Promise<Omit<CacheEntry, "cachedAt" | "permanent">> {
  const histKey = `${start}|${yesterdayEndPBX()}`;
  const todayKey = `${todayStartPBX()}|${end}`;

  // Ikki qismni parallel yuklaymiz, lekin har birini alohida cache qilamiz
  const [histRecords, todayRecords] = await Promise.all([
    (async () => {
      const cached = getCached(histKey);
      if (cached) return cached.records;
      const recs = await fetchRange(start, yesterdayEndPBX());
      cache.set(histKey, buildEntry(recs, true)); // doimiy
      return recs;
    })(),
    (async () => {
      const cached = getCached(todayKey);
      if (cached) return cached.records;
      const recs = await fetchRange(todayStartPBX(), end);
      cache.set(todayKey, buildEntry(recs, false)); // 2-daqiqalik
      return recs;
    })(),
  ]);

  const all = [...histRecords, ...todayRecords];
  const stats = computeStats(all);
  const called_back_numbers = Array.from(
    new Set(all.filter(r => r.call_type === "Outbound" && r.call_to_number).map(r => r.call_to_number))
  );
  return { records: all, stats, called_back_numbers, total: all.length };
}

async function fetchFull(start: string, end: string): Promise<Omit<CacheEntry, "cachedAt" | "permanent">> {
  const records = await fetchRange(start, end);
  const stats = computeStats(records);
  const called_back_numbers = Array.from(
    new Set(records.filter(r => r.call_type === "Outbound" && r.call_to_number).map(r => r.call_to_number))
  );
  return { records, stats, called_back_numbers, total: records.length };
}

const inflight = new Map<string, Promise<Omit<CacheEntry, "cachedAt" | "permanent">>>();

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const customStart = searchParams.get("start");
    const customEnd = searchParams.get("end");
    const { start, end } = customStart && customEnd
      ? { start: customStart, end: customEnd }
      : getDateRange(searchParams.get("date") ?? "today");

    const quick = searchParams.get("quick") === "1";

    // Diapazon tahlili
    const isOnlyToday = startsToday(start) && endsToday(end);
    // Ko'p kunli diapazon bugun bilan tugasa — bo'lib yuklash kerak
    const needsSplit = endsToday(end) && !startsToday(start);

    const cacheKey = `${start}|${end}`;

    // To'liq diapazon uchun cache tekshiramiz (faqat oddiy holatlar)
    if (!needsSplit) {
      const cached = getCached(cacheKey);
      if (cached) {
        return NextResponse.json({ ...cached, has_more: false, from_cache: true });
      }
    }

    // quick=1: birinchi sahifani tez qaytaramiz, fonda to'liq yuklaymiz
    if (quick) {
      const PAGE_SIZE = 500;
      const first = await queryCDR(start, end, 1, PAGE_SIZE);
      if (first.errcode !== 0) return NextResponse.json({ error: first.errmsg }, { status: 502 });

      const rawRecords = first.data ?? [];
      const total = first.total_number ?? rawRecords.length;
      const totalPages = Math.ceil(total / PAGE_SIZE);
      const records = rawRecords.map(r => ({ ...r, rec_id: null }));
      const stats = computeStats(records);
      const called_back_numbers = Array.from(
        new Set(records.filter(r => r.call_type === "Outbound" && r.call_to_number).map(r => r.call_to_number))
      );

      // Fonda to'liq ma'lumot
      if (!inflight.has(cacheKey)) {
        const loader = needsSplit ? fetchSplit : fetchFull;
        const p = loader(start, end).then(data => {
          if (!needsSplit) {
            cache.set(cacheKey, { ...data, cachedAt: Date.now(), permanent: !isOnlyToday && !needsSplit });
          }
          inflight.delete(cacheKey);
          return data;
        }).catch(() => { inflight.delete(cacheKey); throw new Error("fetch failed"); });
        inflight.set(cacheKey, p);
      }

      return NextResponse.json({ records, stats, called_back_numbers, total, has_more: totalPages > 1 });
    }

    // Full so'rov
    let promise = inflight.get(cacheKey);
    if (!promise) {
      const loader = needsSplit ? fetchSplit : fetchFull;
      promise = loader(start, end).then(data => {
        if (!needsSplit) {
          cache.set(cacheKey, { ...data, cachedAt: Date.now(), permanent: !isOnlyToday });
        }
        inflight.delete(cacheKey);
        return data;
      }).catch(err => { inflight.delete(cacheKey); throw err; });
      inflight.set(cacheKey, promise);
    }

    const data = await promise;
    return NextResponse.json({ ...data, has_more: false });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server xatosi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
