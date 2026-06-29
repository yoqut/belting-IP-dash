import { NextRequest, NextResponse } from "next/server";
import { queryCDR, queryRecordingsByCallers, getDateRange, formatPBXDate } from "@/lib/yeastar";
import { queryMZCalls } from "@/lib/moizvonki";
import { readSettings, buildMzEmailMap, buildYeastarNameMap } from "@/lib/settings";
import { UnifiedCall, UnifiedStats, EmployeeLink } from "@/types/unified";
import { CDRRecord } from "@/types/cdr";
import { MZCall } from "@/types/moizvonki";
import { log, timer } from "@/lib/logger";

function pbxToUnix(pbxDate: string): number {
  const m = pbxDate.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})/);
  if (!m) return 0;
  return Math.floor(new Date(`${m[3]}-${m[2]}-${m[1]}T${m[4]}:${m[5]}:${m[6]}`).getTime() / 1000);
}

function todayDateStr(): string {
  const n = new Date();
  return `${String(n.getDate()).padStart(2,"0")}/${String(n.getMonth()+1).padStart(2,"0")}/${n.getFullYear()}`;
}
function todayStartPBX(): string {
  const d = new Date(); d.setHours(0,0,0,0); return formatPBXDate(d);
}
function yesterdayEndPBX(): string {
  const d = new Date(); d.setDate(d.getDate()-1); d.setHours(23,59,59,0); return formatPBXDate(d);
}
const endsToday = (end: string) => end.startsWith(todayDateStr());
const startsToday = (start: string) => start.startsWith(todayDateStr());

const TRUNK_LINES = new Set(["781223344", "781507500", "787771188", "787773322"]);

function yeastarToUnified(r: CDRRecord & { rec_id: number | null }, nameMap: Map<string, EmployeeLink>): UnifiedCall {
  const isIn = r.call_type === "Inbound";
  const isOut = r.call_type === "Outbound";
  const rawEmpName = isIn ? r.call_to_name : r.call_from_name;
  const emp = rawEmpName ? nameMap.get(rawEmpName.toLowerCase()) : undefined;
  const clientNumber = isIn ? (r.call_from_number ?? "") : (r.call_to_number ?? "");
  const clientName = isIn ? (r.call_from_name ?? "") : (r.call_to_name ?? "");

  // Trunk: kiruvchi = src_trunk, chiquvchi = dst_trunk
  const trunkCandidate = isIn ? (r.src_trunk ?? "") : (r.dst_trunk ?? "");
  const trunkLine = TRUNK_LINES.has(trunkCandidate) ? trunkCandidate : undefined;

  return {
    id: `pbx_${r.uid}`,
    timeUnix: pbxToUnix(r.time ?? ""),
    direction: isIn ? "inbound" : isOut ? "outbound" : "internal",
    employeeName: emp?.displayName ?? rawEmpName ?? "—",
    clientNumber,
    clientName: clientName === rawEmpName ? "" : clientName,
    answered: r.disposition === "ANSWERED",
    duration: r.duration ?? 0,
    recordingUrl: r.rec_id ? `/api/recording?id=${r.rec_id}` : null,
    recId: r.rec_id ?? undefined,
    channel: "pbx",
    trunkLine,
  };
}

function mzToUnified(c: MZCall, emailMap: Map<string, EmployeeLink>): UnifiedCall {
  const emp = c.user_account ? emailMap.get(c.user_account) : undefined;
  return {
    id: `sim_${c.db_call_id}`,
    timeUnix: c.start_time,
    direction: c.direction === 0 ? "inbound" : "outbound",
    employeeName: emp?.displayName ?? c.user_account ?? "—",
    clientNumber: c.client_number ?? "",
    clientName: c.client_name ?? "",
    answered: c.answered === 1,
    duration: c.duration ?? 0,
    recordingUrl: c.recording || null,
    channel: "sim",
  };
}

function computeStats(calls: UnifiedCall[]): UnifiedStats {
  const s: UnifiedStats = { all: calls.length, inbound: 0, answered: 0, missed: 0, outbound: 0, outbound_success: 0, outbound_failed: 0, internal: 0 };
  for (const c of calls) {
    if (c.direction === "inbound") { s.inbound++; c.answered ? s.answered++ : s.missed++; }
    else if (c.direction === "outbound") { s.outbound++; c.answered ? s.outbound_success++ : s.outbound_failed++; }
    else s.internal++;
  }
  return s;
}

