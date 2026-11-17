import type { Protocol, Server } from "@/types";
import { scoreServer, successRate } from "@/services/servers/rating";

export type StatusFilter = "all" | "working" | "unchecked" | "problem";
export type SortKey = "rating" | "latency" | "name" | "stability";

export function filterServers(list: Server[], q: string, status: StatusFilter, protocol: Protocol | "all") {
  const query = q.trim().toLowerCase();
  return list.filter((s) => {
    if (query && !`${s.name} ${s.city} ${s.countryCode}`.toLowerCase().includes(query)) return false;
    if (protocol !== "all" && s.config.protocol !== protocol) return false;
    if (status === "working") return s.status === "available" || s.status === "slow";
    if (status === "unchecked") return s.status === "unchecked";
    if (status === "problem") return s.status === "unavailable" || s.status === "unstable" || s.status === "config_error";
    return true;
  });
}

export function sortServers(list: Server[], key: SortKey, staleAfterMin = 120) {
  const arr = [...list];
  if (key === "name") return arr.sort((a, b) => a.name.localeCompare(b.name));
  if (key === "latency") return arr.sort((a, b) => (a.lastProbe?.latencyMs ?? 1e9) - (b.lastProbe?.latencyMs ?? 1e9));
  if (key === "stability") return arr.sort((a, b) => (successRate(b) ?? -1) - (successRate(a) ?? -1));
  return arr.sort((a, b) => (scoreServer(b, staleAfterMin) ?? -1) - (scoreServer(a, staleAfterMin) ?? -1));
}
