import { NextRequest, NextResponse } from "next/server";
import { readSettings, writeSettings } from "@/lib/settings";
import { queryMZEmployees } from "@/lib/moizvonki";
import { AppSettings } from "@/types/unified";
import { log, timer } from "@/lib/logger";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fetchYeastarEmployees(): Promise<{ number: string; name: string }[]> {
  const { data } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "yeastar_employees")
    .single();
  return (data?.value as { number: string; name: string }[]) ?? [];
}

export async function GET() {
  const elapsed = timer();
  const [settings, mzEmployees, yeastarEmployees] = await Promise.all([
    readSettings(),
    queryMZEmployees().catch(() => []),
    fetchYeastarEmployees().catch(() => []),
  ]);
  log.ok("API /settings", `Tayyor`, { ms: elapsed() });
  return NextResponse.json({ settings, mzEmployees, yeastarEmployees });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as AppSettings;
  await writeSettings(body);
  log.ok("API /settings", `Saqlandi: ${body.employees?.length ?? 0} xodim`);
  return NextResponse.json({ ok: true });
}
