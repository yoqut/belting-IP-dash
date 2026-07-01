import { CDRResponse } from "@/types/cdr";
import { createClient } from "@supabase/supabase-js";
import { log, timer } from "@/lib/logger";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const BASE_URL = process.env.YEASTAR_URL?.replace(/\/$/, "") ?? "";
const CLIENT_ID = process.env.YEASTAR_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.YEASTAR_CLIENT_SECRET ?? "";

const COMMON_HEADERS = {
  "Content-Type": "application/json",
  "User-Agent": "YeastarDashboard/1.0",
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function fetchWithTimeout(url: string, options: RequestInit = {}, ms = 15000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

interface TokenCache {
  access_token: string;
  refresh_token: string;
  expiry: number;
}

let memCache: TokenCache | null = null;

async function readTokenKV(): Promise<TokenCache | null> {
  if (memCache && Date.now() < memCache.expiry) return memCache;
  try {
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "yeastar_token")
      .single();
    if (!data?.value) return null;
    const cache = data.value as TokenCache;
    if (Date.now() >= cache.expiry) return null;
    memCache = cache;
    return cache;
  } catch {
    return null;
  }
}

// Expired bo'lsa ham refresh_token ni olish uchun
async function readStoredToken(): Promise<TokenCache | null> {
  if (memCache) return memCache;
  try {
    const { data } = await supabase
      .from("settings")
      .select("value")
      .eq("key", "yeastar_token")
      .single();
    if (!data?.value) return null;
    return data.value as TokenCache;
  } catch {
    return null;
  }
}

async function writeTokenKV(cache: TokenCache): Promise<void> {
  memCache = cache;
  void supabase
    .from("settings")
    .upsert({ key: "yeastar_token", value: cache }, { onConflict: "key" });
}

function saveTokens(access_token: string, refresh_token: string): TokenCache {
  const cache: TokenCache = {
    access_token,
    refresh_token,
    expiry: Date.now() + 25 * 60 * 1000,
  };
  writeTokenKV(cache); // fire-and-forget
  return cache;
}

async function fetchNewToken(): Promise<TokenCache> {
  log.info("yeastar", `Yangi token so'ramoqda: ${BASE_URL}`);
  const res = await fetchWithTimeout(`${BASE_URL}/openapi/v1.0/get_token`, {
    method: "POST",
    headers: COMMON_HEADERS,
    body: JSON.stringify({ username: CLIENT_ID, password: CLIENT_SECRET }),
  });
  log.info("yeastar", `get_token HTTP status: ${res.status} ${res.statusText}`);
  const text = await res.text();
  if (!res.ok || text.trimStart().startsWith("<")) {
    log.error("yeastar", `get_token xato javob (${res.status})`, { body: text.slice(0, 300) });
    throw new Error(`PBX token HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const data = JSON.parse(text);
  log.info("yeastar", `get_token javob: errcode=${data.errcode}`, { errmsg: data.errmsg });
  if (data.errcode !== 0) throw new Error(data.errmsg || "Token olishda xato");
  log.ok("yeastar", "Yangi token olindi");
  return saveTokens(data.access_token, data.refresh_token);
}

async function doRefresh(refreshToken: string): Promise<TokenCache | null> {
  log.info("yeastar", "refresh_token bilan token yangilash");
  const res = await fetchWithTimeout(`${BASE_URL}/openapi/v1.0/refresh_token`, {
    method: "POST",
    headers: COMMON_HEADERS,
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  log.info("yeastar", `refresh_token HTTP status: ${res.status}`);
  const text = await res.text();
  if (!res.ok || text.trimStart().startsWith("<")) {
    log.error("yeastar", `refresh_token xato javob (${res.status})`, { body: text.slice(0, 300) });
    return null;
  }
  const data = JSON.parse(text);
  log.info("yeastar", `refresh_token javob: errcode=${data.errcode}`, { errmsg: data.errmsg });
  if (data.errcode !== 0) return null;
  log.ok("yeastar", "Token yangilandi (refresh)");
  return saveTokens(data.access_token, data.refresh_token);
}

// Parallel token so'rovlarni birlashtirish — Yeastar concurrent session limitiga qarshi
let tokenInflight: Promise<string> | null = null;

export async function getAccessToken(): Promise<string> {
  const cached = await readTokenKV();
  if (cached) return cached.access_token;

  if (tokenInflight) return tokenInflight;

  tokenInflight = (async () => {
    try {
      // Expired bo'lsa ham Supabase dan refresh_token ni olamiz
      const stored = await readStoredToken();
      if (stored?.refresh_token) {
        const refreshed = await doRefresh(stored.refresh_token);
        if (refreshed) return refreshed.access_token;
      }
      // refresh ishlamasa — yangi token (birinchi marta yoki refresh expired)
      const fresh = await fetchNewToken();
      return fresh.access_token;
    } finally {
      tokenInflight = null;
    }
  })();

  return tokenInflight;
}

export interface ExtensionInfo {
  number: string;
  name: string;
}

export async function queryExtensions(): Promise<ExtensionInfo[]> {
  const token = await getAccessToken();
  const results: ExtensionInfo[] = [];
  const PAGE_SIZE = 100;

  const fetchPage = async (page: number) => {
    const params = new URLSearchParams({
      access_token: token,
      page_number: String(page),
      page_size: String(PAGE_SIZE),
    });
    const res = await fetchWithTimeout(
      `${BASE_URL}/openapi/v1.0/extension/list?${params.toString()}`,
      { headers: COMMON_HEADERS }
    );
    if (!res.ok) return null;
    return res.json().catch(() => null);
  };

  const first = await fetchPage(1);
  if (!first || first.errcode !== 0) return [];

  for (const e of first.data ?? []) {
    if (e.number && e.caller_id_name) results.push({ number: e.number, name: e.caller_id_name });
  }

  const total = first.total_number ?? (first.data?.length ?? 0);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (totalPages > 1) {
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) => fetchPage(i + 2))
    );
    for (const data of rest) {
      if (!data || data.errcode !== 0) continue;
      for (const e of data.data ?? []) {
        if (e.number && e.caller_id_name) results.push({ number: e.number, name: e.caller_id_name });
      }
    }
  }

  return results.sort((a, b) => a.name.localeCompare(b.name));
}

export async function queryCDR(
  startTime: string,
  endTime: string,
  pageNumber = 1,
  pageSize = 100
): Promise<CDRResponse> {
  const elapsed = timer();
  const token = await getAccessToken();
  log.info("yeastar", `CDR so'rov sahifa=${pageNumber}`, { startTime, endTime, pageSize });

  const params = new URLSearchParams({
    access_token: token,
    start_time: startTime,
    end_time: endTime,
    page_number: String(pageNumber),
    page_size: String(pageSize),
  });

  const url = `${BASE_URL}/openapi/v1.0/cdr/search?${params.toString()}`;
  const res = await fetchWithTimeout(url, { headers: COMMON_HEADERS }, 30000);

  if (!res.ok) {
    log.error("yeastar", `CDR HTTP xato: ${res.status}`, { startTime, endTime });
    throw new Error(`CDR so'rovda xato: ${res.status}`);
  }
  const data: CDRResponse = await res.json();
  log.info("yeastar", `CDR javob sahifa=${pageNumber}: errcode=${data.errcode}, jami=${data.total_number}, olingan=${data.data?.length ?? 0}`, { ms: elapsed(), errmsg: data.errmsg || undefined });
  return data;
}

// Yeastar CDR API bir so'rovda maksimal 30 kun qabul qiladi.
// Katta oraliqlarni 30 kunlik bo'laklarga bo'lib parallel yuboramiz.
const CDR_CHUNK_DAYS = 30;

export async function queryCDRChunked(
  startTime: string,
  endTime: string,
  pageSize = 100
): Promise<CDRResponse> {
  const startMs = parsePBXDate(startTime).getTime();
  const endMs = parsePBXDate(endTime).getTime();
  const chunkMs = CDR_CHUNK_DAYS * 24 * 60 * 60 * 1000;

  // Oraliq 30 kundan kichik bo'lsa sahifama-sahifa ketma-ket yuboramiz
  // (Yeastar bir token bilan parallel sahifa so'rovlarni rad etadi)
  if (endMs - startMs <= chunkMs) {
    const first = await queryCDR(startTime, endTime, 1, pageSize);
    if (first.errcode !== 0) return first;
    const records = [...(first.data ?? [])];
    const total = first.total_number ?? records.length;
    const pages = Math.ceil(total / pageSize);
    // Ketma-ket (sequential) — parallel emas
    for (let p = 2; p <= pages; p++) {
      const resp = await queryCDR(startTime, endTime, p, pageSize);
      if (resp.errcode !== 0) {
        // Qisman ma'lumot saqlanmasligi uchun — xato sifatida qaytaramiz
        return { errcode: resp.errcode, errmsg: `Sahifa ${p} xatosi: ${resp.errmsg}`, total_number: records.length, data: records };
      }
      if (resp.data) records.push(...resp.data);
    }
    return { errcode: 0, errmsg: "OK", total_number: records.length, data: records };
  }

  // Katta oraliq: chunk-larga bo'lib ketma-ket yuboramiz
  const chunks: { start: string; end: string }[] = [];
  let cursor = startMs;
  while (cursor < endMs) {
    const chunkEnd = Math.min(cursor + chunkMs - 1, endMs);
    chunks.push({ start: formatPBXDate(new Date(cursor)), end: formatPBXDate(new Date(chunkEnd)) });
    cursor += chunkMs;
  }
  const allRecs: NonNullable<CDRResponse["data"]> = [];
  for (const c of chunks) {
    const r = await queryCDRChunked(c.start, c.end, pageSize);
    if (r.errcode === 0 && r.data) allRecs.push(...r.data);
  }
  return { errcode: 0, errmsg: "OK", total_number: allRecs.length, data: allRecs };
}

// "DD/MM/YYYY HH:mm:ss" → Date (UTC+5 ga mos)
function parsePBXDate(s: string): Date {
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})/);
  if (!m) return new Date(0);
  return new Date(`${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:${m[6]}+05:00`);
}

