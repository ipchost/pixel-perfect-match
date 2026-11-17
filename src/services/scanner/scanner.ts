import type { ProbeResult, ScanOptions, ScanProgress, ScanResultItem, Server } from "@/types";
import { classifyProbe } from "@/services/servers/rating";
import { dedupKey } from "@/services/parsers/uri";

/**
 * Адаптер проверки. В нативной версии — Kotlin ServerScanner (через bridge),
 * в веб-прототипе — DemoProbeAdapter (симуляция, isDemo: true).
 */
export interface ProbeAdapter {
  readonly isDemo: boolean;
  probe(server: Server, opts: ScanOptions, signal: AbortSignal): Promise<ProbeResult>;
}

export const SCAN_LIMITS = {
  maxConcurrency: 8,
  minTimeoutMs: 1000,
  maxTimeoutMs: 15000,
  maxThroughputBytes: 10 * 1024 * 1024,
} as const;

export function clampOptions(o: ScanOptions): ScanOptions {
  return {
    ...o,
    concurrency: Math.max(1, Math.min(SCAN_LIMITS.maxConcurrency, Math.round(o.concurrency))),
    timeoutMs: Math.max(SCAN_LIMITS.minTimeoutMs, Math.min(SCAN_LIMITS.maxTimeoutMs, o.timeoutMs)),
    throughputBytesLimit: Math.max(0, Math.min(SCAN_LIMITS.maxThroughputBytes, o.throughputBytesLimit)),
  };
}

export interface ScanCallbacks {
  onProgress: (p: ScanProgress) => void;
  sourceName: (s: Server) => string;
}

/** Нормализация и дедупликация кандидатов; конфиги с ошибкой отсекаются до сетевой проверки. */
export function prepareCandidates(servers: Server[]) {
  const seen = new Set<string>();
  const unique: Server[] = [];
  let duplicates = 0;
  let invalid = 0;
  for (const s of servers) {
    if (s.status === "config_error" || !s.config.address || !s.config.secret) {
      invalid += 1;
      continue;
    }
    const key = dedupKey(s.config);
    if (seen.has(key)) {
      duplicates += 1;
      continue;
    }
    seen.add(key);
    unique.push(s);
  }
  return { unique, duplicates, invalid };
}

/**
 * Контролируемое сканирование: ограниченный пул параллелизма, тайм-аут на каждую проверку,
 * отмена через AbortSignal. Проверяются ТОЛЬКО переданные серверы из источников пользователя.
 */
export async function runScan(
  servers: Server[],
  rawOptions: ScanOptions,
  adapter: ProbeAdapter,
  signal: AbortSignal,
  cb: ScanCallbacks,
): Promise<ScanProgress> {
  const options = clampOptions(rawOptions);
  const { unique, duplicates, invalid } = prepareCandidates(servers);
  const progress: ScanProgress = {
    id: `scan_${Date.now().toString(36)}`,
    stage: "probing",
    total: unique.length,
    done: 0,
    duplicatesRemoved: duplicates,
    invalidConfigs: invalid,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    results: [],
    isDemo: adapter.isDemo,
  };
  const emit = () => cb.onProgress({ ...progress, results: [...progress.results] });
  emit();

  let cursor = 0;
  const worker = async () => {
    while (cursor < unique.length && !signal.aborted) {
      const server = unique[cursor++];
      if (!server) break;
      const timeoutCtrl = new AbortController();
      const timer = setTimeout(() => timeoutCtrl.abort(), options.timeoutMs);
      const onAbort = () => timeoutCtrl.abort();
      signal.addEventListener("abort", onAbort);
      let probe: ProbeResult;
      try {
        probe = await adapter.probe(server, options, timeoutCtrl.signal);
      } catch {
        probe = {
          latencyMs: null,
          method: options.method,
          downloadMbps: null,
          uploadMbps: null,
          checkedAt: new Date().toISOString(),
          success: false,
          errorCode: signal.aborted ? "CANCELLED" : "TIMEOUT",
        };
      } finally {
        clearTimeout(timer);
        signal.removeEventListener("abort", onAbort);
      }
      if (signal.aborted && probe.errorCode === "CANCELLED") break;
      const item: ScanResultItem = {
        serverId: server.id,
        status: classifyProbe(probe, server.probeHistory),
        latencyMs: probe.latencyMs,
        method: probe.method,
        downloadMbps: probe.downloadMbps,
        uploadMbps: probe.uploadMbps,
        checkedAt: probe.checkedAt,
        sourceName: cb.sourceName(server),
        errorCode: probe.errorCode,
        isDemo: adapter.isDemo,
      };
      progress.results.push(item);
      progress.done += 1;
      progress.stage = options.runThroughput ? "throughput" : "measuring";
      emit();
    }
  };

  await Promise.all(Array.from({ length: Math.min(options.concurrency, unique.length) }, worker));
  progress.stage = signal.aborted ? "cancelled" : "done";
  progress.finishedAt = new Date().toISOString();
  emit();
  return progress;
}
