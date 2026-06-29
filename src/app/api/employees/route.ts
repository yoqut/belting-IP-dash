import { NextRequest, NextResponse } from "next/server";
import { queryCDRChunked, getDateRange } from "@/lib/yeastar";
import { queryMZCalls } from "@/lib/moizvonki";
import { CDRRecord } from "@/types/cdr";
import { MZCall } from "@/types/moizvonki";
import {
  getCachedDays,
  setCachedDay,
  splitRangeIntoDays,
  isoToPBXRange,
  isoToUnixRange,
  todayISO,
  getInflight,
  setInflight,
  DayCache,
} from "@/lib/cache";

export interface EmployeeStat {
  number: string;
  name: string;
  total: number;
  inbound: number;
  inbound_answered: number;
  inbound_missed: number;
  outbound: number;
  outbound_success: number;
  outbound_failed: number;
  total_duration_sec: number;
  total_talk_sec: number;
}

function isEmployee(number: string, name: string): boolean {
  if (!number || !name || name === number) return false;
  if (name.toLowerCase().startsWith("automatic")) return false;
  return number.length <= 5;
}

function buildStats(records: CDRRecord[]): EmployeeStat[] {
  const map = new Map<string, EmployeeStat>();

  function get(number: string, name: string): EmployeeStat {
    if (!map.has(number)) {
      map.set(number, {
        number, name,
        total: 0,
        inbound: 0, inbound_answered: 0, inbound_missed: 0,
        outbound: 0, outbound_success: 0, outbound_failed: 0,
        total_duration_sec: 0, total_talk_sec: 0,
      });
    }
    return map.get(number)!;
  }

  for (const r of records) {
    const dur  = r.duration ?? 0;
    const talk = r.talk_duration ?? 0;
    if (r.call_type === "Inbound" && r.call_to_number && isEmployee(r.call_to_number, r.call_to_name)) {
      const emp = get(r.call_to_number, r.call_to_name);
      emp.total++; emp.inbound++; emp.total_duration_sec += dur;
      if (r.disposition === "ANSWERED") { emp.inbound_answered++; emp.total_talk_sec += talk; }
      else emp.inbound_missed++;
    } else if (r.call_type === "Outbound" && r.call_from_number && isEmployee(r.call_from_number, r.call_from_name)) {
      const emp = get(r.call_from_number, r.call_from_name);
      emp.total++; emp.outbound++; emp.total_duration_sec += dur;
      if (r.disposition === "ANSWERED") { emp.outbound_success++; emp.total_talk_sec += talk; }
      else emp.outbound_failed++;
    }
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

async function fetchDayForEmployees(isoDate: string): Promise<DayCache> {
  const existing = getInflight(isoDate);
  if (existing) return existing;

  const { start, end } = isoToPBXRange(isoDate);
  const { from, to }   = isoToUnixRange(isoDate);

  const p: Promise<DayCache> = Promise.allSettled([
    queryCDRChunked(start, end),
    queryMZCalls(from, to),
  ]).then(([cdrRes, mzRes]) => {
    const cdrOk = cdrRes.status === "fulfilled" && cdrRes.value.errcode === 0;
    const pbx = cdrOk ? (cdrRes.value.data ?? []) as CDRRecord[] : [] as CDRRecord[];
    const mz  = mzRes.status === "fulfilled" ? mzRes.value as MZCall[] : [] as MZCall[];
    const entry: DayCache = { pbx, mz, cachedAt: Date.now() };
    // CDR xato bo'lsa Supabase ga saqlamaymiz — keyingi so'rovda qayta urinadi
    if (cdrOk) setCachedDay(isoDate, pbx, mz).catch(() => {});
    return entry;
  });

  setInflight(isoDate, p);
  return p;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const customStart = searchParams.get("start");
    const customEnd   = searchParams.get("end");
    const { start, end } = customStart && customEnd
      ? { start: customStart, end: customEnd }
      : getDateRange(searchParams.get("date") ?? "today");

    const today = todayISO();
    const days  = splitRangeIntoDays(start, end);
    const cachedMap = await getCachedDays(days);

    // Yo'q kunlarni yuklaymiz (inflight orqali calls route bilan deduplication)
    const toFetch = days.filter(d => !cachedMap.has(d));
    if (toFetch.length > 0) {
      const CONCURRENCY = 3;
      for (let i = 0; i < toFetch.length; i += CONCURRENCY) {
        const chunk = toFetch.slice(i, i + CONCURRENCY);
        const results = await Promise.allSettled(chunk.map(d => fetchDayForEmployees(d)));
        for (let j = 0; j < chunk.length; j++) {
          if (results[j].status === "fulfilled") {
            cachedMap.set(chunk[j], (results[j] as PromiseFulfilledResult<DayCache>).value);
          }
        }
      }
    }

    const allPBX: CDRRecord[] = [];
    for (const d of days) {
      const entry = cachedMap.get(d);
      if (entry) allPBX.push(...entry.pbx);
    }

    // Bugun hech narsa yo'q va hali cache qurilmagan — bo'sh natija qaytaramiz
    const isEmpty = allPBX.length === 0 && days.includes(today);

    const employees = buildStats(allPBX);
    return NextResponse.json({ employees, empty: isEmpty });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server xatosi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