// Bir xil uid ga ega bir nechta CDR leg bo'lishi mumkin (ring group → xodim)
// Har bir uid dan faqat asosiy yozuvni qoldiramiz: talk_duration eng ko'p bo'lgan
function deduplicateCDR(records: (CDRRecord & { rec_id: number | null })[]): (CDRRecord & { rec_id: number | null })[] {
  const byUid = new Map<string, (CDRRecord & { rec_id: number | null })[]>();
  for (const r of records) {
    const arr = byUid.get(r.uid) ?? [];
    arr.push(r);
    byUid.set(r.uid, arr);
  }
  const result: (CDRRecord & { rec_id: number | null })[] = [];
  for (const legs of byUid.values()) {
    if (legs.length === 1) { result.push(legs[0]); continue; }
    // talk_duration eng ko'p bo'lgan leg — haqiqiy gaplashgan xodim
    legs.sort((a, b) => (b.talk_duration ?? 0) - (a.talk_duration ?? 0));
    result.push(legs[0]);
  }
  return result;
}

async function fetchRange(start: string, end: string): Promise<(CDRRecord & { rec_id: number | null })[]> {
  const PAGE = 500;
  const elapsed = timer();
  log.info("PBX", `CDR yuklanmoqda`, { start, end });
  const [first, recMap] = await Promise.all([
    queryCDR(start, end, 1, PAGE),
    queryRecordingsByCallers([], pbxToUnix(start), pbxToUnix(end)),
  ]);
  if (first.errcode !== 0) {
    log.error("PBX", `CDR xatosi`, { errcode: first.errcode, errmsg: first.errmsg });
    return [];
  }
  const raw = [...(first.data ?? [])];
  const pages = Math.ceil((first.total_number ?? raw.length) / PAGE);
  if (pages > 1) {
    log.info("PBX", `Yana ${pages - 1} sahifa parallel yuklanmoqda`);
    const rest = await Promise.all(Array.from({ length: pages - 1 }, (_, i) => queryCDR(start, end, i + 2, PAGE)));
    for (const r of rest) if (r.errcode === 0 && r.data) raw.push(...r.data);
  }
  const withRec = raw.map(r => ({ ...r, rec_id: recMap.get(r.uid) ?? null }));
  const deduped = deduplicateCDR(withRec);
  log.ok("PBX", `${raw.length} CDR → ${deduped.length} (deduplikatsiya)`, { pages, ms: elapsed() });
  return deduped;
}

async function fetchAllUnified(start: string, end: string): Promise<UnifiedCall[]> {
  const elapsed = timer();
  log.info("Calls", `To'liq yuklash boshlandi`, { start, end });
  const settings = await readSettings();
  const nameMap = buildYeastarNameMap(settings);
  const emailMap = buildMzEmailMap(settings);
  const [yRes, mzRes] = await Promise.allSettled([
    fetchRange(start, end),
    queryMZCalls(pbxToUnix(start), pbxToUnix(end)),
  ]);
  if (yRes.status === "rejected") log.error("Calls", "PBX yuklash muvaffaqiyatsiz", { error: String(yRes.reason) });
  if (mzRes.status === "rejected") log.error("Calls", "MZ yuklash muvaffaqiyatsiz", { error: String(mzRes.reason) });
  const yCalls = yRes.status === "fulfilled" ? yRes.value : [];
  const mzCalls = mzRes.status === "fulfilled" ? mzRes.value : [];
  const calls = [
    ...yCalls.map(r => yeastarToUnified(r, nameMap)),
    ...mzCalls.map(c => mzToUnified(c, emailMap)),
  ].sort((a, b) => b.timeUnix - a.timeUnix);
  log.ok("Calls", `Jami ${calls.length} qo'ng'iroq (PBX: ${yCalls.length}, SIM: ${mzCalls.length})`, { ms: elapsed() });
  return calls;
}

// Split cache: tarix = doimiy, bugun = 2 daqiqa
// v2 = trunkLine qo'shildi — eski keshni bekor qilish uchun
const CACHE_VERSION = "v2";
interface CacheEntry { calls: UnifiedCall[]; stats: UnifiedStats; cachedAt: number; permanent: boolean; }
const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<UnifiedCall[]>>();
const TODAY_TTL = 2 * 60 * 1000;

function getCached(key: string): CacheEntry | null {
  const e = cache.get(key);
  if (!e) return null;
  if (e.permanent) return e;
  if (Date.now() - e.cachedAt < TODAY_TTL) return e;
  cache.delete(key); return null;
}

function setCache(key: string, calls: UnifiedCall[], permanent: boolean) {
  cache.set(key, { calls, stats: computeStats(calls), cachedAt: Date.now(), permanent });
  log.cache("Calls", `Saqlandi (${permanent ? "doimiy" : "2 daqiqa"}): ${calls.length} ta`);
}

