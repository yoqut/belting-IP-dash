export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "00:00";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
  return `${pad(m)}:${pad(s)}`;
}

export function formatTime(raw: string): string {
  if (!raw) return "-";
  const match = raw.match(/(\d{2}:\d{2}:\d{2})$/);
  return match ? match[1] : raw;
}

export function formatDateTime(raw: string): string {
  if (!raw) return "-";
  // PBX format: "DD/MM/YYYY HH:mm:ss"
  const match = raw.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}:\d{2}:\d{2})$/);
  if (match) {
    const months = ["Yan","Fev","Mar","Apr","May","Iyn","Iyl","Avg","Sen","Okt","Noy","Dek"];
    const monthIdx = parseInt(match[2]) - 1;
    return `${parseInt(match[1])}-${months[monthIdx]} ${match[3].slice(0,5)}`;
  }
  return raw;
}
