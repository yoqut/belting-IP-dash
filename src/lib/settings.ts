import fs from "fs";
import path from "path";
import { AppSettings, EmployeeLink } from "@/types/unified";

const SETTINGS_FILE = path.join(process.cwd(), "data", "settings.json");

const DEFAULT: AppSettings = { employees: [] };

export function readSettings(): AppSettings {
  try {
    return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8")) as AppSettings;
  } catch {
    return DEFAULT;
  }
}

export function writeSettings(s: AppSettings): void {
  const dir = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 2), "utf-8");
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
