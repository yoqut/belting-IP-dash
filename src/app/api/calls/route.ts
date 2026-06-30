import { NextRequest, NextResponse } from "next/server";
import { queryCDRChunked, queryRecordingsByCallers, getDateRange } from "@/lib/yeastar";
import { queryMZCalls } from "@/lib/moizvonki";
import { readSettings, buildMzEmailMap, buildYeastarNameMap } from "@/lib/settings";
import { UnifiedCall, UnifiedStats, EmployeeLink } from "@/types/unified";
import { CDRRecord } from "@/types/cdr";
import { MZCall } from "@/types/moizvonki";
import { log, timer } from "@/lib/logger";
import {
  getCachedDays,
  setCachedDay,
  deleteCachedDay,
  splitRangeIntoDays,
  isoToPBXRange,
  isoToUnixRange,
  todayISO,
  parsePBXDate,
  getInflight,
  setInflight,
  DayCache,
} from "@/lib/cache";
import { handleRefresh } from "@/lib/day-refresh";

// ── Recording map in-memory cache (2 daqiqa TTL) ──────────────────────────
let recMapCache: { map: Map<string, number>; isoDate: string; cachedAt: number } | null = null;
const REC_TTL_MS = 2 * 60 * 1000;

async function getRecordingMap(isoDate: string): Promise<Map<string, number>> {
  if (recMapCache && recMapCache.isoDate === isoDate && Date.now() - recMapCache.cachedAt < REC_TTL_MS) {
    return recMapCache.map;
  }
  const { from, to } = isoToUnixRange(isoDate);
  // 5 soniya ichida javob kelmasa — bo'sh qaytaramiz (CDR ni bloklamamiz)
  const map = await Promise.race([
    queryRecordingsByCallers([], from, to),
    new Promise<Map<string, number>>(resolve => setTimeout(() => resolve(new Map()), 5000)),
  ]).catch(() => new Map<string, number>());
  recMapCache = { map, isoDate, cachedAt: Date.now() };
  return map;
}

// ── Konversiya ─────────────────────────────────────────────────────────────

function pbxToUnix(s: string): number {
  return Math.floor(parsePBXDate(s).getTime() / 1000);
}

const TRUNK_LINES = new Set(["781223344", "781507500", "787771188", "787773322"]);

function yeastarToUnified(
  r: CDRRecord & { rec_id: number | null },
  nameMap: Map<string, EmployeeLink>
): UnifiedCall {
  const isIn  = r.call_type === "Inbound";
  const isOut = r.call_type === "Outbound";
  const rawEmpName  = isIn ? r.call_to_name   : r.call_from_name;
  const emp = rawEmpName ? nameMap.get(rawEmpName.toLowerCase()) : undefined;
  const clientNumber = isIn ? (r.call_from_number ?? "") : (r.call_to_number ?? "");
  const clientName   = isIn ? (r.call_from_name ?? "")  : (r.call_to_name ?? "");
  const trunkCandidate = isIn ? (r.src_trunk ?? "") : (r.dst_trunk ?? "");

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
    trunkLine: TRUNK_LINES.has(trunkCandidate) ? trunkCandidate : undefined,
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
    clientName:   c.client_name   ?? "",
    answered:  c.answered === 1,
    duration:  c.duration ?? 0,
    recordingUrl: c.recording || null,
    channel: "sim",
  };
}

function computeStats(calls: UnifiedCall[]): UnifiedStats {
  const s: UnifiedStats = { all: calls.length, inbound: 0, answered: 0, missed: 0, outbound: 0, outbound_success: 0, outbound_failed: 0, internal: 0 };
  for (const c of calls) {
    if (c.direction === "inbound")       { s.inbound++;  c.answered ? s.answered++ : s.missed++; }
    else if (c.direction === "outbound") { s.outbound++; c.answered ? s.outbound_success++ : s.outbound_failed++; }
    else s.internal++;
  }
  return s;
}

// Bir xil uid → talk_duration eng ko'p bo'lgani asosiy
function deduplicateCDR(records: (CDRRecord & { rec_id: number | null })[]): (CDRRecord & { rec_id: number | null })[] {
  const byUid = new Map<string, (CDRRecord & { rec_id: number | null })[]>();
  for (const r of records) {
    const arr = byUid.get(r.uid) ?? [];
    arr.push(r);
    byUid.set(r.uid, arr);
  }
  return [...byUid.values()].map(legs =>
    legs.length === 1 ? legs[0] : legs.sort((a, b) => (b.talk_duration ?? 0) - (a.talk_duration ?? 0))[0]
  );
}

// ── Bitta kun uchun to'liq API so'rov (xato sifatida pbxError bilan) ────

