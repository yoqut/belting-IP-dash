import { NextRequest, NextResponse } from "next/server";
import { queryCDR, getDateRange } from "@/lib/yeastar";
import { CDRRecord } from "@/types/cdr";

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
  total_duration_sec: number;   // barcha qo'ng'iroqlar vaqti (ring+talk)
  total_talk_sec: number;       // faqat suhbat vaqti
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
    const dur = r.duration ?? 0;
    const talk = r.talk_duration ?? 0;

    if (r.call_type === "Inbound") {
      if (r.call_to_number && isEmployee(r.call_to_number, r.call_to_name)) {
        const emp = get(r.call_to_number, r.call_to_name);
        emp.total++;
        emp.inbound++;
        emp.total_duration_sec += dur;
        if (r.disposition === "ANSWERED") {
          emp.inbound_answered++;
          emp.total_talk_sec += talk;
        } else {
          emp.inbound_missed++;
        }
      }
    } else if (r.call_type === "Outbound") {
      if (r.call_from_number && isEmployee(r.call_from_number, r.call_from_name)) {
        const emp = get(r.call_from_number, r.call_from_name);
        emp.total++;
        emp.outbound++;
        emp.total_duration_sec += dur;
        if (r.disposition === "ANSWERED") {
          emp.outbound_success++;
          emp.total_talk_sec += talk;
        } else {
          emp.outbound_failed++;
        }
      }
    }
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

async function fetchAllRecords(start: string, end: string): Promise<CDRRecord[]> {
  const PAGE_SIZE = 500;
  const first = await queryCDR(start, end, 1, PAGE_SIZE);
  if (first.errcode !== 0) throw new Error(first.errmsg || "CDR xatosi");

  const raw = [...(first.data ?? [])];
  const total = first.total_number ?? raw.length;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (totalPages > 1) {
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) => queryCDR(start, end, i + 2, PAGE_SIZE))
    );
    for (const resp of rest) {
      if (resp.errcode === 0 && resp.data) raw.push(...resp.data);
    }
  }
  return raw;
}

interface EmployeeCache { data: EmployeeStat[]; cachedAt: number; permanent: boolean }
const empCache = new Map<string, EmployeeCache>();
const TODAY_TTL = 2 * 60 * 1000;

function getCached(key: string): EmployeeStat[] | null {
  const e = empCache.get(key);
  if (!e) return null;
  if (e.permanent) return e.data;
  if (Date.now() - e.cachedAt < TODAY_TTL) return e.data;
  empCache.delete(key);
  return null;
}

function todayStr(): string {
  const now = new Date();
  return `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const customStart = searchParams.get("start");
    const customEnd = searchParams.get("end");
    const { start, end } = customStart && customEnd
      ? { start: customStart, end: customEnd }
      : getDateRange(searchParams.get("date") ?? "today");

    const cacheKey = `emp|${start}|${end}`;
    const cached = getCached(cacheKey);
    if (cached) return NextResponse.json({ employees: cached, from_cache: true });

    const records = await fetchAllRecords(start, end);
    const employees = buildStats(records);

    const isToday = end.startsWith(todayStr());
    empCache.set(cacheKey, { data: employees, cachedAt: Date.now(), permanent: !isToday });

    return NextResponse.json({ employees });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server xatosi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
