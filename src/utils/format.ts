/** "125" → "2m 5s". Nol bo'lsa tire. Jadval kataklari uchun. */
export function formatDuration(sec: number): string {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/** "3725" → "1s 2d 5s". Uzun suhbat vaqtlari uchun. */
export function formatDurationLong(sec: number): string {
  if (!sec) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}s ${m}d ${s}s`;
  if (m > 0) return `${m}d ${s}s`;
  return `${s}s`;
}

/** "125" → "02:05" yoki "01:02:05". Audio pleyer va hisobotlar uchun. */
export function formatClock(seconds: number): string {
  if (!seconds || seconds < 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** Unix soniya → "28.07 14:35". */
export function formatUnixDateTime(unix: number): string {
  if (!unix) return "—";
  const d = new Date(unix * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Unix soniya → "14:35:02". */
export function formatUnixTime(unix: number): string {
  if (!unix) return "—";
  return new Date(unix * 1000).toLocaleTimeString("uz-UZ", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** PBX "DD/MM/YYYY HH:mm:ss" → "28-Iyl 14:35". */
export function formatPBXDateTime(raw: string): string {
  if (!raw) return "—";
  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}:\d{2}:\d{2})$/);
  if (!match) return raw;
  const months = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];
  return `${parseInt(match[1], 10)}-${months[parseInt(match[2], 10) - 1]} ${match[4].slice(0, 5)}`;
}

/** PBX "DD/MM/YYYY HH:mm:ss" → "14:35:02". */
export function formatPBXTime(raw: string): string {
  if (!raw) return "—";
  const match = raw.match(/(\d{2}:\d{2}:\d{2})$/);
  return match ? match[1] : raw;
}

/** Bo'luvchi nol bo'lganda bo'sh qator qaytaradi (NaN% chiqmasligi uchun). */
export function percent(part: number, total: number, fallback = ""): string {
  if (!total) return fallback;
  return `${Math.round((part / total) * 100)}%`;
}

/** Joriy vaqt — "yangilandi" belgisi uchun. */
export function nowTimeLabel(): string {
  return new Date().toLocaleTimeString("uz-UZ");
}
