"use client";

import { memo } from "react";

interface ErrorAlertProps {
  message: string;
  /** Berilsa — "Qayta urinish" tugmasi chiqadi. */
  onRetry?: () => void;
  onDismiss?: () => void;
}

/** Blokni to'sib turuvchi qizil xato paneli. */
export const ErrorAlert = memo(function ErrorAlert({ message, onRetry, onDismiss }: ErrorAlertProps) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400"
    >
      <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
      </svg>
      <span className="flex-1 min-w-0 break-words">{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="shrink-0 font-medium underline hover:no-underline">
          Qayta urinish
        </button>
      )}
      {onDismiss && (
        <button onClick={onDismiss} className="shrink-0 text-red-400 hover:text-red-600 transition-colors" aria-label="Yopish">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
});

interface WarningAlertProps {
  title: string;
  detail?: string;
  onDismiss?: () => void;
}

/** Sariq ogohlantirish — ma'lumot qisman yuklanganda (masalan PBX yiqilgan). */
export const WarningAlert = memo(function WarningAlert({ title, detail, onDismiss }: WarningAlertProps) {
  return (
    <div
      role="status"
      className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 text-sm text-amber-800 dark:text-amber-300"
    >
      <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" strokeLinecap="round" />
      </svg>
      <div className="flex-1 min-w-0">
        <span className="font-semibold">{title}</span>
        {detail && (
          <span className="text-amber-600 dark:text-amber-400 ml-2 font-mono text-xs break-all">{detail}</span>
        )}
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="shrink-0 text-amber-400 hover:text-amber-600 transition-colors" aria-label="Yopish">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  );
});

/** Ma'lumot yo'q holati. */
export const EmptyState = memo(function EmptyState({ message }: { message: string }) {
  return (
    <div className="px-4 py-12 text-center text-sm text-gray-400 dark:text-slate-500">
      {message}
    </div>
  );
});
