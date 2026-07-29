"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { formatClock } from "@/utils/format";

interface Props {
  url: string;
  onClose: () => void;
}

interface PlayerState {
  playing: boolean;
  current: number;
  duration: number;
  loading: boolean;
  failed: boolean;
}

const INITIAL: PlayerState = { playing: false, current: 0, duration: 0, loading: true, failed: false };

/**
 * Jadval ichidagi ixcham audio pleyer.
 *
 * Barcha holat bitta obyektda — avval 5 ta alohida `useState` bor edi va
 * `timeupdate` hodisasi (soniyasiga ~4 marta) har safar to'liq render sikli
 * boshlardi. Endi bitta `setState` chaqiruvi bo'ladi.
 */
const AudioPlayer = memo(function AudioPlayer({ url, onClose }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<PlayerState>(INITIAL);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const patch = (p: Partial<PlayerState>) => setState(s => ({ ...s, ...p }));

    const onCanPlay = () => {
      patch({ loading: false });
      audio.play().catch(() => patch({ failed: true }));
    };
    const onPlay = () => patch({ playing: true });
    const onPause = () => patch({ playing: false });
    const onEnded = () => patch({ playing: false });
    const onTimeUpdate = () => patch({ current: audio.currentTime });
    const onDurationChange = () => patch({ duration: audio.duration || 0 });
    const onError = () => patch({ loading: false, failed: true });

    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("error", onError);
      audio.pause();
    };
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) audio.play().catch(() => setState(s => ({ ...s, failed: true })));
    else audio.pause();
  }, []);

  const seek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (audio) audio.currentTime = Number(e.target.value);
  }, []);

  const { playing, current, duration, loading, failed } = state;
  const progress = duration ? (current / duration) * 100 : 0;

  return (
    <div className="flex items-center gap-2 min-w-0 max-w-xs">
      <audio ref={audioRef} src={url} preload="auto" className="hidden" />

      <button
        onClick={toggle}
        disabled={loading || failed}
        aria-label={playing ? "Pauza" : "Ijro etish"}
        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
          failed ? "bg-red-100 text-red-400"
            : loading ? "bg-gray-100 text-gray-300"
            : "bg-blue-600 hover:bg-blue-700 text-white"
        }`}
      >
        {loading ? (
          <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9" strokeLinecap="round" />
          </svg>
        ) : failed ? (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" />
          </svg>
        ) : playing ? (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
        ) : (
          <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
        )}
      </button>

      {!failed && (
        <div className="flex-1 flex items-center gap-1.5 min-w-0">
          <div className="relative flex-1 h-1.5 bg-gray-200 dark:bg-slate-600 rounded-full">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${progress}%` }} />
            <input
              type="range"
              min={0}
              max={duration || 100}
              step={0.1}
              value={current}
              onChange={seek}
              aria-label="Vaqt bo'yicha o'tish"
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
          <span className="text-[10px] text-gray-400 dark:text-slate-500 font-mono whitespace-nowrap shrink-0">
            {formatClock(current)}{duration ? ` / ${formatClock(duration)}` : ""}
          </span>
        </div>
      )}

      {failed && <span className="text-[10px] text-red-400">Xato</span>}

      <button
        onClick={onClose}
        aria-label="Pleyerni yopish"
        className="text-gray-300 hover:text-gray-500 dark:text-slate-600 dark:hover:text-slate-400 transition-colors shrink-0"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
});

export default AudioPlayer;
