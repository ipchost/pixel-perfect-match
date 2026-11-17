import type { Messages } from "@/localization";

export function formatBytes(bytes: number, locale = "ru"): string {
  const units = locale === "ru" ? ["Б", "КБ", "МБ", "ГБ", "ТБ"] : ["B", "KB", "MB", "GB", "TB"];
  let v = bytes;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toLocaleString(locale, { maximumFractionDigits: v < 10 && i > 0 ? 1 : 0 })} ${units[i]}`;
}

/** bytes/s → строка в Мбит/с или Кбит/с */
export function formatBps(bps: number, locale = "ru"): string {
  const bits = bps * 8;
  if (bits >= 1_000_000) return `${(bits / 1_000_000).toLocaleString(locale, { maximumFractionDigits: 1 })} ${locale === "ru" ? "Мбит/с" : "Mbps"}`;
  return `${Math.round(bits / 1000).toLocaleString(locale)} ${locale === "ru" ? "Кбит/с" : "Kbps"}`;
}

export function formatDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

export function formatAge(iso: string | null, t: Messages, now = Date.now()): string {
  if (!iso) return t.common.never;
  const min = Math.round((now - new Date(iso).getTime()) / 60_000);
  if (min < 1) return t.common.justNow;
  if (min < 60) return t.common.minutesAgo(min);
  const h = Math.round(min / 60);
  if (h < 48) return t.common.hoursAgo(h);
  return t.common.daysAgo(Math.round(h / 24));
}

export function formatDateTime(iso: string, locale = "ru"): string {
  return new Date(iso).toLocaleString(locale, { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}