export interface RecordingInfo {
  uid: string;
  rec_id: number;
}

export async function queryRecordingsByCallers(
  _callers: string[],
  startUnix: number,
  endUnix: number
): Promise<Map<string, number>> {
  const token = await getAccessToken();
  const uidMap = new Map<string, number>();
  const PAGE_SIZE = 200;

  const fetchPage = async (page: number) => {
    const params = new URLSearchParams({
      access_token: token,
      start_time: String(startUnix),
      end_time: String(endUnix),
      page_number: String(page),
      page_size: String(PAGE_SIZE),
    });
    const res = await fetchWithTimeout(
      `${BASE_URL}/openapi/v1.0/recording/search?${params.toString()}`,
      { headers: COMMON_HEADERS }
    ).catch(() => null);
    if (!res?.ok) return null;
    return res.json().catch(() => null);
  };

  const first = await fetchPage(1);
  if (!first || first.errcode !== 0) return uidMap;

  for (const r of first.data ?? []) {
    if (r.size > 0) uidMap.set(r.uid, r.id);
  }

  const total = first.total_number ?? (first.data?.length ?? 0);
  const totalPages = Math.ceil(total / PAGE_SIZE);

  if (totalPages > 1) {
    const rest = await Promise.all(
      Array.from({ length: totalPages - 1 }, (_, i) => fetchPage(i + 2))
    );
    for (const data of rest) {
      if (!data || data.errcode !== 0) continue;
      for (const r of data.data ?? []) {
        if (r.size > 0) uidMap.set(r.uid, r.id);
      }
    }
  }

  return uidMap;
}

export async function getRecordingDownloadUrl(recId: number): Promise<string | null> {
  const token = await getAccessToken();

  const params = new URLSearchParams({ access_token: token, id: String(recId) });
  const res = await fetchWithTimeout(
    `${BASE_URL}/openapi/v1.0/recording/download?${params.toString()}`,
    { headers: COMMON_HEADERS }
  );

  if (!res.ok) return null;
  const data = await res.json();
  if (data.errcode !== 0 || !data.download_resource_url) return null;

  return `${BASE_URL}${data.download_resource_url}`;
}

export function formatPBXDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  );
}

export function getDateRange(filter: string): { start: string; end: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let start: Date;
  let end: Date;

  switch (filter) {
    case "week": {
      const day = today.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      start = new Date(today);
      start.setDate(today.getDate() + diff);
      end = new Date(now);
      break;
    }
    case "month":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now);
      break;
    case "year":
      start = new Date(now.getFullYear(), 0, 1);
      end = new Date(now);
      break;
    default:
      start = today;
      end = new Date(now);
  }

  end.setHours(23, 59, 59, 0);
  return { start: formatPBXDate(start), end: formatPBXDate(end) };
}
