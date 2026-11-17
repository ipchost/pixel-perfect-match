import type { Protocol, Server } from "@/types";
import { scoreServer, successRate } from "@/services/servers/rating";

export type StatusFilter = "all" | "working" | "unchecked" | "problem";
export type SortKey =
  "rating" | "latency" | "name" | "stability" | "country" | "city" | "download" | "upload";

/** Рабочий = успешная проверка, не старше staleAfterMin. Устаревшие результаты не считаются текущими. */
export function isFreshWorking(s: Server, staleAfterMin: number, now = Date.now()) {
  if (s.status !== "available" && s.status !== "slow") return false;
  if (!s.lastProbe?.success) return false;
  return now - Date.parse(s.lastProbe.checkedAt) <= staleAfterMin * 60_000;
}

export function filterServers(
  list: Server[],
  q: string,
  status: StatusFilter,
  protocol: Protocol | "all",
  staleAfterMin = 30,
  now = Date.now(),
) {
  const query = q.trim().toLowerCase();
  return list.filter((s) => {
    if (query && !`${s.name} ${s.city} ${s.countryCode}`.toLowerCase().includes(query))
      return false;
    if (protocol !== "all" && s.config.protocol !== protocol) return false;
    if (status === "working") return isFreshWorking(s, staleAfterMin, now);
    if (status === "unchecked") return s.status === "unchecked";
    if (status === "problem")
      return s.status === "unavailable" || s.status === "unstable" || s.status === "config_error";
    return true;
  });
}

/** Сравнение с null в конце: dir=1 по возрастанию, -1 по убыванию. */
function nullsLast(a: number | null | undefined, b: number | null | undefined, dir: 1 | -1) {
  const an = a == null;
  const bn = b == null;
  if (an && bn) return 0;
  if (an) return 1;
  if (bn) return -1;
  return (a - b) * dir;
}

function textNullsLast(a: string, b: string, locale: string) {
  if (!a && !b) return 0;
  if (!a) return 1;
  if (!b) return -1;
  return a.localeCompare(b, locale);
}

export function sortServers(
  list: Server[],
  key: SortKey,
  staleAfterMin = 30,
  countryName: (code: string) => string = (c) => c,
  locale = "ru",
) {
  const arr = [...list];
  switch (key) {
    case "name":
      return arr.sort((a, b) => a.name.localeCompare(b.name, locale));
    case "country":
      return arr.sort((a, b) =>
        textNullsLast(
          a.countryCode === "XX" ? "" : countryName(a.countryCode),
          b.countryCode === "XX" ? "" : countryName(b.countryCode),
          locale,
        ),
      );
    case "city":
      return arr.sort((a, b) => textNullsLast(a.city, b.city, locale));
    case "latency":
      return arr.sort((a, b) => nullsLast(a.lastProbe?.latencyMs, b.lastProbe?.latencyMs, 1));
    case "download":
      return arr.sort((a, b) => nullsLast(a.lastProbe?.downloadMbps, b.lastProbe?.downloadMbps, -1));
    case "upload":
      return arr.sort((a, b) => nullsLast(a.lastProbe?.uploadMbps, b.lastProbe?.uploadMbps, -1));
    case "stability":
      return arr.sort((a, b) => nullsLast(successRate(a), successRate(b), -1));
    default:
      return arr.sort((a, b) =>
        nullsLast(scoreServer(a, staleAfterMin), scoreServer(b, staleAfterMin), -1),
      );
  }
}
