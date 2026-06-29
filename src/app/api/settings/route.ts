import { NextRequest, NextResponse } from "next/server";
import { readSettings, writeSettings } from "@/lib/settings";
import { queryMZEmployees } from "@/lib/moizvonki";
import { AppSettings } from "@/types/unified";
import { getDateRange, queryCDR } from "@/lib/yeastar";
import { CDRRecord } from "@/types/cdr";
import { log, timer } from "@/lib/logger";

function isEmployee(number: string, name: string): boolean {
  if (!number || !name || name === number) return false;
  if (name.toLowerCase().startsWith("automatic")) return false;
  return number.length <= 5;
}

let yeastarEmpCache: { data: { number: string; name: string }[]; at: number } | null = null;

async function fetchYeastarEmployees(): Promise<{ number: string; name: string }[]> {
  if (yeastarEmpCache && Date.now() - yeastarEmpCache.at < 10 * 60 * 1000) {
    log.cache("Settings", `PBX xodimlar cache: ${yeastarEmpCache.data.length} ta`);
    return yeastarEmpCache.data;
  }

  const elapsed = timer();
  log.info("Settings", "PBX xodimlar ro'yxati yuklanmoqda");
  const { start, end } = getDateRange("month");
  const first = await queryCDR(start, end, 1, 500).catch(() => null);
  if (!first || first.errcode !== 0) {
    log.error("Settings", "PBX CDR yuklanmadi");
    return [];
  }

  const map = new Map<string, string>();
  for (const r of first.data ?? []) {
    if (r.call_to_number && isEmployee(r.call_to_number, r.call_to_name)) map.set(r.call_to_number, r.call_to_name);
    if (r.call_from_number && isEmployee(r.call_from_number, r.call_from_name)) map.set(r.call_from_number, r.call_from_name);
  }
  const data = Array.from(map.entries()).map(([number, name]) => ({ number, name })).sort((a, b) => a.name.localeCompare(b.name));
  yeastarEmpCache = { data, at: Date.now() };
  log.ok("Settings", `${data.length} PBX xodim aniqlandi`, { ms: elapsed() });
  return data;
}

export async function GET() {
  const elapsed = timer();
  log.info("API /settings", "Sozlamalar so'ralmoqda");
  const [settings, mzEmployees, yeastarEmployees] = await Promise.all([
    readSettings(),
    queryMZEmployees().catch(() => []),
    fetchYeastarEmployees().catch(() => []),
  ]);
  log.ok("API /settings", `Tayyor: ${(settings as AppSettings).employees?.length ?? 0} bog'liq xodim`, { ms: elapsed() });
  return NextResponse.json({ settings, mzEmployees, yeastarEmployees });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as AppSettings;
  await writeSettings(body);
  log.ok("API /settings", `Saqlandi: ${body.employees?.length ?? 0} xodim`);
  return NextResponse.json({ ok: true });
}
