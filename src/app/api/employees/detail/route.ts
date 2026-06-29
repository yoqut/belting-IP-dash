import { NextRequest, NextResponse } from "next/server";
import { queryCDRChunked, getDateRange } from "@/lib/yeastar";
import { CDRRecord } from "@/types/cdr";

export interface DayBucket {
  date: string; // "DD/MM/YYYY"
  inbound: number;
  inbound_answered: number;
  inbound_missed: number;
  outbound: number;
  outbound_success: number;
  outbound_failed: number;
  talk_sec: number;
}

export interface EmployeeDetail {
  number: string;
  name: string;
  // Umumiy KPI
  total: number;
  inbound: number;
  inbound_answered: number;
  inbound_missed: number;
  outbound: number;
  outbound_success: number;
  outbound_failed: number;
  total_talk_sec: number;
  total_duration_sec: number;
  // Kunlik taqsimot
  days: DayBucket[];
  // So'nggi qo'ng'iroqlar
  recent_calls: CDRRecord[];
}

function parseDate(pbx: string): string {
  // "DD/MM/YYYY HH:mm:ss" → "DD/MM/YYYY"
  return pbx?.slice(0, 10) ?? "";
}

async function fetchAllRecords(start: string, end: string): Promise<CDRRecord[]> {
  const resp = await queryCDRChunked(start, end);
  if (resp.errcode !== 0) throw new Error(resp.errmsg || "CDR xatosi");
  return resp.data ?? [];
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const number = searchParams.get("number");
    if (!number) return NextResponse.json({ error: "number kerak" }, { status: 400 });

    const customStart = searchParams.get("start");
    const customEnd = searchParams.get("end");
    const { start, end } = customStart && customEnd
      ? { start: customStart, end: customEnd }
      : getDateRange("today");

    const allRecords = await fetchAllRecords(start, end);

    // Faqat shu xodimga tegishli yozuvlar
    const records = allRecords.filter(r => {
      if (r.call_type === "Inbound") return r.call_to_number === number;
      if (r.call_type === "Outbound") return r.call_from_number === number;
      return false;
    });

    // Kunlik taqsimot
    const dayMap = new Map<string, DayBucket>();
    function getDay(date: string): DayBucket {
      if (!dayMap.has(date)) {
        dayMap.set(date, {
          date,
          inbound: 0, inbound_answered: 0, inbound_missed: 0,
          outbound: 0, outbound_success: 0, outbound_failed: 0,
          talk_sec: 0,
        });
      }
      return dayMap.get(date)!;
    }

    let total = 0, inbound = 0, inbound_answered = 0, inbound_missed = 0;
    let outbound = 0, outbound_success = 0, outbound_failed = 0;
    let total_talk_sec = 0, total_duration_sec = 0;
    let empName = number;

    for (const r of records) {
      const date = parseDate(r.time);
      const day = getDay(date);
      total++;
      total_duration_sec += r.duration ?? 0;

      if (r.call_type === "Inbound") {
        empName = r.call_to_name || empName;
        inbound++;
        day.inbound++;
        if (r.disposition === "ANSWERED") {
          inbound_answered++;
          day.inbound_answered++;
          total_talk_sec += r.talk_duration ?? 0;
          day.talk_sec += r.talk_duration ?? 0;
        } else {
          inbound_missed++;
          day.inbound_missed++;
        }
      } else if (r.call_type === "Outbound") {
        empName = r.call_from_name || empName;
        outbound++;
        day.outbound++;
        if (r.disposition === "ANSWERED") {
          outbound_success++;
          day.outbound_success++;
          total_talk_sec += r.talk_duration ?? 0;
          day.talk_sec += r.talk_duration ?? 0;
        } else {
          outbound_failed++;
          day.outbound_failed++;
        }
      }
    }

    const days = Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    const recent_calls = [...records]
      .sort((a, b) => (b.time ?? "").localeCompare(a.time ?? ""))
      .slice(0, 50);

    const detail: EmployeeDetail = {
      number, name: empName,
      total, inbound, inbound_answered, inbound_missed,
      outbound, outbound_success, outbound_failed,
      total_talk_sec, total_duration_sec,
      days, recent_calls,
    };

    return NextResponse.json(detail);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server xatosi";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
