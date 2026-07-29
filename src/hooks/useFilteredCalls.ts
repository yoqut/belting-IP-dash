"use client";

import { useMemo } from "react";
import { UnifiedCall, UnifiedStats } from "@/types/unified";
import {
  ActiveGroup,
  CallFilters,
  applyCallFilters,
  computeUnifiedStats,
  extractEmployeeNames,
  matchesGroup,
} from "@/utils/calls";
import { useDebouncedValue } from "./useDebouncedValue";

interface Params {
  calls: UnifiedCall[];
  filters: CallFilters;
  activeGroup: ActiveGroup;
  page: number;
  pageSize: number;
}

export interface FilteredCallsResult {
  /** Drawer filterlari qo'llangan (kesimsiz) — stat kartochkalar shundan hisoblanadi. */
  filteredCalls: UnifiedCall[];
  stats: UnifiedStats;
  /** Kesim ham qo'llangan — jadval shuni ko'rsatadi. */
  visibleCalls: UnifiedCall[];
  /** Joriy sahifadagi yozuvlar. */
  pageItems: UnifiedCall[];
  totalPages: number;
  employeeNames: string[];
}

/**
 * Dashboard uchun barcha hosila (derived) ma'lumot — bitta joyda, bosqichma-bosqich
 * memoizatsiya bilan. Har bir bosqich faqat o'zining kirishi o'zgarganda qayta hisoblanadi:
 *
 *   calls ──► employeeNames        (faqat yangi ma'lumot kelganda)
 *         └► filteredCalls ──► stats
 *                          └► visibleCalls ──► pageItems
 *
 * Ya'ni sahifani almashtirish `slice()` dan boshqa hech narsani qayta hisoblatmaydi.
 * Qidiruv esa debounce qilingan — har bosilgan harf butun massivni aylanmaydi.
 */
export function useFilteredCalls({
  calls, filters, activeGroup, page, pageSize,
}: Params): FilteredCallsResult {
  const debouncedSearch = useDebouncedValue(filters.search, 250);

  // Qidiruvning kechiktirilgan qiymati bilan filter obyektini qayta yig'amiz,
  // shunda `applyCallFilters` har bosilgan harfda ishga tushmaydi.
  const effectiveFilters = useMemo<CallFilters>(
    () => ({ ...filters, search: debouncedSearch }),
    [filters, debouncedSearch],
  );

  const employeeNames = useMemo(() => extractEmployeeNames(calls), [calls]);

  const filteredCalls = useMemo(
    () => applyCallFilters(calls, effectiveFilters),
    [calls, effectiveFilters],
  );

  const stats = useMemo(() => computeUnifiedStats(filteredCalls), [filteredCalls]);

  const visibleCalls = useMemo(() => {
    if (activeGroup === "all") return filteredCalls;
    return filteredCalls.filter(c => matchesGroup(c, activeGroup));
  }, [filteredCalls, activeGroup]);

  const totalPages = Math.max(1, Math.ceil(visibleCalls.length / pageSize));

  // Filter natijasi qisqarib, joriy sahifa oralig'idan chiqib qolishi mumkin
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(
    () => visibleCalls.slice((safePage - 1) * pageSize, safePage * pageSize),
    [visibleCalls, safePage, pageSize],
  );

  return { filteredCalls, stats, visibleCalls, pageItems, totalPages, employeeNames };
}