async function getOrFetch(start: string, end: string, permanent: boolean): Promise<UnifiedCall[]> {
  const key = `${CACHE_VERSION}|${start}|${end}`;
  const hit = getCached(key);
  if (hit) {
    const age = hit.permanent ? "doimiy" : `${Math.round((Date.now() - hit.cachedAt) / 1000)}s oldin`;
    log.cache("Calls", `Cache (${age}): ${hit.calls.length} ta`);
    return hit.calls;
  }
  if (inflight.has(key)) log.info("Calls", "Yuklash davom etmoqda, kutilmoqda...");
  let p = inflight.get(key);
  if (!p) {
    p = fetchAllUnified(start, end).then(calls => {
      setCache(key, calls, permanent);
      inflight.delete(key);
      return calls;
    }).catch(err => { inflight.delete(key); throw err; });
    inflight.set(key, p);
  }
  return p;
}

export async function GET(req: NextRequest) {
  const elapsed = timer();
  try {
    const { searchParams } = req.nextUrl;
    const customStart = searchParams.get("start");
    const customEnd = searchParams.get("end");
    const { start, end } = customStart && customEnd
      ? { start: customStart, end: customEnd }
      : getDateRange(searchParams.get("date") ?? "today");

    const isOnlyToday = startsToday(start) && endsToday(end);
    const needsSplit = endsToday(end) && !startsToday(start);
    // Quick rejim faqat bugungi sana uchun — tarixiy sanalar uchun to'liq yuklash
    const quick = searchParams.get("quick") === "1" && (isOnlyToday || needsSplit);

    log.info("API /calls", `So'rov: ${quick ? "quick" : "to'liq"}`, { start, end });

    if (quick) {
      const settings = await readSettings();
      const nameMap = buildYeastarNameMap(settings);
      const emailMap = buildMzEmailMap(settings);

      const [firstCDR, mzCalls] = await Promise.allSettled([
        queryCDR(start, end, 1, 500),
        queryMZCalls(pbxToUnix(start), pbxToUnix(end)),
      ]);

      const yRaw = firstCDR.status === "fulfilled" && firstCDR.value.errcode === 0
        ? (firstCDR.value.data ?? []).map(r => ({ ...r, rec_id: null as null })) : [];
      const total = firstCDR.status === "fulfilled" ? (firstCDR.value.total_number ?? yRaw.length) : yRaw.length;
      const hasMore = total > 500;
      const mz = mzCalls.status === "fulfilled" ? mzCalls.value : [];

      const calls = [
        ...yRaw.map(r => yeastarToUnified(r, nameMap)),
        ...mz.map(c => mzToUnified(c, emailMap)),
      ].sort((a, b) => b.timeUnix - a.timeUnix);

      log.ok("API /calls", `Quick javob: ${calls.length} ta${hasMore ? " (yana bor)" : ""}`, { ms: elapsed() });

      const cacheKey = `${CACHE_VERSION}|${start}|${end}`;
      if (!inflight.has(cacheKey) && !getCached(cacheKey)) {
        log.info("API /calls", "Fonda to'liq yuklash boshlanmoqda");
        if (needsSplit) {
          Promise.allSettled([
            getOrFetch(start, yesterdayEndPBX(), true),
            getOrFetch(todayStartPBX(), end, false),
          ]).catch(() => {});
        } else {
          const p = fetchAllUnified(start, end).then(c => {
            setCache(cacheKey, c, !isOnlyToday && !needsSplit);
            inflight.delete(cacheKey);
            return c;
          }).catch(() => { inflight.delete(cacheKey); return []; });
          inflight.set(cacheKey, p);
        }
      }

      return NextResponse.json({ calls, stats: computeStats(calls), has_more: hasMore });
    }

    let calls: UnifiedCall[];
    if (needsSplit) {
      log.info("API /calls", "Split cache: tarix + bugun");
      const [hist, today] = await Promise.all([
        getOrFetch(start, yesterdayEndPBX(), true),
        getOrFetch(todayStartPBX(), end, false),
      ]);
      calls = [...hist, ...today].sort((a, b) => b.timeUnix - a.timeUnix);
    } else {
      calls = await getOrFetch(start, end, !isOnlyToday);
    }

    log.ok("API /calls", `To'liq javob: ${calls.length} ta`, { ms: elapsed() });
    return NextResponse.json({ calls, stats: computeStats(calls), has_more: false });
  } catch (err: unknown) {
    log.error("API /calls", `Xato`, { error: err instanceof Error ? err.message : String(err), ms: elapsed() });
    return NextResponse.json({ error: err instanceof Error ? err.message : "Xato" }, { status: 500 });
  }
}

export function formatPBXDateFromDate(d: Date): string {
  return formatPBXDate(d);
}
