import { request } from "./client";
import { UnifiedCall } from "@/types/unified";
import { DateRange, formatPBX } from "@/utils/date";

export interface CallsResponse {
  calls: UnifiedCall[];
  /** PBX qismi yuklanmasa — SIM ma'lumotlari baribir qaytadi, bu yerda sabab keladi. */
  pbxError?: string;
}

export function fetchCalls(
  range: DateRange,
  opts: { refresh?: boolean; signal?: AbortSignal } = {},
): Promise<CallsResponse> {
  const params = new URLSearchParams({
    start: formatPBX(range.start),
    end: formatPBX(range.end),
  });
  if (opts.refresh) params.set("refresh", "1");

  return request<CallsResponse>(`/api/calls?${params}`, { signal: opts.signal });
}
