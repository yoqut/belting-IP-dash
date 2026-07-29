"use client";

import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchCdrQuick, fetchCdrFull, CdrResponse } from "@/services/api/cdr";
import { queryKeys } from "@/services/queryKeys";
import { ApiError, toErrorMessage } from "@/services/api/client";
import { DateRange } from "@/utils/date";
import { CDRRecord } from "@/types/cdr";

const EMPTY_RECORDS: CDRRecord[] = [];

interface CdrData extends CdrResponse {
  /** To'liq ro'yxat yuklab bo'lindimi (yoki hali `quick` natija turibdimi). */
  complete: boolean;
}

/**
 * Ikki bosqichli yuklash: avval birinchi sahifa (tez), so'ng to'liq ro'yxat (fonda).
 *
 * Avvalgi implementatsiyada bu bitta `fetchData` ichida `setState` chaqiruvlari
 * bilan qilingandi va to'liq so'rov abort bo'lganda `loadingMore` ba'zan
 * `finally` dan oldin `false` bo'lib qolardi. Endi ikkala bosqich ham bitta
 * `queryFn` ichida bo'lib, natija bir marta keshga yoziladi.
 */
export function useCdr(range: DateRange) {
  const queryClient = useQueryClient();
  const queryKey = queryKeys.cdr(range);

  const query = useQuery<CdrData>({
    queryKey,
    queryFn: async ({ signal }) => {
      const quick = await fetchCdrQuick(range, signal);

      if (!quick.has_more) {
        return { ...quick, complete: true };
      }

      // Birinchi sahifani darhol keshga yozamiz — foydalanuvchi kuta olmaydi
      queryClient.setQueryData<CdrData>(queryKey, { ...quick, complete: false });

      try {
        const full = await fetchCdrFull(range, signal);
        return { ...full, complete: true };
      } catch (e) {
        // 90s timeout — quick ma'lumot allaqachon ekranda, xato ko'rsatmaymiz
        if (ApiError.isAbort(e) && !signal?.aborted) {
          return { ...quick, complete: false };
        }
        throw e;
      }
    },
  });

  const calledBackNumbers = useMemo(
    () => new Set(query.data?.called_back_numbers ?? []),
    [query.data?.called_back_numbers],
  );

  return {
    records: query.data?.records ?? EMPTY_RECORDS,
    calledBackNumbers,
    /** Birinchi sahifa hali kelmagan. */
    isLoading: query.isPending,
    /** Quick ko'rinib turibdi, to'liq ro'yxat fonda yuklanmoqda. */
    isLoadingMore: query.isFetching && !query.isPending,
    isComplete: query.data?.complete ?? false,
    error: query.error ? toErrorMessage(query.error) : null,
    dataUpdatedAt: query.dataUpdatedAt,
    refetch: query.refetch,
  };
}
