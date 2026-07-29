"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchMoizvonki } from "@/services/api/moizvonki";
import { queryKeys } from "@/services/queryKeys";
import { toErrorMessage } from "@/services/api/client";
import { MZCall, MZStats } from "@/types/moizvonki";

const EMPTY_STATS: MZStats = { total: 0, inbound: 0, outbound: 0, answered: 0, missed: 0 };
const EMPTY_CALLS: MZCall[] = [];

export function useMoizvonki() {
  const query = useQuery({
    queryKey: queryKeys.moizvonki(),
    queryFn: ({ signal }) => fetchMoizvonki(signal),
  });

  // Eng yangi qo'ng'iroq yuqorida. `useMemo`siz har renderda massiv qayta
  // saralanib, jadvalga yangi referens uzatilardi.
  const calls = useMemo(
    () => [...(query.data?.calls ?? EMPTY_CALLS)].sort((a, b) => (b.start_time ?? 0) - (a.start_time ?? 0)),
    [query.data?.calls],
  );

  // email → ko'rsatiladigan ism
  const employeeMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of query.data?.employees ?? []) map.set(e.email, e.display_name);
    return map;
  }, [query.data?.employees]);

  return {
    calls,
    employeeMap,
    stats: query.data?.stats ?? EMPTY_STATS,
    isLoading: query.isPending,
    isFetching: query.isFetching,
    error: query.error ? toErrorMessage(query.error) : null,
    dataUpdatedAt: query.dataUpdatedAt,
    refetch: query.refetch,
  };
}