async function fetchDayFromAPI(isoDate: string): Promise<{ pbx: CDRRecord[]; mz: MZCall[]; pbxError: string | null }> {
  const { start, end } = isoToPBXRange(isoDate);
  const { from, to }   = isoToUnixRange(isoDate);

  const [cdrRes, mzRes] = await Promise.allSettled([
    queryCDRChunked(start, end),
    queryMZCalls(from, to),
  ]);

  let pbxError: string | null = null;
  let pbx: CDRRecord[] = [];

  if (cdrRes.status === "rejected") {
    pbxError = String(cdrRes.reason);
  } else if (cdrRes.value.errcode !== 0) {
    pbxError = `errcode=${cdrRes.value.errcode} ${cdrRes.value.errmsg}`;
  } else {
    pbx = cdrRes.value.data ?? [];
  }

  const mz = mzRes.status === "fulfilled" ? mzRes.value : [];
  return { pbx, mz, pbxError };
}

// ── Asosiy handler ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const elapsed = timer();
  try {
    const { searchParams } = req.nextUrl;
    const customStart = searchParams.get("start");
    const customEnd   = searchParams.get("end");
    const forceRefresh = searchParams.get("refresh") === "1";

    const { start, end } = customStart && customEnd
      ? { start: customStart, end: customEnd }
      : getDateRange(searchParams.get("date") ?? "today");

    const today = todayISO();
    const days  = splitRangeIntoDays(start, end);

    log.info("API /calls", `${days.length} kun, refresh=${forceRefresh}`, { start, end });

    // 1. Supabase cacheni o'qiymiz
    const cachedMap = await getCachedDays(days);

    // 2. Bugun uchun refresh (handleRefresh: full / incremental / cooldown)
    if (forceRefresh && days.includes(today)) {
      await handleRefresh(today, cachedMap);
    }

    // 3. Cache yo'q kunlarni aniqlash
    const toFetch: string[] = [];
    for (const d of days) {
      if (d === today && cachedMap.has(d)) continue; // handleRefresh hal qildi yoki cache bor
      if (!cachedMap.has(d)) { toFetch.push(d); continue; }
    }

    // 3b. Yo'q kunlarni API dan olamiz — inflight deduplication bilan
    let pbxError: string | null = null;
    if (toFetch.length > 0) {
      log.info("API /calls", `${toFetch.length} kun API dan yuklanmoqda`);

      // Har bir kun uchun: boshqa so'rov yuklab tursa — unga qo'shilamiz (dublikat API chaqiruv yo'q)
      const CONCURRENCY = 3; // Yeastar parallel chaqiruvlarni cheklaydi
      for (let i = 0; i < toFetch.length; i += CONCURRENCY) {
        const chunk = toFetch.slice(i, i + CONCURRENCY);
        const promises = chunk.map(isoDate => {
          const existing = getInflight(isoDate);
          if (existing) return existing;

          const p: Promise<DayCache> = fetchDayFromAPI(isoDate).then(({ pbx, mz, pbxError: err }) => {
            if (err) {
              log.error("API /calls", `PBX xato: ${isoDate}`, { err });
              // PBX xato bo'lsa Supabase ga saqlamaymiz — keyingi so'rov qayta urinadi
              return { pbx, mz, cachedAt: Date.now() } as DayCache;
            }
            const entry: DayCache = { pbx, mz, cachedAt: Date.now() };
            setCachedDay(isoDate, pbx, mz).catch(e => log.error("cache", `Saqlanmadi: ${isoDate}`, { e: String(e) }));
            return entry;
          });
          setInflight(isoDate, p);
          return p;
        });

        const results = await Promise.allSettled(promises);
        for (let j = 0; j < chunk.length; j++) {
          const isoDate = chunk[j];
          const r = results[j];
          if (r.status === "fulfilled") {
            cachedMap.set(isoDate, r.value);
          } else {
            pbxError = String(r.reason);
            log.error("API /calls", `Kun yuklanmadi: ${isoDate}`, { err: pbxError });
          }
        }
      }
    }

    // 4. Yozuvlarni yig'ib unified formatga o'tkazamiz
    const settings = await readSettings();
    const nameMap  = buildYeastarNameMap(settings);
    const emailMap = buildMzEmailMap(settings);

    // Recording map — faqat yangi yuklamada, cache dan kelganda o'tkazib yuboramiz
    const needsRecording = days.includes(today) && toFetch.length > 0;
    const recMap = needsRecording
      ? await getRecordingMap(today)
      : (recMapCache?.isoDate === today ? recMapCache.map : new Map<string, number>());

    const allPBX: (CDRRecord & { rec_id: number | null })[] = [];
    const allMZ:  MZCall[] = [];

    for (const d of days) {
      const entry = cachedMap.get(d);
      if (!entry) continue;
      for (const r of entry.pbx) allPBX.push({ ...r, rec_id: recMap.get(r.uid) ?? null });
      allMZ.push(...entry.mz);
    }

    const deduped = deduplicateCDR(allPBX);
    const calls = [
      ...deduped.map(r => yeastarToUnified(r, nameMap)),
      ...allMZ.map(c => mzToUnified(c, emailMap)),
    ].sort((a, b) => b.timeUnix - a.timeUnix);

    log.ok("API /calls", `${calls.length} ta (PBX:${deduped.length} SIM:${allMZ.length})`, { ms: elapsed() });
    return NextResponse.json({ calls, stats: computeStats(calls), pbxError });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    log.error("API /calls", message, { ms: elapsed() });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
