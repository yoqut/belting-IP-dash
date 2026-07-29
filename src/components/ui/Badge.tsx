"use client";

import { memo } from "react";

type BadgeTone = "blue" | "purple" | "green" | "red" | "gray" | "orange";

const TONE_CLASS: Record<BadgeTone, string> = {
  blue: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  purple: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  green: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
  red: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
  gray: "bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-300",
  orange: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
};

interface BadgeProps {
  tone: BadgeTone;
  children: React.ReactNode;
}

export const Badge = memo(function Badge({ tone, children }: BadgeProps) {
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${TONE_CLASS[tone]}`}>
      {children}
    </span>
  );
});

/** "Javob berilgan" / "Javobsiz" — loyihada 4 joyda takrorlanardi. */
export const AnsweredBadge = memo(function AnsweredBadge({ answered }: { answered: boolean }) {
  return (
    <Badge tone={answered ? "green" : "red"}>
      {answered ? "Javob berilgan" : "Javobsiz"}
    </Badge>
  );
});
