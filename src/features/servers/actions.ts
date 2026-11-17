import { useAppStore } from "@/app/store";
import { getBridge } from "@/services/native/demo-bridge";
import { classifyProbe } from "@/services/servers/rating";
import type { ScanOptions } from "@/types";

/** Проверка одного сервера (с тестом скорости по желанию). В вебе — DEMO-проба. */
export async function probeOne(id: string, runThroughput = false) {
  const st = useAppStore.getState();
  const server = st.servers.find((s) => s.id === id);
  if (!server) return;
  const cfg = st.settings.scan;
  const opts: ScanOptions = { concurrency: 1, timeoutMs: cfg.timeoutMs, throughputBytesLimit: runThroughput ? cfg.throughputLimitKb * 1024 : 0, method: cfg.method, onlyActiveSources: false, includeFavorites: true, runThroughput };
  st.updateServer(id, { status: "checking" });
  const bridge = getBridge();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), cfg.timeoutMs + (runThroughput ? 8000 : 0));
  try {
    const probe = await bridge.scanner.probe(server, opts, ctrl.signal);
    st.applyScanResult({ serverId: id, status: classifyProbe(probe, server.probeHistory), latencyMs: probe.latencyMs, method: probe.method, downloadMbps: probe.downloadMbps, uploadMbps: probe.uploadMbps, checkedAt: probe.checkedAt, sourceName: "", errorCode: probe.errorCode, isDemo: bridge.isDemo });
  } catch {
    st.applyScanResult({ serverId: id, status: "unavailable", latencyMs: null, method: cfg.method, downloadMbps: null, uploadMbps: null, checkedAt: new Date().toISOString(), sourceName: "", errorCode: "TIMEOUT", isDemo: bridge.isDemo });
  } finally {
    clearTimeout(timer);
  }
}
