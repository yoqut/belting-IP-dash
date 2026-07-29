import { CDRRecord, CDRStats, CallFilter } from "@/types/cdr";
import { FilterValues } from "@/components/FilterPanel";

export const EMPTY_CDR_STATS: CDRStats = {
  all: 0, inbound: 0, answered: 0, missed: 0, no_answer: 0,
  outbound: 0, outbound_success: 0, outbound_failed: 0, internal: 0,
};

/** "998781223344" → "781223344". Trunk raqamlarini solishtirish uchun. */
export function normalizeLineNumber(n: string): string {
  if (!n) return "";
  return n.startsWith("998") && n.length === 12 ? n.slice(3) : n;
}

/** Ichki raqam xodimga tegishlimi (avtomatik/tizim raqamlarini chetlab o'tadi). */
export function isEmployeeExtension(number: string, name: string): boolean {
  if (!number || !name || name === number) return false;
  if (name.toLowerCase().startsWith("automatic")) return false;
  return number.length <= 5;
}

/** Yozuvlar ichidan noyob xodimlarni ajratib oladi (filter panel dropdowni uchun). */
export function extractUniqueEmployees(records: CDRRecord[]): { number: string; name: string }[] {
  const map = new Map<string, string>();
  for (const r of records) {
    if (r.call_to_number && isEmployeeExtension(r.call_to_number, r.call_to_name)) {
      map.set(r.call_to_number, r.call_to_name);
    }
    if (r.call_from_number && isEmployeeExtension(r.call_from_number, r.call_from_name)) {
      map.set(r.call_from_number, r.call_from_name);
    }
  }
  return [...map.entries()]
    .map(([number, name]) => ({ number, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function computeCDRStats(records: CDRRecord[], calledBack: Set<string>): CDRStats {
  const s: CDRStats = { ...EMPTY_CDR_STATS, all: records.length };
  const missedCallers = new Set<string>();

  for (const r of records) {
    if (r.call_type === "Inbound") {
      s.inbound++;
      if (r.disposition === "ANSWERED") {
        s.answered++;
      } else {
        s.missed++;
        if (r.call_from_number) missedCallers.add(r.call_from_number);
      }
    } else if (r.call_type === "Outbound") {
      s.outbound++;
      if (r.disposition === "ANSWERED") s.outbound_success++;
      else s.outbound_failed++;
    } else if (r.call_type === "Internal") {
      s.internal++;
    }
  }

  // Bog'lanilmagan = o'tkazib yuborilgan, lekin qaytib qo'ng'iroq qilinmagan noyob raqamlar
  for (const num of missedCallers) {
    if (!calledBack.has(num)) s.no_answer++;
  }
  return s;
}

function matchesCallFilter(r: CDRRecord, filter: CallFilter, calledBack: Set<string>): boolean {
  const inbound = r.call_type === "Inbound";
  const outbound = r.call_type === "Outbound";
  const answered = r.disposition === "ANSWERED";

  switch (filter) {
    case "all": return true;
    case "inbound": return inbound;
    case "answered": return inbound && answered;
    case "missed": return inbound && !answered;
    case "no_answer": return inbound && !answered && !calledBack.has(r.call_from_number);
    case "outbound": return outbound;
    case "outbound_success": return outbound && answered;
    case "outbound_failed": return outbound && !answered;
    case "internal": return r.call_type === "Internal";
  }
}

/**
 * Barcha filterlarni BITTA o'tishda qo'llaydi.
 * Avvalgi implementatsiya har bir filter uchun alohida `.filter()` chaqirar edi —
 * 7 ta oraliq massiv yaratilardi. Endi faqat bittasi.
 */
export function applyCDRFilters(
  records: CDRRecord[],
  callFilter: CallFilter,
  calledBack: Set<string>,
  f: FilterValues,
): CDRRecord[] {
  const seen = f.deduplicateExternal ? new Set<string>() : null;

  return records.filter(r => {
    if (!matchesCallFilter(r, callFilter, calledBack)) return false;

    if (f.excludeInternal && r.call_type === "Internal") return false;
    if (f.line && normalizeLineNumber(r.src_trunk) !== f.line && normalizeLineNumber(r.dst_trunk) !== f.line) return false;
    if (f.from && r.call_from_number !== f.from) return false;
    if (f.to && r.call_to_number !== f.to) return false;
    if (f.type && r.call_type !== f.type) return false;
    if (f.disposition && r.disposition !== f.disposition) return false;

    // Tashqi raqam + sana bo'yicha takrorlarni olib tashlash
    if (seen) {
      const external =
        r.call_type === "Inbound" ? r.call_from_number :
        r.call_type === "Outbound" ? r.call_to_number : null;
      if (external) {
        const key = `${external}|${r.time?.slice(0, 10) ?? ""}`;
        if (seen.has(key)) return false;
        seen.add(key);
      }
    }

    return true;
  });
}

/** Eng yangi qo'ng'iroq yuqorida. Kirish massivini o'zgartirmaydi. */
export function sortByTimeDesc(records: CDRRecord[]): CDRRecord[] {
  return [...records].sort((a, b) => (b.time ?? "").localeCompare(a.time ?? ""));
}

/**
 * Filter panelda standart holatdan farqli qiymat bormi.
 *
 * BUG FIX: avval `Object.values(f).some(v => v !== "" && v !== false)` ishlatilardi.
 * `EMPTY_FILTERS.excludeInternal` standart holatda `true` bo'lgani uchun bu shart
 * HAR DOIM `true` qaytarardi — filter tugmasi doim ko'k turardi va stat kartochkalar
 * hech qachon keshlangan `stats` ni ishlatmasdi. Endi standart qiymat bilan
 * maydonma-maydon solishtiramiz.
 */
export function hasActiveFilterValues(f: FilterValues, defaults: FilterValues): boolean {
  return (Object.keys(f) as (keyof FilterValues)[]).some(k => f[k] !== defaults[k]);
}
