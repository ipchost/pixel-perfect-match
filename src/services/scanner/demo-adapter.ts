import type { ProbeResult, ScanOptions, Server } from "@/types";
import type { ProbeAdapter } from "./scanner";
import { hashString, seeded } from "@/lib/random";

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("aborted", "AbortError"));
    });
  });
}

/**
 * DEMO: симуляция проверки. Никаких сетевых запросов к серверам из браузера не выполняется.
 * Результаты помечаются isDemo и в UI подписаны DEMO.
 */
export class DemoProbeAdapter implements ProbeAdapter {
  readonly isDemo = true;

  async probe(server: Server, opts: ScanOptions, signal: AbortSignal): Promise<ProbeResult> {
    const rand = seeded(hashString(server.id) ^ Math.floor(Date.now() / 60_000));
    const roll = rand();
    const delay = 300 + rand() * 900;
    await sleep(delay, signal);
    const checkedAt = new Date().toISOString();
    const isDown = server.status === "unavailable" ? roll < 0.75 : roll < 0.12;
    if (isDown) {
      return { latencyMs: null, method: opts.method, downloadMbps: null, uploadMbps: null, checkedAt, success: false, errorCode: roll < 0.06 ? "HANDSHAKE_FAILED" : "TIMEOUT" };
    }
    const slow = server.status === "slow" || roll > 0.85;
    const latency = Math.round(slow ? 280 + rand() * 260 : 35 + rand() * 140);
    let down: number | null = null;
    let up: number | null = null;
    if (opts.runThroughput && opts.throughputBytesLimit > 0) {
      await sleep(250 + rand() * 500, signal);
      down = Math.round((slow ? 3 + rand() * 12 : 20 + rand() * 130) * 10) / 10;
      up = Math.round((slow ? 1 + rand() * 6 : 8 + rand() * 60) * 10) / 10;
    }
    return { latencyMs: latency, method: opts.method, downloadMbps: down, uploadMbps: up, testBytesLimit: opts.runThroughput ? opts.throughputBytesLimit : undefined, checkedAt, success: true };
  }
}
