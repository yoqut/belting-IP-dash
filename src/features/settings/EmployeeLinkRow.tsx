"use client";

import { memo, useMemo } from "react";
import { EmployeeLink } from "@/types/unified";
import { MZEmployee } from "@/lib/moizvonki";
import { YeastarEmployee } from "@/services/api/settings";

const ArrowIcon = (
  <svg className="w-3.5 h-3.5 text-gray-300 dark:text-slate-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path d="M13 7l5 5m0 0l-5 5m5-5H6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronIcon = (
  <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

function selectClass(filled: boolean): string {
  return `w-full pl-3 pr-7 py-2 text-xs rounded-lg border transition-colors appearance-none bg-white dark:bg-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 ${
    filled
      ? "border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-200"
      : "border-dashed border-gray-200 dark:border-slate-600 text-gray-400 dark:text-slate-500"
  }`;
}

interface Props {
  index: number;
  link: EmployeeLink;
  mzList: MZEmployee[];
  yeastarList: YeastarEmployee[];
  /** Boshqa qatorlarda band qilingan qiymatlar — ikki marta bog'lashning oldini oladi. */
  usedMzEmails: Set<string>;
  usedYeastarNames: Set<string>;
  onChange: (index: number, field: keyof EmployeeLink, value: string) => void;
  onRemove: (index: number) => void;
}

/**
 * Bitta bog'lanish qatori: PBX xodimi ←→ ko'rsatiladigan ism ←→ SIM xodimi.
 * `memo` — 30 ta qator bo'lganda bitta katakni tahrirlash qolganlarini
 * qayta chizmaydi.
 */
const EmployeeLinkRow = memo(function EmployeeLinkRow({
  index, link, mzList, yeastarList, usedMzEmails, usedYeastarNames, onChange, onRemove,
}: Props) {
  // Band bo'lmagan (yoki shu qatorda tanlangan) variantlar
  const availableY = useMemo(
    () => yeastarList.filter(y => !usedYeastarNames.has(y.name) || y.name === link.yeastarExtName),
    [yeastarList, usedYeastarNames, link.yeastarExtName],
  );
  const availableMz = useMemo(
    () => mzList.filter(m => !usedMzEmails.has(m.email) || m.email === link.mzEmail),
    [mzList, usedMzEmails, link.mzEmail],
  );

  const ySelected = yeastarList.find(y => y.name === link.yeastarExtName);
  const mzSelected = mzList.find(m => m.email === link.mzEmail);

  return (
    <div className="grid grid-cols-[1fr_32px_120px_32px_1fr_32px] items-center px-6 py-3 hover:bg-gray-50/60 dark:hover:bg-slate-700/30 transition-colors group">
      {/* Yeastar / PBX */}
      <div className="relative">
        {yeastarList.length > 0 ? (
          <>
            <select
              value={link.yeastarExtName}
              onChange={e => onChange(index, "yeastarExtName", e.target.value)}
              aria-label="PBX xodimi"
              className={selectClass(!!ySelected)}
            >
              <option value="">— tanlang —</option>
              {/* Ro'yxatdan o'chib ketgan, lekin saqlangan qiymat yo'qolmasin */}
              {link.yeastarExtName && !ySelected && (
                <option value={link.yeastarExtName}>{link.yeastarExtName}</option>
              )}
              {availableY.map(y => <option key={y.number} value={y.name}>{y.name}</option>)}
            </select>
            {ChevronIcon}
            {ySelected && <div className="mt-1 text-[10px] text-gray-400 pl-0.5">#{ySelected.number}</div>}
          </>
        ) : (
          <input
            type="text"
            value={link.yeastarExtName}
            onChange={e => onChange(index, "yeastarExtName", e.target.value)}
            placeholder="Ism (PBX)"
            className="w-full px-3 py-2 text-xs rounded-lg border border-dashed border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-700 dark:text-slate-200 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300"
          />
        )}
      </div>

      <div className="flex items-center justify-center">{ArrowIcon}</div>

      <input
        type="text"
        value={link.displayName}
        onChange={e => onChange(index, "displayName", e.target.value)}
        placeholder="Ism"
        aria-label="Ko'rsatiladigan ism"
        className="w-full px-2.5 py-2 text-xs font-semibold text-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 placeholder:text-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
      />

      <div className="flex items-center justify-center">{ArrowIcon}</div>

      {/* MoiZvonki / SIM */}
      <div className="relative">
        <select
          value={link.mzEmail}
          onChange={e => onChange(index, "mzEmail", e.target.value)}
          aria-label="Mobil tizim xodimi"
          className={selectClass(!!mzSelected)}
        >
          <option value="">— tanlang —</option>
          {link.mzEmail && !mzSelected && <option value={link.mzEmail}>{link.mzEmail}</option>}
          {availableMz.map(m => <option key={m.email} value={m.email}>{m.display_name}</option>)}
        </select>
        {ChevronIcon}
        {mzSelected && <div className="mt-1 text-[10px] text-gray-400 pl-0.5 truncate">{mzSelected.email}</div>}
      </div>

      <div className="flex items-center justify-center">
        <button
          onClick={() => onRemove(index)}
          aria-label="Qatorni o'chirish"
          className="p-1 text-gray-200 dark:text-slate-600 hover:text-red-400 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
});

export default EmployeeLinkRow;
