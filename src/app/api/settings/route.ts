import { NextRequest, NextResponse } from "next/server";
import { readSettings, writeSettings } from "@/lib/settings";
import { queryMZEmployees } from "@/lib/moizvonki";
import { AppSettings } from "@/types/unified";
import { queryExtensions } from "@/lib/yeastar";
import { log, timer } from "@/lib/logger";

let yeastarEmpCache: { data: { number: string; name: string }[]; at: number } | null = null;

async function fetchYeastarEmployees(): Promise<{ number: string; name: string }[]> {
  if (yeastarEmpCache && Date.now() - yeastarEmpCache.at < 10 * 60 * 1000) {
    log.cache("Settings", `PBX xodimlar cache: ${yeastarEmpCache.data.length} ta`);
    return yeastarEmpCache.data;
  }

  const elapsed = timer();
  log.info("Settings", "PBX extension ro'yxati yuklanmoqda");
  const data = await queryExtensions();
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
