"use client";

import { useEffect, useRef, useState } from "react";
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

function fmtAudioTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

interface AudioPlayerProps { url: string; onClose: () => void; }
function AudioPlayer({ url, onClose }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onCanPlay = () => { setLoading(false); a.play().catch(() => setError(true)); };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTimeUpdate = () => setCurrent(a.currentTime);
    const onDurationChange = () => setDuration(a.duration);
    const onEnded = () => setPlaying(false);
    const onError = () => { setLoading(false); setError(true); };

    a.addEventListener("canplay", onCanPlay);
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("timeupdate", onTimeUpdate);
    a.addEventListener("durationchange", onDurationChange);
    a.addEventListener("ended", onEnded);
    a.addEventListener("error", onError);
    return () => {
      a.removeEventListener("canplay", onCanPlay);
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("timeupdate", onTimeUpdate);
      a.removeEventListener("durationchange", onDurationChange);
      a.removeEventListener("ended", onEnded);
      a.removeEventListener("error", onError);
      a.pause();
    };
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    playing ? a.pause() : a.play().catch(() => setError(true));
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    a.currentTime = Number(e.target.value);
  };

  const pct = duration ? (current / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-2 min-w-0 max-w-xs">
      <audio ref={audioRef} src={url} preload="auto" className="hidden" />

      {/* Play/Pause */}
      <button onClick={toggle} disabled={loading || error}
        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
          error ? "bg-red-100 text-red-400" :
          loading ? "bg-gray-100 text-gray-300" :
          "bg-blue-600 hover:bg-blue-700 text-white"
        }`}>
        {loading ? (
          <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9" strokeLinecap="round" />
          </svg>
        ) : error ? (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" />
          </svg>
        ) : playing ? (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
          </svg>
        ) : (
          <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>

      {/* Progress bar */}
      {!error && (
        <div className="flex-1 flex items-center gap-1.5 min-w-0">
          <div className="relative flex-1 h-1.5 bg-gray-200 dark:bg-slate-600 rounded-full overflow-visible">
            <div className="h-full bg-blue-500 rounded-full transition-none" style={{ width: `${pct}%` }} />
            <input
              type="range" min={0} max={duration || 100} step={0.1} value={current}
              onChange={seek}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono whitespace-nowrap shrink-0">
            {fmtAudioTime(current)}{duration ? ` / ${fmtAudioTime(duration)}` : ""}
          </span>
        </div>
      )}

      {error && <span className="text-[10px] text-red-400">Xato</span>}

      {/* Close */}
      <button onClick={onClose} className="text-gray-300 hover:text-gray-500 dark:text-slate-600 dark:hover:text-slate-400 transition-colors shrink-0">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

interface Props { records: UnifiedCall[]; loading: boolean; }

export default function UnifiedCallTable({ records, loading }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);

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
          {records.map((c, i) => {
            const rowId = `${c.id}_${i}`;
            const isActive = activeId === rowId;
            return (
              <tr key={rowId} className={`hover:bg-gray-50 dark:hover:bg-slate-800/40 transition-colors ${isActive ? "bg-blue-50/60 dark:bg-blue-900/10" : ""}`}>
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
                    isActive ? (
                      <AudioPlayer url={c.recordingUrl} onClose={() => setActiveId(null)} />
                    ) : (
                      <button onClick={() => setActiveId(rowId)}
                        className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-500 dark:text-blue-400 flex items-center justify-center transition-colors"
                        title="Ijro etish">
                        <svg className="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </button>
                    )
                  ) : (
                    <span className="text-gray-200 dark:text-slate-700">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
