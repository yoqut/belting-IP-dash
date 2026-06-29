import { MZCall, MZStats } from "@/types/moizvonki";
import { log, timer } from "./logger";

const HOST = process.env.MY_ZVONKI_API_HOST ?? "";
const API_KEY = process.env.MY_ZVONKI_API_KEY ?? "";
const USER = process.env.MY_ZVONKI_API_EMAIL ?? "";

const BASE_URL = `https://${HOST}/api/v1`;

export function todayMZRange(): { from_date: number; to_date: number } {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const end = new Date(); end.setHours(23, 59, 59, 0);
  return { from_date: Math.floor(start.getTime() / 1000), to_date: Math.floor(end.getTime() / 1000) };
}

export function mzRangeFromISO(startISO: string, endISO: string): { from_date: number; to_date: number } {
  return {
    from_date: Math.floor(new Date(startISO).getTime() / 1000),
    to_date: Math.floor(new Date(endISO).getTime() / 1000),
  };
}

export interface MZEmployee {
  id: number;
  display_name: string;
  email: string;
}

export async function queryMZEmployees(): Promise<MZEmployee[]> {
  const elapsed = timer();
  log.info("MZ", "Xodimlar ro'yxati so'ralmoqda");
  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_name: USER, api_key: API_KEY, action: "company.list_employee" }),
  });
  if (!res.ok) {
    log.error("MZ", `Xodimlar yuklanmadi`, { status: res.status });
    return [];
  }
  const data = await res.json();
  const results = data.results ?? [];
  log.ok("MZ", `${results.length} xodim yuklandi`, { ms: elapsed() });
  return results;
}

const MAX_RESULTS = 500;
const TODAY_TTL = 2 * 60 * 1000;

interface MZCacheEntry { calls: MZCall[]; cachedAt: number; permanent: boolean; }
const mzCache = new Map<string, MZCacheEntry>();
const mzInflight = new Map<string, Promise<MZCall[]>>();

function todayUnix(): { start: number; end: number } {
  const s = new Date(); s.setHours(0, 0, 0, 0);
  const e = new Date(); e.setHours(23, 59, 59, 0);
  return { start: Math.floor(s.getTime() / 1000), end: Math.floor(e.getTime() / 1000) };
}

function mzPost(body: Record<string, unknown>): Promise<Response> {
  return fetch(BASE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_name: USER, api_key: API_KEY, ...body }),
  });
}

async function fetchMZCalls(from_date: number, to_date: number): Promise<MZCall[]> {
  const elapsed = timer();
  const params = { action: "calls.list", from_date, to_date, max_results: MAX_RESULTS, supervised: 1 };

  log.info("MZ", "1-sahifa yuklanmoqda", { from_date, to_date });
  const firstRes = await mzPost({ ...params, from_offset: 0 });
  if (!firstRes.ok) {
    log.error("MZ", `API xatosi`, { status: firstRes.status });
    throw new Error(`MoiZvonki xatosi: ${firstRes.status}`);
  }
  const first = await firstRes.json();
  const page1: MZCall[] = first.results ?? [];
  const remains: number = first.results_remains ?? 0;

  if (remains <= 0) {
    log.ok("MZ", `${page1.length} qo'ng'iroq yuklandi (1 sahifa)`, { ms: elapsed() });
    return page1;
  }

  const extraPages = Math.ceil(remains / MAX_RESULTS);
  log.info("MZ", `Yana ${extraPages} sahifa parallel yuklanmoqda`, { remains });

  const rest = await Promise.all(
    Array.from({ length: extraPages }, (_, i) =>
      mzPost({ ...params, from_offset: (i + 1) * MAX_RESULTS })
        .then(r => r.ok ? r.json() : { results: [] })
        .then(d => (d.results ?? []) as MZCall[])
    )
  );

  const all = [...page1, ...rest.flat()];
  log.ok("MZ", `${all.length} qo'ng'iroq yuklandi (${1 + extraPages} sahifa)`, { ms: elapsed() });
  return all;
}

export async function queryMZCalls(from_date: number, to_date: number): Promise<MZCall[]> {
  const key = `${from_date}|${to_date}`;
  const { start: todayStart, end: todayEnd } = todayUnix();
  const isToday = from_date >= todayStart && to_date <= todayEnd + 1;

  const hit = mzCache.get(key);
  if (hit) {
    if (hit.permanent) {
      log.cache("MZ", `Cache (doimiy): ${hit.calls.length} qo'ng'iroq`);
      return hit.calls;
    }
    if (Date.now() - hit.cachedAt < TODAY_TTL) {
      const age = Math.round((Date.now() - hit.cachedAt) / 1000);
      log.cache("MZ", `Cache (${age}s oldin): ${hit.calls.length} qo'ng'iroq`);
      return hit.calls;
    }
    mzCache.delete(key);
  }

  if (mzInflight.has(key)) {
    log.info("MZ", "Yuklash davom etmoqda, kutilmoqda...");
  }

  let p = mzInflight.get(key);
  if (!p) {
    p = fetchMZCalls(from_date, to_date).then(calls => {
      mzCache.set(key, { calls, cachedAt: Date.now(), permanent: !isToday });
      mzInflight.delete(key);
      return calls;
    }).catch(err => {
      log.error("MZ", `Yuklash muvaffaqiyatsiz`, { error: String(err) });
      mzInflight.delete(key);
      throw err;
    });
    mzInflight.set(key, p);
  }
  return p;
}

export function computeMZStats(calls: MZCall[]): MZStats {
  const stats: MZStats = { total: calls.length, inbound: 0, outbound: 0, answered: 0, missed: 0 };
  for (const c of calls) {
    if (c.direction === 0) {
      stats.inbound++;
      if (c.answered === 1) stats.answered++;
      else stats.missed++;
    } else {
      stats.outbound++;
    }
  }
  return stats;
}
