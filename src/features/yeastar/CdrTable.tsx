"use client";

import { memo, useCallback, useMemo, useRef, useState } from "react";
import { CDRRecord } from "@/types/cdr";
import { EmptyState } from "@/components/ui/Feedback";
import { TableSkeleton } from "@/components/ui/Skeleton";
import PaginationBar from "@/features/dashboard/PaginationBar";
import { formatClock, formatPBXDateTime, formatPBXTime } from "@/utils/format";

const PAGE_SIZES = [10, 20, 40, 60, 120] as const;
const COLUMNS = ["Turi", "Sana va vaqti", "Kimdan", "Kimga", "Tashqi raqam", "Qo'ng'iroq", "Suhbat", "Amallar"];

/* ─────────────────────────── Yozuv pleyeri ─────────────────────────── */

const RecordingButton = memo(function RecordingButton({ recId }: { recId: number }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "playing" | "failed">("idle");

  const toggle = useCallback(async () => {
    const existing = audioRef.current;

    if (existing && !existing.paused) {
      existing.pause();
      setStatus("idle");
      return;
    }

    if (existing) {
      try {
        await existing.play();
        setStatus("playing");
      } catch {
        setStatus("failed");
      }
      return;
    }

    setStatus("loading");
    const audio = new Audio(`/api/recording?id=${recId}`);
    audioRef.current = audio;
    audio.onended = () => setStatus("idle");
    audio.onerror = () => setStatus("failed");
    try {
      await audio.play();
      setStatus("playing");
    } catch {
      setStatus("failed");
    }
  }, [recId]);

  return (
    <button
      onClick={toggle}
      title={status === "failed" ? "Xato: yozuv yuklanmadi" : status === "playing" ? "To'xtatish" : "Tinglash"}
      aria-label="Yozuvni ijro etish"
      className={`transition-colors ${status === "failed" ? "text-red-400 hover:text-red-600" : "text-gray-400 hover:text-blue-600"}`}
    >
      {status === "loading" ? (
        <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9" strokeLinecap="round" />
        </svg>
      ) : status === "playing" ? (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
      ) : (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
      )}
    </button>
  );
});

const DownloadIcon = (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
    <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ─────────────────────────── Turi ikonkasi ─────────────────────────── */

const TYPE_ICONS: Record<string, React.ReactNode> = {
  Inbound: (
    <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M7 7v10h10" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 7L7 17" strokeLinecap="round" />
    </svg>
  ),
  Outbound: (
    <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M7 17L17 7M17 7H7M17 7v10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Internal: (
    <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12h8M12 8l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
};

/* ─────────────────────────── Qator ─────────────────────────── */

const CdrRow = memo(function CdrRow({ record: r }: { record: CDRRecord }) {
  // Javobsiz qo'ng'iroqlar chap chekkada qizil chiziq bilan belgilanadi
  const unanswered = r.disposition !== "ANSWERED" && r.call_type !== "Internal";

  const from = r.call_from_name ? `${r.call_from_name} (${r.call_from_number})` : r.call_from_number || "—";
  const to = r.call_to_name && r.call_to_name !== r.call_to_number
    ? `${r.call_to_name} (${r.call_to_number})`
    : r.call_to_number || "—";

  return (
    <tr className="relative hover:bg-blue-50 dark:hover:bg-slate-700/30 transition-colors">
      <td className="px-4 py-3 relative">
        {unanswered && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-red-400 rounded-l" />}
        {TYPE_ICONS[r.call_type] ?? TYPE_ICONS.Internal}
      </td>
      <td className="px-4 py-3 text-gray-700 dark:text-slate-300 whitespace-nowrap">{formatPBXDateTime(r.time)}</td>
      <td className="px-4 py-3 text-gray-800 dark:text-slate-200 font-medium">{from}</td>
      <td className="px-4 py-3 text-gray-800 dark:text-slate-200">{to}</td>
      <td className="px-4 py-3 text-gray-500 dark:text-slate-400 font-mono">{r.src_trunk || r.dst_trunk || "—"}</td>
      <td className="px-4 py-3 text-gray-700 dark:text-slate-300 font-mono whitespace-nowrap">{formatPBXTime(r.time)}</td>
      <td className="px-4 py-3 text-gray-700 dark:text-slate-300 font-mono">{formatClock(r.talk_duration ?? 0)}</td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          {r.rec_id ? (
            <>
              <RecordingButton recId={r.rec_id} />
              <a
                href={`/api/recording?id=${r.rec_id}&download=1`}
                download
                title="Yuklab olish"
                className="text-gray-400 hover:text-blue-600 transition-colors"
              >
                {DownloadIcon}
              </a>
            </>
          ) : (
            <span className="text-gray-200 dark:text-slate-700 text-xs">Yozuv yo&apos;q</span>
          )}
        </div>
      </td>
    </tr>
  );
});

/* ─────────────────────────── Jadval ─────────────────────────── */

interface Props {
  records: CDRRecord[];
  loading: boolean;
}

const CdrTable = memo(function CdrTable({ records, loading }: Props) {
  const [pageSize, setPageSize] = useState<number>(20);
  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(records.length / pageSize));
  // Filter natijasi qisqarsa joriy sahifa oralikdan chiqib ketishi mumkin
  const safePage = Math.min(page, totalPages);

  const pageRecords = useMemo(
    () => records.slice((safePage - 1) * pageSize, safePage * pageSize),
    [records, safePage, pageSize],
  );

  const handlePageSize = useCallback((size: number) => {
    setPageSize(size);
    setPage(1);
  }, []);

  if (loading) return <TableSkeleton columns={COLUMNS.length} />;
  if (records.length === 0) return <EmptyState message="Qo'ng'iroqlar topilmadi" />;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700">
              {COLUMNS.map((col, i) => (
                <th
                  key={col}
                  className={`px-4 py-3 font-medium text-gray-600 dark:text-slate-400 ${
                    i === COLUMNS.length - 1 ? "text-right" : "text-left"
                  }`}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
            {pageRecords.map((r, i) => (
              <CdrRow key={`${r.uid}-${i}`} record={r} />
            ))}
          </tbody>
        </table>
      </div>

      <PaginationBar
        page={safePage}
        pageSize={pageSize}
        totalItems={records.length}
        totalPages={totalPages}
        onPageChange={setPage}
        onPageSizeChange={handlePageSize}
        pageSizes={PAGE_SIZES}
      />
    </>
  );
});

export default CdrTable;
