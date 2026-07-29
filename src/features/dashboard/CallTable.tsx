"use client";

import { memo, useCallback, useState } from "react";
import { UnifiedCall } from "@/types/unified";
import { AnsweredBadge, Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/Feedback";
import { TableSkeleton } from "@/components/ui/Skeleton";
import { formatDuration, formatUnixDateTime } from "@/utils/format";
import AudioPlayer from "./AudioPlayer";

const DIRECTION_LABEL = { inbound: "Kiruvchi", outbound: "Chiquvchi", internal: "Ichki" } as const;
const DIRECTION_TONE = { inbound: "blue", outbound: "purple", internal: "gray" } as const;

const COLUMNS = ["Vaqt", "Xodim", "Yo'nalish", "Raqam / Mijoz", "Holat", "Davomiylik", "Yozuv"];

/* ─────────────────────────── Qator ─────────────────────────── */

interface RowProps {
  call: UnifiedCall;
  rowId: string;
  isPlaying: boolean;
  onPlay: (rowId: string) => void;
  onStopPlaying: () => void;
}

/**
 * Bitta qator `memo` qilingan: pleyer ochilganda faqat o'sha qator
 * qayta chiziladi, qolgan 99 tasi tegilmaydi.
 */
const CallRow = memo(function CallRow({ call, rowId, isPlaying, onPlay, onStopPlaying }: RowProps) {
  return (
    <tr className={`hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors ${
      isPlaying ? "bg-blue-50/60 dark:bg-blue-900/10" : ""
    }`}>
      <td className="px-4 py-2.5 text-gray-500 dark:text-slate-400 whitespace-nowrap font-mono text-xs">
        {formatUnixDateTime(call.timeUnix)}
      </td>
      <td className="px-4 py-2.5 whitespace-nowrap">
        <div className="text-gray-800 dark:text-slate-200 font-medium text-sm">{call.employeeName}</div>
        <div className={`text-[10px] mt-0.5 font-medium ${
          call.channel === "pbx" ? "text-blue-400 dark:text-blue-500" : "text-orange-400 dark:text-orange-500"
        }`}>
          {call.channel === "pbx" ? "PBX" : "SIM"}
        </div>
      </td>
      <td className="px-4 py-2.5">
        <Badge tone={DIRECTION_TONE[call.direction]}>{DIRECTION_LABEL[call.direction]}</Badge>
      </td>
      <td className="px-4 py-2.5 whitespace-nowrap">
        <div className="font-mono text-xs text-gray-700 dark:text-slate-300">{call.clientNumber || "—"}</div>
        {call.clientName && (
          <div className="text-[11px] text-gray-400 dark:text-slate-500 mt-0.5">{call.clientName}</div>
        )}
      </td>
      <td className="px-4 py-2.5">
        <AnsweredBadge answered={call.answered} />
      </td>
      <td className="px-4 py-2.5 text-gray-500 dark:text-slate-400 text-xs whitespace-nowrap">
        {formatDuration(call.duration)}
      </td>
      <td className="px-4 py-2.5">
        {!call.recordingUrl ? (
          <span className="text-gray-200 dark:text-slate-700">—</span>
        ) : isPlaying ? (
          <AudioPlayer url={call.recordingUrl} onClose={onStopPlaying} />
        ) : (
          <button
            onClick={() => onPlay(rowId)}
            title="Ijro etish"
            aria-label="Yozuvni ijro etish"
            className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-500 dark:text-blue-400 flex items-center justify-center transition-colors"
          >
            <svg className="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
          </button>
        )}
      </td>
    </tr>
  );
});

/* ─────────────────────────── Jadval ─────────────────────────── */

interface Props {
  records: UnifiedCall[];
  loading: boolean;
}

const CallTable = memo(function CallTable({ records, loading }: Props) {
  const [playingId, setPlayingId] = useState<string | null>(null);

  const handlePlay = useCallback((rowId: string) => setPlayingId(rowId), []);
  const handleStop = useCallback(() => setPlayingId(null), []);

  if (loading) return <TableSkeleton columns={COLUMNS.length} />;
  if (records.length === 0) return <EmptyState message="Qo'ng'iroqlar topilmadi" />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 text-xs text-gray-500 dark:text-slate-400 uppercase tracking-wide">
            {COLUMNS.map(col => (
              <th key={col} className="px-4 py-3 text-left font-medium">{col}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
          {records.map((call, i) => {
            // `id` bir kunda takrorlanishi mumkin (PBX va SIM birlashtirilgan),
            // shuning uchun indeks bilan birga noyob kalit yasaymiz.
            const rowId = `${call.id}_${i}`;
            return (
              <CallRow
                key={rowId}
                rowId={rowId}
                call={call}
                isPlaying={playingId === rowId}
                onPlay={handlePlay}
                onStopPlaying={handleStop}
              />
            );
          })}
        </tbody>
      </table>
    </div>
  );
});

export default CallTable;
