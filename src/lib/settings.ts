import { createClient } from "@supabase/supabase-js";
import { AppSettings, EmployeeLink } from "@/types/unified";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const DEFAULT: AppSettings = { employees: [] };

export async function readSettings(): Promise<AppSettings> {
  const { data, error } = await supabase
    .from("settings")
    .select("value")
    .eq("key", "app")
    .single();
  if (error || !data) return DEFAULT;
  return data.value as AppSettings;
}

export async function writeSettings(s: AppSettings): Promise<void> {
  await supabase
    .from("settings")
    .upsert({ key: "app", value: s }, { onConflict: "key" });
}

export function buildMzEmailMap(s: AppSettings): Map<string, EmployeeLink> {
  const m = new Map<string, EmployeeLink>();
  for (const e of s.employees) if (e.mzEmail) m.set(e.mzEmail, e);
  return m;
}

export function buildYeastarNameMap(s: AppSettings): Map<string, EmployeeLink> {
  const m = new Map<string, EmployeeLink>();
  for (const e of s.employees) if (e.yeastarExtName) m.set(e.yeastarExtName.toLowerCase(), e);
  return m;
}
