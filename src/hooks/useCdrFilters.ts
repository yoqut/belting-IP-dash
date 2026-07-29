"use client";

import { useCallback, useMemo, useState } from "react";
import { CDRRecord, CallFilter } from "@/types/cdr";
import { FilterValues, EMPTY_FILTERS } from "@/components/FilterPanel";
import {
  applyCDRFilters,
  computeCDRStats,
  extractUniqueEmployees,
  hasActiveFilterValues,
  sortByTimeDesc,
} from "@/utils/cdr";

interface Params {
  records: CDRRecord[];
  calledBackNumbers: Set<string>;
}

/**
 * Yeastar CDR sahifasining filter holati va hosila ma'lumotlari.
 *
 * Panel filterlari ikki bosqichda qo'llanadi:
 *   1. `panelFiltered` — kesimsiz, stat kartochkalar shundan hisoblanadi;
 *   2. `visibleRecords` — kesim ham qo'shilgan, jadval shuni ko'rsatadi.
 *
 * Ilgari ikkala hisob ham komponent tanasida, memoizatsiyasiz turardi —
 * har bir render (hatto sidebar ochilganda ham) minglab yozuvni qayta
 * filtrlab, qayta saralardi.
 */
export function useCdrFilters({ records, calledBackNumbers }: Params) {
  const [callFilter, setCallFilter] = useState<CallFilter>("all");
  /** Panelda tahrirlanayotgan qiymatlar. */
  const [draftFilters, setDraftFilters] = useState<FilterValues>(EMPTY_FILTERS);
  /** "Qo'llash" bosilgandan keyingi qiymatlar. */
  const [appliedFilters, setAppliedFilters] = useState<FilterValues>(EMPTY_FILTERS);

  const panelFiltered = useMemo(
    () => applyCDRFilters(records, "all", calledBackNumbers, appliedFilters),
    [records, calledBackNumbers, appliedFilters],
  );

  const filteredStats = useMemo(
    () => computeCDRStats(panelFiltered, calledBackNumbers),
    [panelFiltered, calledBackNumbers],
  );

  const allStats = useMemo(
    () => computeCDRStats(records, calledBackNumbers),
    [records, calledBackNumbers],
  );

  const visibleRecords = useMemo(
    () => sortByTimeDesc(applyCDRFilters(records, callFilter, calledBackNumbers, appliedFilters)),
    [records, callFilter, calledBackNumbers, appliedFilters],
  );

  const employees = useMemo(() => extractUniqueEmployees(records), [records]);

  const hasActiveFilters = useMemo(
    () => hasActiveFilterValues(appliedFilters, EMPTY_FILTERS),
    [appliedFilters],
  );

  const applyDraft = useCallback(() => setAppliedFilters(draftFilters), [draftFilters]);

  const clearFilters = useCallback(() => {
    setDraftFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  }, []);

  return {
    callFilter,
    setCallFilter,
    draftFilters,
    setDraftFilters,
    applyDraft,
    clearFilters,
    hasActiveFilters,
    /** Filter bo'lmasa to'liq statistika, bo'lsa — filtrlangani. */
    stats: hasActiveFilters ? filteredStats : allStats,
    visibleRecords,
    employees,
  };
}
