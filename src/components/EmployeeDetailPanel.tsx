"use client";

import { useEffect, useRef, useState } from "react";
import { EmployeeDetail, DayBucket } from "@/app/api/employees/detail/route";
import { formatDateTime, formatDuration } from "@/lib/utils";

function fmtDur(sec: number): string {
  if (!sec) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}s ${m}d ${s}s`;
  if (m > 0) return `${m}d ${s}s`;
  return `${s}s`;
}

function pct(a: number, b: number): string {
  if (!b) return "0%";
  return `${Math.round((a / b) * 100)}%`;
}

function MiniKpi({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 flex flex-col gap-0.5">
      <span className="text-xs text-gray-400">{label}</span>
      <span className={`text-lg font-bold ${color ?? "text-gray-800"}`}>{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  );
}

function DayBar({ day, maxTotal }: { day: DayBucket; maxTotal: number }) {
  const total = day.inbound + day.outbound;
  if (!maxTotal) return null;
  const W = 80;
  const inW = Math.round((day.inbound / maxTotal) * W);
  const outW = Math.round((day.outbound / maxTotal) * W);
  return (
    <div className="flex gap-0.5" style={{ width: W, minWidth: W }}>
      {inW > 0 && <div className="h-4 rounded-sm bg-green-400" style={{ width: inW }} title={`Kiruvchi: ${day.inbound}`} />}
      {outW > 0 && <div className="h-4 rounded-sm bg-blue-400" style={{ width: outW }} title={`Chiquvchi: ${day.outbound}`} />}
      {total === 0 && <div className="h-4 rounded-sm bg-gray-100 w-full" />}
    </div>
  );
}

interface Props {
  number: string | null;
  start: string;
  end: string;
  onClose: () => void;
}

export default function EmployeeDetailPanel({ number, start, end, onClose }: Props) {
  const [data, setData] = useState<EmployeeDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"overview" | "days" | "calls">("overview");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!number) { setData(null); return; }
    setLoading(true);
    setData(null);
    const params = new URLSearchParams({ number, start, end });
    fetch(`/api/employees/detail?${params}`)
      .then(r => r.json())
      .then(d => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [number, start, end]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    }
    if (number) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [number, onClose]);

  // ESC bilan yopish
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const open = !!number;

  const maxDayTotal = data?.days?.length
    ? Math.max(...data.days.map(d => d.inbound + d.outbound), 1)
    : 1;

  return (
    <>
      {/* Backdrop */}
      <div className={`fixed inset-0 z-40 bg-black/25 transition-opacity duration-200 ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`} />

      {/* Panel */}
      <div
        ref={ref}
        className={`fixed top-0 right-0 h-full w-[480px] max-w-full bg-white z-50 shadow-2xl flex flex-col transition-transform duration-200 ease-in-out ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <div>
            <div className="font-semibold text-gray-800 text-base">
              {data?.name ?? (loading ? "Yuklanmoqda..." : "Xodim")}
            </div>
            <div className="text-xs text-gray-400 font-mono mt-0.5">{number}</div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-gray-100 text-gray-400 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 shrink-0">
          {([
            { key: "overview", label: "Umumiy" },
            { key: "days", label: "Kunlar bo'yicha" },
            { key: "calls", label: "Qo'ng'iroqlar" },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
                tab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
              Yuklanmoqda...
            </div>
          )}

          {!loading && data && tab === "overview" && (
            <div className="p-5 space-y-5">
              {/* Kiruvchi KPI */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Kiruvchi qo&apos;ng&apos;iroqlar</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <MiniKpi label="Jami" value={data.inbound} color="text-gray-800" />
                  <MiniKpi label="Qabul qilindi" value={data.inbound_answered} sub={pct(data.inbound_answered, data.inbound)} color="text-green-600" />
                  <MiniKpi label="O'tkazib yuborildi" value={data.inbound_missed} sub={pct(data.inbound_missed, data.inbound)} color="text-red-500" />
                </div>
              </div>

              {/* Chiquvchi KPI */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Chiquvchi qo&apos;ng&apos;iroqlar</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <MiniKpi label="Jami" value={data.outbound} color="text-gray-800" />
                  <MiniKpi label="Muvaffaqiyatli" value={data.outbound_success} sub={pct(data.outbound_success, data.outbound)} color="text-blue-600" />
                  <MiniKpi label="Muvaffaqiyatsiz" value={data.outbound_failed} sub={pct(data.outbound_failed, data.outbound)} color="text-orange-500" />
                </div>
              </div>

              {/* Vaqt KPI */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vaqt</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <MiniKpi label="Suhbat vaqti" value={fmtDur(data.total_talk_sec)} color="text-indigo-600" />
                  <MiniKpi
                    label="O'rtacha suhbat"
                    value={fmtDur(Math.round(data.total_talk_sec / Math.max(data.inbound_answered + data.outbound_success, 1)))}
                    color="text-indigo-500"
                  />
                  <MiniKpi label="Jami qo'ng'iroq" value={data.total} color="text-gray-700" />
                </div>
              </div>

              {/* Mini progress bars */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span className="font-medium">Qabul qilish darajasi</span>
                  <span className="font-semibold text-green-600">{pct(data.inbound_answered, data.inbound)}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: pct(data.inbound_answered, data.inbound) }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span className="font-medium">Chiquvchi muvaffaqiyat</span>
                  <span className="font-semibold text-blue-600">{pct(data.outbound_success, data.outbound)}</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all"
                    style={{ width: pct(data.outbound_success, data.outbound) }}
                  />
                </div>
              </div>
            </div>
          )}

          {!loading && data && tab === "days" && (
            <div className="p-5">
              {(data.days ?? []).length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-12">Ma&apos;lumot yo&apos;q</div>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left pb-2 font-medium text-gray-500">Sana</th>
                      <th className="text-right pb-2 font-medium text-gray-500">↙ Kir.</th>
                      <th className="text-right pb-2 font-medium text-green-600">Qabul</th>
                      <th className="text-right pb-2 font-medium text-red-500">O&apos;tk.</th>
                      <th className="text-right pb-2 font-medium text-gray-500">↗ Chiq.</th>
                      <th className="text-right pb-2 font-medium text-blue-600">Muvf.</th>
                      <th className="pb-2 pl-4" style={{ width: 96 }} />
                      <th className="text-right pb-2 font-medium text-indigo-500">Suhbat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {(data.days ?? []).map(day => (
                      <tr key={day.date} className="hover:bg-gray-50">
                        <td className="py-2 font-mono text-gray-600">{day.date}</td>
                        <td className="py-2 text-right text-gray-700">{day.inbound || "—"}</td>
                        <td className="py-2 text-right text-green-600">{day.inbound_answered || "—"}</td>
                        <td className="py-2 text-right text-red-500">{day.inbound_missed || "—"}</td>
                        <td className="py-2 text-right text-gray-700">{day.outbound || "—"}</td>
                        <td className="py-2 text-right text-blue-600">{day.outbound_success || "—"}</td>
                        <td className="py-2 pl-4">
                          <DayBar day={day} maxTotal={maxDayTotal} />
                        </td>
                        <td className="py-2 text-right font-mono text-indigo-500">{fmtDur(day.talk_sec)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {!loading && data && tab === "calls" && (
            <div className="divide-y divide-gray-100">
              {(data.recent_calls ?? []).length === 0 ? (
                <div className="text-center text-gray-400 text-sm py-12">Qo&apos;ng&apos;iroqlar topilmadi</div>
              ) : (
                (data.recent_calls ?? []).map((r, i) => {
                  const isIn = r.call_type === "Inbound";
                  const answered = r.disposition === "ANSWERED";
                  const external = isIn ? r.call_from_number : r.call_to_number;
                  const externalName = isIn ? r.call_from_name : r.call_to_name;
                  return (
                    <div key={`${r.uid}-${i}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                      {/* Tur ikonkasi */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                        !answered ? "bg-red-100" : isIn ? "bg-green-100" : "bg-blue-100"
                      }`}>
                        <svg className={`w-4 h-4 ${!answered ? "text-red-500" : isIn ? "text-green-600" : "text-blue-600"}`}
                          fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          {isIn
                            ? <path d="M7 7v10h10" strokeLinecap="round" strokeLinejoin="round" />
                            : <path d="M7 17L17 7M17 7H7M17 7v10" strokeLinecap="round" strokeLinejoin="round" />
                          }
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-800 truncate">
                          {externalName && externalName !== external ? `${externalName}` : external || "—"}
                        </div>
                        <div className="text-xs text-gray-400">{formatDateTime(r.time)}</div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className={`text-xs font-medium ${answered ? "text-green-600" : "text-red-500"}`}>
                          {answered ? "Qabul" : "O'tkazib"}
                        </div>
                        <div className="text-xs text-gray-400 font-mono">{formatDuration(r.talk_duration ?? 0)}</div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
