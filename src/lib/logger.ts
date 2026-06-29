type Level = "info" | "ok" | "warn" | "error" | "cache";

const COLORS: Record<Level, string> = {
  info:  "\x1b[36m",   // cyan
  ok:    "\x1b[32m",   // green
  warn:  "\x1b[33m",   // yellow
  error: "\x1b[31m",   // red
  cache: "\x1b[35m",   // magenta
};
const ICONS: Record<Level, string> = {
  info:  "→",
  ok:    "✓",
  warn:  "⚠",
  error: "✗",
  cache: "◈",
};
const RESET = "\x1b[0m";
const DIM   = "\x1b[2m";

function ts(): string {
  return new Date().toLocaleTimeString("uz-UZ", { hour12: false });
}

function fmt(level: Level, scope: string, msg: string, extra?: Record<string, unknown>): string {
  const col = COLORS[level];
  const icon = ICONS[level];
  const extraStr = extra ? "  " + DIM + JSON.stringify(extra) + RESET : "";
  return `${DIM}${ts()}${RESET}  ${col}${icon} [${scope}]${RESET}  ${msg}${extraStr}`;
}

export const log = {
  info:  (scope: string, msg: string, extra?: Record<string, unknown>) => console.log(fmt("info",  scope, msg, extra)),
  ok:    (scope: string, msg: string, extra?: Record<string, unknown>) => console.log(fmt("ok",    scope, msg, extra)),
  warn:  (scope: string, msg: string, extra?: Record<string, unknown>) => console.warn(fmt("warn", scope, msg, extra)),
  error: (scope: string, msg: string, extra?: Record<string, unknown>) => console.error(fmt("error", scope, msg, extra)),
  cache: (scope: string, msg: string, extra?: Record<string, unknown>) => console.log(fmt("cache", scope, msg, extra)),
};

/** So'rov vaqtini o'lchash uchun */
export function timer(): () => number {
  const start = Date.now();
  return () => Date.now() - start;
}
