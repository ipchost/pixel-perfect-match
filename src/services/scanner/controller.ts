import { useAppStore } from "@/app/store";
import { getBridge } from "@/services/native/demo-bridge";
import { runScan } from "./scanner";
import type { ScanOptions, Server } from "@/types";

let abort: AbortController | null = null;

export function isScanning() {
  return abort !== null;
}

/** Кандидаты: только серверы из включённых источников пользователя (+ избранное по настройке). */
export function scanCandidates(): Server[] {
  const st = useAppStore.getState();
  const cfg = st.settings.scan;
  const enabled = new Set(st.subscriptions.filter((s) => s.enabled).map((s) => s.id));
  const fav = new Set(st.favorites);
  return st.servers.filter((s) => {
    if (cfg.includeFavorites && fav.has(s.id)) return true;
    if (s.subscriptionId === null) return true; // добавлен вручную пользователем
    return cfg.onlyActiveSources ? enabled.has(s.subscriptionId) : true;
  });
}

export async function startScan(opts: { serverIds?: string[]; runThroughput?: boolean } = {}) {
  if (abort) return;
  abort = new AbortController();
  const st = useAppStore.getState();
  const cfg = st.settings.scan;
  const list = opts.serverIds ? st.servers.filter((s) => opts.serverIds!.includes(s.id)) : scanCandidates();
  const options: ScanOptions = {
    concurrency: cfg.concurrency,
    timeoutMs: cfg.timeoutMs,
    throughputBytesLimit: cfg.throughputLimitKb * 1024,
    method: cfg.method,
    onlyActiveSources: cfg.onlyActiveSources,
    includeFavorites: cfg.includeFavorites,
    runThroughput: opts.runThroughput ?? true,
  };
  const bridge = getBridge();
  const subName = new Map(st.subscriptions.map((s) => [s.id, s.name]));
  const ids = new Set(list.map((s) => s.id));
  useAppStore.setState((s) => ({
    servers: s.servers.map((x) => (ids.has(x.id) && x.status !== "config_error" ? { ...x, status: "checking" } : x)),
    scan: { id: "pending", stage: "fetching", total: list.length, done: 0, duplicatesRemoved: 0, invalidConfigs: 0, startedAt: new Date().toISOString(), finishedAt: null, results: [], isDemo: bridge.isDemo },
  }));
  // Этапы получения/нормализации/валидации — без сетевых запросов в демо.
  for (const stage of ["fetching", "normalizing", "validating"] as const) {
    if (abort.signal.aborted) break;
    useAppStore.setState((s) => ({ scan: s.scan ? { ...s.scan, stage } : s.scan }));
    await new Promise((r) => setTimeout(r, 350));
  }
  const signal = abort.signal;
  let seen = 0;
  const final = await runScan(list, options, { isDemo: bridge.isDemo, probe: (s, o, sig) => bridge.scanner.probe(s, o, sig) }, signal, {
    onProgress: (p) => {
      const fresh = p.results.slice(seen);
      seen = p.results.length;
      fresh.forEach((r) => useAppStore.getState().applyScanResult(r));
      useAppStore.setState({ scan: p });
    },
    sourceName: (s) => (s.subscriptionId ? subName.get(s.subscriptionId) ?? "—" : "Вручную"),
  });
  // Серверы, которые не успели проверить (отмена) — вернуть в прежний статус «не проверен», если не было пробы.
  const checked = new Set(final.results.map((r) => r.serverId));
  useAppStore.setState((s) => ({
    servers: s.servers.map((x) => (x.status === "checking" && !checked.has(x.id) ? { ...x, status: x.lastProbe ? (x.lastProbe.success ? "available" : "unavailable") : "unchecked" } : x)),
  }));
  const working = final.results.filter((r) => r.status === "available" || r.status === "slow").length;
  useAppStore.getState().addEvent({
    level: final.stage === "cancelled" ? "warning" : "info",
    category: "scan",
    message: final.stage === "cancelled" ? `Сканирование остановлено: проверено ${final.done} из ${final.total}` : `Сканирование завершено: ${working} рабочих из ${final.total}`,
    isDemo: bridge.isDemo,
  });
  abort = null;
}

export function cancelScan() {
  abort?.abort();
}
