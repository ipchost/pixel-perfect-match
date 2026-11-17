import type { ProbeResult, Server, ServerStatus } from "@/types";

export const LATENCY_FAST_MS = 150;
export const LATENCY_SLOW_MS = 300;

/** Классификация статуса по результату проверки и истории. */
export function classifyProbe(probe: ProbeResult, history: ProbeResult[] = []): ServerStatus {
  if (!probe.success) return probe.errorCode === "CONFIG_INVALID" ? "config_error" : "unavailable";
  const recent = [probe, ...history].slice(0, 6);
  const failRate = recent.filter((p) => !p.success).length / recent.length;
  if (recent.length >= 3 && failRate >= 0.34) return "unstable";
  if (probe.latencyMs !== null && probe.latencyMs > LATENCY_SLOW_MS) return "slow";
  return "available";
}

export function successRate(server: Server): number | null {
  const h = server.probeHistory;
  if (!h.length) return null;
  return h.filter((p) => p.success).length / h.length;
}

export function probeAgeMin(probe: ProbeResult | null, now = Date.now()): number | null {
  if (!probe) return null;
  return Math.max(0, Math.round((now - new Date(probe.checkedAt).getTime()) / 60_000));
}

export function isStale(
  probe: ProbeResult | null,
  staleAfterMin: number,
  now = Date.now(),
): boolean {
  const age = probeAgeMin(probe, now);
  return age === null ? false : age > staleAfterMin;
}

/**
 * Рейтинг сервера 0..100. Учитывает latency, успешность подключений, стабильность и свежесть теста.
 * Возвращает null, если сервер не проверялся — непроверенные серверы не ранжируются как «лучшие».
 */
export function scoreServer(server: Server, staleAfterMin = 120, now = Date.now()): number | null {
  const p = server.lastProbe;
  if (!p || !p.success || p.latencyMs === null) return null;
  if (server.status === "config_error" || server.status === "unavailable") return null;
  const latencyScore = Math.max(0, 1 - p.latencyMs / 600); // 0ms → 1, 600ms → 0
  const sr = successRate(server) ?? 0.5;
  const age = probeAgeMin(p, now) ?? 0;
  const freshness =
    age <= staleAfterMin ? 1 : Math.max(0.2, 1 - (age - staleAfterMin) / (staleAfterMin * 4));
  const speedBonus = p.downloadMbps !== null ? Math.min(1, p.downloadMbps / 100) : 0.5;
  const score = (latencyScore * 0.45 + sr * 0.3 + speedBonus * 0.1 + freshness * 0.15) * 100;
  return Math.round(score);
}

/** Выбор лучшего сервера для режима Auto. Исключённые из автовыбора серверы пропускаются. */
export function pickBestServer(
  servers: Server[],
  staleAfterMin = 120,
  now = Date.now(),
): Server | null {
  let best: Server | null = null;
  let bestScore = -1;
  for (const s of servers) {
    if (s.excludedFromAuto) continue;
    const sc = scoreServer(s, staleAfterMin, now);
    if (sc !== null && sc > bestScore) {
      best = s;
      bestScore = sc;
    }
  }
  return best;
}

/** Защита от бесконечного цикла автопереключений. */
export function canAutoSwitch(
  switchTimestamps: number[],
  maxPer10Min: number,
  now = Date.now(),
): boolean {
  const windowStart = now - 10 * 60_000;
  return switchTimestamps.filter((t) => t >= windowStart).length < maxPer10Min;
}
