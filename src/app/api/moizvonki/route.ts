import { NextRequest, NextResponse } from "next/server";
import { queryMZCalls, computeMZStats, todayMZRange, mzRangeFromISO, queryMZEmployees, MZEmployee } from "@/lib/moizvonki";
import { MZCall, MZStats } from "@/types/moizvonki";

interface CacheEntry {
  calls: MZCall[];
  stats: MZStats;
  employees: MZEmployee[];
  cachedAt: number;
}

const cache = new Map<string, CacheEntry>();
const TTL = 2 * 60 * 1000;

function getCached(key: string): CacheEntry | null {
  const e = cache.get(key);
  if (!e) return null;
  if (Date.now() - e.cachedAt > TTL) { cache.delete(key); return null; }
  return e;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const startISO = searchParams.get("start");
    const endISO = searchParams.get("end");

    const { from_date, to_date } = (startISO && endISO)
      ? mzRangeFromISO(startISO, endISO)
      : todayMZRange();

    const cacheKey = `${from_date}|${to_date}`;
    const cached = getCached(cacheKey);
    if (cached) return NextResponse.json({ ...cached, from_cache: true });

    const [calls, employees] = await Promise.all([
      queryMZCalls(from_date, to_date),
      queryMZEmployees(),
    ]);
    const stats = computeMZStats(calls);
    cache.set(cacheKey, { calls, stats, employees, cachedAt: Date.now() });

    return NextResponse.json({ calls, stats, employees });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server xatosi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
