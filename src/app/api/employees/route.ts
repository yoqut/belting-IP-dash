import { NextRequest, NextResponse } from "next/server";
import { getDateRange } from "@/lib/yeastar";
import { CDRRecord } from "@/types/cdr";
import {
  getCachedDays,
  splitRangeIntoDays,
  todayISO,
  DayCache,
} from "@/lib/cache";
import { handleRefresh, fetchDayFull } from "@/lib/day-refresh";

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


export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const customStart = searchParams.get("start");
    const customEnd   = searchParams.get("end");
    const { start, end } = customStart && customEnd
      ? { start: customStart, end: customEnd }
      : getDateRange(searchParams.get("date") ?? "today");

    const forceRefresh = searchParams.get("refresh") === "1";
    const today = todayISO();
    const days  = splitRangeIntoDays(start, end);
    const cachedMap = await getCachedDays(days);

    // Bugun uchun refresh (calls route bilan umumiy cache — bir xil inflight)
    if (forceRefresh && days.includes(today)) {
      await handleRefresh(today, cachedMap);
    }

    // Yo'q tarixiy kunlarni yuklaymiz
    const toFetch = days.filter(d => d !== today && !cachedMap.has(d));
    if (toFetch.length > 0) {
      const CONCURRENCY = 3;
      for (let i = 0; i < toFetch.length; i += CONCURRENCY) {
        const chunk = toFetch.slice(i, i + CONCURRENCY);
        const results = await Promise.allSettled(chunk.map(d => fetchDayFull(d)));
        for (let j = 0; j < chunk.length; j++) {
          if (results[j].status === "fulfilled") {
            cachedMap.set(chunk[j], (results[j] as PromiseFulfilledResult<DayCache>).value);
          }
        }
      }
    }

    // Bugun cache da yo'q bo'lsa
    if (days.includes(today) && !cachedMap.has(today)) {
      try { cachedMap.set(today, await fetchDayFull(today)); } catch { /* xatolik bo'lsa bo'sh */ }
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
