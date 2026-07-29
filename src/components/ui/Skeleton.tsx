"use client";

interface SkeletonProps {
  className?: string;
}

/** Bitta "yaltirab turuvchi" blok. */
export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      aria-hidden
      className={`animate-pulse rounded bg-gray-200 dark:bg-slate-700 ${className}`}
    />
  );
}

interface TableSkeletonProps {
  rows?: number;
  columns: number;
}

/**
 * Jadval yuklanayotganda ustunlar soniga mos "ko'lanka".
 * Bo'sh "Yuklanmoqda..." matnidan farqli o'laroq layout siljimaydi (CLS = 0).
 */
export function TableSkeleton({ rows = 8, columns }: TableSkeletonProps) {
  return (
    <div className="divide-y divide-gray-50 dark:divide-slate-700/50" role="status" aria-label="Yuklanmoqda">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-3">
          {Array.from({ length: columns }, (_, c) => (
            <Skeleton
              key={c}
              className="h-3.5 flex-1"
              // Har bir katak eni biroz farq qilsa, tabiiyroq ko'rinadi
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Stat kartochkalar gridi uchun. */
export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2" role="status" aria-label="Yuklanmoqda">
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-3 space-y-2"
        >
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-7 w-14" />
        </div>
      ))}
    </div>
  );
}
