import { request } from "./client";
import { CDRRecord } from "@/types/cdr";
import { DateRange, formatPBX } from "@/utils/date";

export interface CdrResponse {
  records: CDRRecord[];
  called_back_numbers?: string[];
  /** `quick=1` javobida: serverda yana sahifalar bormi. */
  has_more?: boolean;
}

/** Cloudflare 100s limitiga yetmaslik uchun to'liq yuklashda 90s timeout. */
const FULL_FETCH_TIMEOUT = 90_000;

function rangeParams(range: DateRange): URLSearchParams {
  return new URLSearchParams({
    start: formatPBX(range.start),
    end: formatPBX(range.end),
  });
}

/** 1-bosqich: birinchi sahifa — ekranni tez to'ldirish uchun. */
export function fetchCdrQuick(range: DateRange, signal?: AbortSignal): Promise<CdrResponse> {
  const params = rangeParams(range);
  params.set("quick", "1");
  return request<CdrResponse>(`/api/cdr?${params}`, { signal });
}

/** 2-bosqich: to'liq ro'yxat — fonda yuklanadi. */
export function fetchCdrFull(range: DateRange, signal?: AbortSignal): Promise<CdrResponse> {
  return request<CdrResponse>(`/api/cdr?${rangeParams(range)}`, {
    signal,
    timeout: FULL_FETCH_TIMEOUT,
  });
}
