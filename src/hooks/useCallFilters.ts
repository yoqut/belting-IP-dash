"use client";

import { useCallback, useMemo, useReducer } from "react";
import { ActiveGroup, CallFilters, EMPTY_CALL_FILTERS } from "@/utils/calls";

export const PAGE_SIZES = [10, 20, 50, 100];

interface FilterState {
  filters: CallFilters;
  activeGroup: ActiveGroup;
  page: number;
  pageSize: number;
}

type Action =
  | { type: "setFilter"; key: keyof CallFilters; value: string }
  | { type: "resetFilters" }
  | { type: "selectGroup"; key: ActiveGroup }
  | { type: "setPage"; page: number }
  | { type: "setPageSize"; size: number }
  | { type: "resetAll" };

const INITIAL: FilterState = {
  filters: EMPTY_CALL_FILTERS,
  activeGroup: "all",
  page: 1,
  pageSize: 20,
};

/**
 * Filter/pagination holati bitta reducerda.
 *
 * Muhim nuqta: filter yoki kesim o'zgarganda sahifa `1` ga QAYTA TUSHADI —
 * avvalgi kodda buni alohida `useEffect` bajarardi, ya'ni har filter
 * o'zgarishida ortiqcha ikkinchi render sikli ketardi. Endi bu bitta
 * sinxron o'tishda hal bo'ladi.
 */
function reducer(state: FilterState, action: Action): FilterState {
  switch (action.type) {
    case "setFilter":
      return {
        ...state,
        filters: { ...state.filters, [action.key]: action.value },
        page: 1,
      };
    case "resetFilters":
      return { ...state, filters: EMPTY_CALL_FILTERS, page: 1 };
    case "selectGroup":
      // Aktiv kesimni qayta bosish — uni bekor qiladi
      return {
        ...state,
        activeGroup: state.activeGroup === action.key ? "all" : action.key,
        page: 1,
      };
    case "setPage":
      return { ...state, page: Math.max(1, action.page) };
    case "setPageSize":
      return { ...state, pageSize: action.size, page: 1 };
    case "resetAll":
      return { ...INITIAL, pageSize: state.pageSize };
  }
}

export function useCallFilters() {
  const [state, dispatch] = useReducer(reducer, INITIAL);

  // Barcha handlerlar barqaror (stabil) — memo qilingan bolalar qayta chizilmaydi
  const actions = useMemo(
    () => ({
      setFilter: (key: keyof CallFilters, value: string) => dispatch({ type: "setFilter", key, value }),
      resetFilters: () => dispatch({ type: "resetFilters" }),
      selectGroup: (key: ActiveGroup) => dispatch({ type: "selectGroup", key }),
      setPage: (page: number) => dispatch({ type: "setPage", page }),
      setPageSize: (size: number) => dispatch({ type: "setPageSize", size }),
      resetAll: () => dispatch({ type: "resetAll" }),
    }),
    [],
  );

  const setSearch = useCallback((value: string) => actions.setFilter("search", value), [actions]);

  return { ...state, ...actions, setSearch };
}
