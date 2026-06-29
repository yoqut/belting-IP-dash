// Mahalliy kompyuterdan ishga tushiriladi: node scripts/sync-employees.mjs
// Yeastar xodimlarini Supabase'ga saqlaydi

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

// .env.local dan o'qish
const envPath = resolve(process.cwd(), ".env.local");
const env = Object.fromEntries(
  readFileSync(envPath, "utf-8")
    .split("\n")
    .filter(l => l.includes("=") && !l.startsWith("#"))
    .map(l => l.split("=").map(s => s.trim()))
    .map(([k, ...v]) => [k, v.join("=").replace(/^"|"$/g, "")])
);

const YEASTAR_URL = env.YEASTAR_URL?.replace(/\/$/, "");
const CLIENT_ID = env.YEASTAR_CLIENT_ID;
const CLIENT_SECRET = env.YEASTAR_CLIENT_SECRET;
const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function getToken() {
  const res = await fetch(`${YEASTAR_URL}/openapi/v1.0/get_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: CLIENT_ID, password: CLIENT_SECRET }),
  });
  const data = await res.json();
  if (data.errcode !== 0) throw new Error(`Token xatosi: ${data.errmsg}`);
  return data.access_token;
}

function isEmployee(number, name) {
  if (!number || !name || name === number) return false;
  if (name.toLowerCase().startsWith("automatic")) return false;
  return number.length <= 5;
}

async function fetchEmployees(token) {
  const params = new URLSearchParams({
    access_token: token,
    start_time: "01/06/2026 00:00:00",
    end_time: "30/06/2026 23:59:59",
    page_number: "1",
    page_size: "500",
  });
  const res = await fetch(`${YEASTAR_URL}/openapi/v1.0/cdr/search?${params}`);
  const data = await res.json();
  if (data.errcode !== 0) throw new Error(`CDR xatosi: ${data.errmsg}`);

  const map = new Map();
  for (const r of data.data ?? []) {
    if (r.call_to_number && isEmployee(r.call_to_number, r.call_to_name)) map.set(r.call_to_number, r.call_to_name);
    if (r.call_from_number && isEmployee(r.call_from_number, r.call_from_name)) map.set(r.call_from_number, r.call_from_name);
  }
  return Array.from(map.entries())
    .map(([number, name]) => ({ number, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

async function main() {
  console.log("Yeastar'ga ulanilmoqda...");
  const token = await getToken();
  console.log("Token olindi. CDR yuklanmoqda...");
  const employees = await fetchEmployees(token);
  console.log(`${employees.length} ta xodim topildi:`, employees.map(e => `${e.name} (${e.number})`).join(", "));

  const { error } = await supabase
    .from("settings")
    .upsert({ key: "yeastar_employees", value: employees }, { onConflict: "key" });

  if (error) throw new Error(`Supabase xatosi: ${error.message}`);
  console.log("✓ Supabase'ga saqlandi!");
}

main().catch(e => { console.error("Xato:", e.message); process.exit(1); });
