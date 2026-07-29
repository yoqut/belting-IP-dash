import { UnifiedCall, UnifiedStats } from "@/types/unified";

/** Stat kartochka bosilganda qo'llaniladigan kesim. */
export type CallGroupKey =
  | "inbound"
  | "answered"
  | "missed"
  | "outbound"
  | "outbound_success"
  | "outbound_failed"
  | "internal";

export type ActiveGroup = "all" | CallGroupKey;

/** Filter drawer'dagi qiymatlar. */
export interface CallFilters {
  search: string;
  employee: string;
  channel: string;
  status: string;
  /** "" yoki `TRUNK_LINES` dan biri */
  trunk: string;
}

export const EMPTY_CALL_FILTERS: CallFilters = {
  search: "",
  employee: "",
  channel: "",
  status: "",
  trunk: "",
};

export const EMPTY_UNIFIED_STATS: UnifiedStats = {
  all: 0,
  inbound: 0,
  answered: 0,
  missed: 0,
  outbound: 0,
  outbound_success: 0,
  outbound_failed: 0,
  internal: 0,
};

export const TRUNK_LINES = ["781223344", "781507500", "787771188", "787773322"];

export function matchesGroup(call: UnifiedCall, key: CallGroupKey): boolean {
  switch (key) {
    case "inbound": return call.direction === "inbound";
    case "answered": return call.direction === "inbound" && call.answered;
    case "missed": return call.direction === "inbound" && !call.answered;
    case "outbound": return call.direction === "outbound";
    case "outbound_success": return call.direction === "outbound" && call.answered;
    case "outbound_failed": return call.direction === "outbound" && !call.answered;
    case "internal": return call.direction === "internal";
  }
}

export function applyCallFilters(calls: UnifiedCall[], f: CallFilters): UnifiedCall[] {
  // Qidiruv satrini har bir yozuv uchun emas, bir marta normallashtiramiz.
  const query = f.search.trim().toLowerCase();

  // Hech qanday filter yo'q bo'lsa — yangi massiv yaratmaymiz, referens saqlanadi.
  if (!query && !f.employee && !f.channel && !f.trunk && !f.status) return calls;

  return calls.filter(c => {
    if (f.employee && c.employeeName !== f.employee) return false;
    if (f.channel && c.channel !== f.channel) return false;
    if (f.trunk && c.trunkLine !== f.trunk) return false;
    if (f.status === "answered" && !c.answered) return false;
    if (f.status === "missed" && c.answered) return false;
    if (query) {
      const hit =
        c.employeeName.toLowerCase().includes(query) ||
        c.clientNumber.includes(query) ||
        c.clientName.toLowerCase().includes(query);
      if (!hit) return false;
    }
    return true;
  });
}

export function computeUnifiedStats(calls: UnifiedCall[]): UnifiedStats {
  const s: UnifiedStats = { ...EMPTY_UNIFIED_STATS };
  for (const c of calls) {
    s.all++;
    if (c.direction === "inbound") {
      s.inbound++;
      if (c.answered) s.answered++; else s.missed++;
    } else if (c.direction === "outbound") {
      s.outbound++;
      if (c.answered) s.outbound_success++; else s.outbound_failed++;
    } else {
      s.internal++;
    }
  }
  return s;
}

/** Filter drawer'dagi "Xodim" ro'yxati uchun noyob ismlar. */
export function extractEmployeeNames(calls: UnifiedCall[]): string[] {
  const names = new Set<string>();
  for (const c of calls) {
    if (c.employeeName && c.employeeName !== "—") names.add(c.employeeName);
  }
  return [...names].sort();
}

export function countActiveFilters(f: CallFilters): number {
  return [f.employee, f.channel, f.status, f.trunk].filter(Boolean).length;
}

export function hasAnyFilter(f: CallFilters): boolean {
  return !!(f.search || f.employee || f.channel || f.status || f.trunk);
}
