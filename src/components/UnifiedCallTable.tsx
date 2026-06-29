"use client";

import { UnifiedCall } from "@/types/unified";

function formatDuration(sec: number): string {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatTime(unix: number): string {
  if (!unix) return "—";
  const d = new Date(unix * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const DIR_LABEL: Record<string, string> = { inbound: "Kiruvchi", outbound: "Chiquvchi", internal: "Ichki" };
const DIR_COLOR: Record<string, string> = {
  inbound: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  outbound: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  internal: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300",
};

interface Props { records: UnifiedCall[]; loading: boolean; }

export default function UnifiedCallTable({ records, loading }: Props) {
  if (loading) return <div className="px-4 py-12 text-center text-sm text-gray-400 dark:text-slate-500">Yuklanmoqda...</div>;
  if (records.length === 0) return <div className="px-4 py-12 text-center text-sm text-gray-400 dark:text-slate-500">Qo&apos;ng&apos;iroqlar topilmadi</div>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">
            <th className="px-4 py-3 text-left">Vaqt</th>
            <th className="px-4 py-3 text-left">Xodim</th>
            <th className="px-4 py-3 text-left">Yo&apos;nalish</th>
            <th className="px-4 py-3 text-left">Raqam / Mijoz</th>
            <th className="px-4 py-3 text-left">Holat</th>
            <th className="px-4 py-3 text-left">Davomiylik</th>
            <th className="px-4 py-3 text-left">Yozuv</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
          {records.map((c, i) => (
            <tr key={`${c.id}_${i}`} className="hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors">
              <td className="px-4 py-2.5 text-gray-500 dark:text-slate-400 whitespace-nowrap font-mono text-xs">
                {formatTime(c.timeUnix)}
              </td>
              <td className="px-4 py-2.5 whitespace-nowrap">
                <div className="text-gray-800 dark:text-slate-200 font-medium text-sm">{c.employeeName}</div>
                <div className={`text-[10px] mt-0.5 font-medium ${c.channel === "pbx" ? "text-blue-400 dark:text-blue-500" : "text-orange-400 dark:text-orange-500"}`}>
                  {c.channel === "pbx" ? "PBX" : "SIM"}
                </div>
              </td>
              <td className="px-4 py-2.5">
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${DIR_COLOR[c.direction]}`}>
                  {DIR_LABEL[c.direction]}
                </span>
              </td>
              <td className="px-4 py-2.5 whitespace-nowrap">
                <div className="font-mono text-xs text-gray-700 dark:text-slate-300">{c.clientNumber || "—"}</div>
                {c.clientName && <div className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">{c.clientName}</div>}
              </td>
              <td className="px-4 py-2.5">
                <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                  c.answered
                    ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                }`}>
                  {c.answered ? "Javob berilgan" : "Javobsiz"}
                </span>
              </td>
              <td className="px-4 py-2.5 text-gray-500 dark:text-slate-400 text-xs whitespace-nowrap">
                {formatDuration(c.duration)}
              </td>
              <td className="px-4 py-2.5">
                {c.recordingUrl ? (
                  <a href={c.recordingUrl} target="_blank" rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors" title="Tinglash">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                  </a>
                ) : (
                  <span className="text-gray-200 dark:text-slate-700">—</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
