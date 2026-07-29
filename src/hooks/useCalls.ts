"use client";

import { useCallback, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCalls, CallsResponse } from "@/services/api/calls";
import { queryKeys } from "@/services/queryKeys";
import { toErrorMessage } from "@/services/api/client";
import { DateRange } from "@/utils/date";
import { UnifiedCall } from "@/types/unified";

const EMPTY_CALLS: UnifiedCall[] = [];

/**
 * Birlashtirilgan qo'ng'iroqlar (PBX + SIM) uchun server state.
 *
 * Avvalgi kodda ikkita deyarli bir xil `fetchData` / `refreshToday` funksiyasi bor
 * edi, ikkalasi ham `AbortController`siz — sana tez o'zgartirilsa eski javob yangisini
 * bosib ketardi. React Query bekor qilish, dedupe va keshni o'zi boshqaradi.
 */
export function useCalls(range: DateRange) {
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const query = useQuery({
    queryKey: queryKeys.calls(range),
    queryFn: ({ signal }) => fetchCalls(range, { signal }),
  });

  /**
   * "Yangilash" tugmasi: serverdagi keshni chetlab o'tib (`refresh=1`) qayta oladi
   * va natijani React Query keshiga yozadi — shuning uchun `refetch()` emas.
   */
  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const fresh = await queryClient.fetchQuery({
        queryKey: queryKeys.calls(range),
        queryFn: ({ signal }) => fetchCalls(range, { refresh: true, signal }),
        staleTime: 0,
      });
      return fresh;
    } finally {
      setRefreshing(false);
    }
  }, [queryClient, range]);

  const data: CallsResponse | undefined = query.data;

  return {
    calls: data?.calls ?? EMPTY_CALLS,
    pbxError: data?.pbxError ?? null,
    /** Birinchi yuklanish — skeleton ko'rsatiladi. */
    isLoading: query.isPending,
    /** Fon rejimida yangilanmoqda — jadval eski ma'lumot bilan turadi. */
    isFetching: query.isFetching,
    isRefreshing: refreshing,
    error: query.error ? toErrorMessage(query.error) : null,
    dataUpdatedAt: query.dataUpdatedAt,
    refetch: query.refetch,
    refresh,
  };
}
