"use client";

import { useRef, useState } from "react";
import { CDRRecord } from "@/types/cdr";
import { formatDateTime, formatDuration, formatTime } from "@/lib/utils";

function AudioPlayer({ recId }: { recId: number }) {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  async function toggle() {
    if (playing && audioRef.current) {
      audioRef.current.pause();
      setPlaying(false);
      return;
    }

    setError(false);

    if (!audioRef.current) {
      setLoading(true);
      const audio = new Audio(`/api/recording?id=${recId}`);
      audioRef.current = audio;
      audio.onended = () => setPlaying(false);
      audio.onerror = () => { setPlaying(false); setLoading(false); setError(true); };
      audio.oncanplaythrough = () => setLoading(false);
      try {
        await audio.play();
        setPlaying(true);
      } catch {
        setPlaying(false);
        setLoading(false);
        setError(true);
      }
    } else {
      try {
        await audioRef.current.play();
        setPlaying(true);
      } catch {
        setError(true);
      }
    }
  }

  return (
    <button
      onClick={toggle}
      title={error ? "Xato: yozuv yuklanmadi" : playing ? "To'xtatish" : "Tinglash"}
      className={`transition-colors ${error ? "text-red-400 hover:text-red-600" : "text-gray-400 hover:text-blue-600"}`}
    >
      {loading ? (
        <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9" strokeLinecap="round" />
        </svg>
      ) : playing ? (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      )}
    </button>
  );
}

const PAGE_SIZES = [10, 20, 40, 60, 120] as const;

interface Props {
  records: CDRRecord[];
  loading: boolean;
}

function CallTypeIcon({ type }: { type: string }) {
  if (type === "Inbound") {
    return (
      <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <path d="M7 7v10h10" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M17 7L7 17" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "Outbound") {
    return (
      <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
        <path d="M7 17L17 7M17 7H7M17 7v10" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  // Internal
  return (
    <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8M12 8l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MissedDot({ record }: { record: CDRRecord }) {
  const isMissed =
    record.call_type === "Inbound" && record.disposition !== "ANSWERED";
  const isFailedOut =
    record.call_type === "Outbound" && record.disposition !== "ANSWERED";
  if (isMissed || isFailedOut) {
    return <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-red-400 rounded-l" />;
  }
  return null;
}

export default function CallTable({ records, loading }: Props) {
  const [pageSize, setPageSize] = useState<number>(20);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(records.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRecords = records.slice((safePage - 1) * pageSize, safePage * pageSize);

  function handlePageSize(size: number) {
    setPageSize(size);
    setPage(1);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Yuklanmoqda...
      </div>
    );
  }

  if (!records.length) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        Qo&apos;ng&apos;iroqlar topilmadi
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-14">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-4 py-3 font-medium text-gray-600 w-12">Turi</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Sana va vaqti</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Kimdan</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Kimga</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Tashqi raqam</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Qo&apos;ng&apos;iroq</th>
            <th className="text-left px-4 py-3 font-medium text-gray-600">Suhbat</th>
            <th className="text-right px-4 py-3 font-medium text-gray-600">Amallar</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {pageRecords.map((r, i) => (
            <tr key={`${r.uid}-${i}`} className="relative hover:bg-blue-50 transition-colors">
              <td className="px-4 py-3 relative">
                <MissedDot record={r} />
                <CallTypeIcon type={r.call_type} />
              </td>
              <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                {formatDateTime(r.time)}
              </td>
              <td className="px-4 py-3 text-gray-800 font-medium">
                {r.call_from_name ? `${r.call_from_name} (${r.call_from_number})` : r.call_from_number || "-"}
              </td>
              <td className="px-4 py-3 text-gray-800">
                {r.call_to_name && r.call_to_name !== r.call_to_number
                  ? `${r.call_to_name} (${r.call_to_number})`
                  : r.call_to_number || "-"}
              </td>
              <td className="px-4 py-3 text-gray-500 font-mono">
                {r.src_trunk || r.dst_trunk || "-"}
              </td>
              <td className="px-4 py-3 text-gray-700 font-mono whitespace-nowrap">{formatTime(r.time)}</td>
              <td className="px-4 py-3 text-gray-700 font-mono">{formatDuration(r.talk_duration ?? 0)}</td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  {r.rec_id ? (
                    <>
                      <AudioPlayer recId={r.rec_id} />
                      <a
                        href={`/api/recording?id=${r.rec_id}&download=1`}
                        download
                        title="Yuklab olish"
                        className="text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </a>
                    </>
                  ) : (
                    <>
                      <button className="text-gray-200 cursor-not-allowed" disabled title="Yozuv yo'q">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                      </button>
                      <button className="text-gray-200 cursor-not-allowed" disabled title="Yozuv yo'q">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      <div className="fixed bottom-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white text-sm text-gray-600 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-2">
          <span className="text-gray-500">Sahifada:</span>
          {PAGE_SIZES.map(s => (
            <button
              key={s}
              onClick={() => handlePageSize(s)}
              className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                pageSize === s
                  ? "bg-blue-600 text-white"
                  : "text-gray-500 hover:bg-gray-200"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <span className="text-gray-400 mr-2 text-xs">
            {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, records.length)} / {records.length}
          </span>
          <button
            onClick={() => setPage(1)}
            disabled={safePage === 1}
            className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Birinchi sahifa"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={safePage === 1}
            className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Oldingi"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <span className="px-2 text-xs font-medium">{safePage} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={safePage === totalPages}
            className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Keyingi"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M9 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={safePage === totalPages}
            className="p-1 rounded hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Oxirgi sahifa"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="M13 7l5 5-5 5M6 7l5 5-5 5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
