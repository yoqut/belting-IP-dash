import { CDRResponse } from "@/types/cdr";
import fs from "fs";
import path from "path";

// Yeastar uses a self-signed certificate on the local network
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const BASE_URL = process.env.YEASTAR_URL?.replace(/\/$/, "") ?? "";
const CLIENT_ID = process.env.YEASTAR_CLIENT_ID ?? "";
const CLIENT_SECRET = process.env.YEASTAR_CLIENT_SECRET ?? "";

const COMMON_HEADERS = {
  "Content-Type": "application/json",
  "User-Agent": "YeastarDashboard/1.0",
};

function fetchWithTimeout(url: string, options: RequestInit = {}, ms = 15000): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...options, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

// Token faylda saqlanadi — server qayta ishlaganda ham yo'qolmaydi
const TOKEN_FILE = path.join(process.cwd(), ".yeastar-token.json");

interface TokenCache {
  access_token: string;
  refresh_token: string;
  expiry: number;
}

function readTokenFile(): TokenCache | null {
  try {
    const raw = fs.readFileSync(TOKEN_FILE, "utf-8");
    return JSON.parse(raw) as TokenCache;
  } catch {
    return null;
  }
}

function writeTokenFile(cache: TokenCache): void {
  try {
    fs.writeFileSync(TOKEN_FILE, JSON.stringify(cache), "utf-8");
  } catch {
    // faylga yozib bo'lmasa, in-memory davom etadi
  }
}

let memCache: TokenCache | null = readTokenFile();

function saveTokens(access_token: string, refresh_token: string): void {
  memCache = { access_token, refresh_token, expiry: Date.now() + 25 * 60 * 1000 };
  writeTokenFile(memCache);
}

async function fetchNewToken(): Promise<void> {
  const res = await fetchWithTimeout(`${BASE_URL}/openapi/v1.0/get_token`, {
    method: "POST",
    headers: COMMON_HEADERS,
    body: JSON.stringify({ username: CLIENT_ID, password: CLIENT_SECRET }),
  });

  const data = await res.json();
  if (data.errcode !== 0) throw new Error(data.errmsg || "Token olishda xato");
  saveTokens(data.access_token, data.refresh_token);
}

async function doRefresh(refreshToken: string): Promise<boolean> {
  const res = await fetchWithTimeout(`${BASE_URL}/openapi/v1.0/refresh_token`, {
    method: "POST",
    headers: COMMON_HEADERS,
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  const data = await res.json();
  if (data.errcode !== 0) return false;

  saveTokens(data.access_token, data.refresh_token);
  return true;
}

export async function getAccessToken(): Promise<string> {
  // Fayl yoki memorydagi token hali amal qilsa — ishlatamiz
  if (memCache && Date.now() < memCache.expiry) return memCache.access_token;

  // Refresh token bilan yangilaymiz (limit sanalmaydi)
  if (memCache?.refresh_token) {
    const ok = await doRefresh(memCache.refresh_token);
    if (ok) return memCache!.access_token;
  }

  // Oxirgi chora — yangi token (limit sanaydi)
  await fetchNewToken();
  return memCache!.access_token;
}

export async function queryCDR(
  startTime: string,
  endTime: string,
  pageNumber = 1,
  pageSize = 500
): Promise<CDRResponse> {
  const token = await getAccessToken();

  const params = new URLSearchParams({
    access_token: token,
    start_time: startTime,
    end_time: endTime,
    page_number: String(pageNumber),
    page_size: String(pageSize),
  });

  const res = await fetchWithTimeout(
    `${BASE_URL}/openapi/v1.0/cdr/search?${params.toString()}`,
    { headers: COMMON_HEADERS }
  );

  if (!res.ok) throw new Error(`CDR so'rovda xato: ${res.status}`);
  return res.json();
}

export interface RecordingInfo {
  uid: string;
  rec_id: number;
}

// Barcha yozuvlarni bir so'rovda olib, uid → rec_id xaritasini qaytaradi
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
  // Yeastar P-Series Software Edition: "DD/MM/YYYY HH:mm:ss"
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
    default: // today
      start = today;
      end = new Date(now);
  }

  end.setHours(23, 59, 59, 0);
  return { start: formatPBXDate(start), end: formatPBXDate(end) };
}
