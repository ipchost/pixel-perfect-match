import type { ConnectionPhase, TrafficSample } from "@/types";
import type {
  ConnectionManager,
  DiagnosticsSnapshot,
  NativeBridge,
  VpnPermissionState,
} from "./contracts";
import { createDemoApps } from "@/mocks/apps";
import { DemoProbeAdapter } from "@/services/scanner/demo-adapter";

type PhaseCb = (p: ConnectionPhase, d?: { errorCode?: string }) => void;
type TrafficCb = (s: TrafficSample & { bytesDown: number; bytesUp: number }) => void;

/**
 * DEMO-реализация ConnectionManager. Туннель НЕ создаётся: состояние и трафик симулируются
 * и помечаются в UI как DEMO.
 */
class DemoConnection implements ConnectionManager {
  private permission: VpnPermissionState = "not_requested";
  private phaseCbs = new Set<PhaseCb>();
  private trafficCbs = new Set<TrafficCb>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private down = 0;
  private up = 0;

  async getPermission() {
    return this.permission;
  }
  async requestPermission() {
    await new Promise((r) => setTimeout(r, 400));
    this.permission = "granted";
    return this.permission;
  }
  async connect() {
    this.emit("connecting");
    await new Promise((r) => setTimeout(r, 1100));
    this.emit("connected");
    this.down = 0;
    this.up = 0;
    let phase = 0;
    this.timer = setInterval(() => {
      phase += 1;
      const burst = Math.sin(phase / 3) * 0.5 + 0.5;
      const downBps = Math.round(
        (180_000 + burst * 900_000 + Math.random() * 300_000) * (Math.random() > 0.9 ? 3 : 1),
      );
      const upBps = Math.round(30_000 + burst * 120_000 + Math.random() * 40_000);
      this.down += downBps;
      this.up += upBps;
      this.trafficCbs.forEach((cb) =>
        cb({ t: Date.now(), downBps, upBps, bytesDown: this.down, bytesUp: this.up }),
      );
    }, 1000);
  }
  async disconnect() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.emit("disconnecting");
    await new Promise((r) => setTimeout(r, 450));
    this.emit("disconnected");
  }
  onPhase(cb: PhaseCb) {
    this.phaseCbs.add(cb);
    return () => void this.phaseCbs.delete(cb);
  }
  onTraffic(cb: TrafficCb) {
    this.trafficCbs.add(cb);
    return () => void this.trafficCbs.delete(cb);
  }
  private emit(p: ConnectionPhase) {
    this.phaseCbs.forEach((cb) => cb(p));
  }
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

function download(fileName: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function createDemoBridge(): NativeBridge {
  const probe = new DemoProbeAdapter();
  return {
    platform: "web-demo",
    isDemo: true,
    connection: new DemoConnection(),
    xray: {
      async version() {
        return null; // в браузере Xray-core отсутствует
      },
      async validateConfig(json) {
        try {
          JSON.parse(json);
          return { ok: true };
        } catch (e) {
          return { ok: false, error: String(e) };
        }
      },
      async health() {
        return "unsupported";
      },
    },
    scanner: { probe: (s, o, sig) => probe.probe(s, o, sig ?? new AbortController().signal) },
    apps: {
      async list() {
        await new Promise((r) => setTimeout(r, 350));
        return createDemoApps();
      },
      async icon() {
        return null;
      },
    },
    routing: {
      async validate(mode, packages) {
        const installed = new Set(createDemoApps().map((a) => a.packageName));
        const missing = packages.filter((p) => !installed.has(p));
        if (mode === "whitelist" && packages.length === 0)
          return { ok: false, missing, reason: "empty_whitelist" };
        return { ok: true, missing };
      },
      async applied() {
        return null;
      },
    },
    exporter: {
      async copy(text, opts) {
        const ok = await copyText(text);
        if (ok && opts?.sensitive && opts.clearAfterSec) {
          // Best-effort очистка в браузере; надёжная — только в нативной версии.
          setTimeout(() => void copyText(" ").catch(() => undefined), opts.clearAfterSec * 1000);
        }
        return ok;
      },
      async share({ title, text, fileName, mime }) {
        if (typeof navigator !== "undefined" && "share" in navigator && text) {
          try {
            await navigator.share({ title, text });
            return true;
          } catch {
            /* пользователь отменил — fallback ниже */
          }
        }
        if (fileName && text) {
          download(fileName, text, mime ?? "text/plain");
          return true;
        }
        return text ? copyText(text) : false;
      },
      async saveFile(fileName, content, mime) {
        download(fileName, content, mime);
        return true;
      },
    },
    diagnostics: {
      async snapshot(): Promise<DiagnosticsSnapshot> {
        await new Promise((r) => setTimeout(r, 500));
        const online = typeof navigator === "undefined" ? true : navigator.onLine;
        return {
          vpnPermission: "unsupported",
          vpnService: "unsupported",
          xrayEngine: "unsupported",
          xrayVersion: null,
          dns: online ? "unknown" : "down",
          backend: "unknown",
          network: online ? "unknown" : "none",
          ipv6: "unknown",
          checkedAt: new Date().toISOString(),
          isDemo: true,
        };
      },
      async networkQuality() {
        const online = typeof navigator === "undefined" ? true : navigator.onLine;
        return { reachable: online, latencyMs: null, method: "navigator.onLine", isDemo: true };
      },
    },
  };
}

let bridge: NativeBridge | null = null;

/** Возвращает нативный bridge, если он внедрён Android-приложением, иначе DEMO. */
export function getBridge(): NativeBridge {
  if (bridge) return bridge;
  bridge =
    typeof window !== "undefined" && window.SWIT4Native ? window.SWIT4Native : createDemoBridge();
  return bridge;
}
