import { useAppStore } from "@/app/store";
import { INITIAL_CONNECTION } from "@/app/defaults";
import { getBridge } from "@/services/native/demo-bridge";
import { pickBestServer } from "@/services/servers/rating";
import { runScan, type ProbeAdapter } from "@/services/scanner/scanner";
import { uid } from "@/lib/random";
import type { Server } from "@/types";

let abort: AbortController | null = null;
let unsubTraffic: (() => void) | null = null;
let unsubPhase: (() => void) | null = null;
let permissionResolver: ((ok: boolean) => void) | null = null;

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("cancelled", "AbortError"));
    });
  });

/** Вызывается диалогом разрешения VPN. */
export function resolvePermissionPrompt(ok: boolean) {
  useAppStore.setState({ permissionPromptOpen: false });
  permissionResolver?.(ok);
  permissionResolver = null;
}

function askPermission(): Promise<boolean> {
  useAppStore.setState({ permissionPromptOpen: true });
  return new Promise((resolve) => {
    permissionResolver = resolve;
  });
}

function adapterFromBridge(): ProbeAdapter {
  const b = getBridge();
  return { isDemo: b.isDemo, probe: (s, o, sig) => b.scanner.probe(s, o, sig) };
}

/** Быстрая перепроверка лучших кандидатов перед автоподключением (до 6 серверов). */
async function quickProbeCandidates(signal: AbortSignal): Promise<Server | null> {
  const st = useAppStore.getState();
  const enabledSubs = new Set(st.subscriptions.filter((s) => s.enabled).map((s) => s.id));
  const pool = st.servers.filter(
    (s) =>
      !s.excludedFromAuto &&
      (s.subscriptionId === null || enabledSubs.has(s.subscriptionId)) &&
      s.status !== "config_error",
  );
  const ranked = [...pool]
    .sort((a, b) => (a.lastProbe?.latencyMs ?? 9999) - (b.lastProbe?.latencyMs ?? 9999))
    .slice(0, 6);
  if (!ranked.length) return null;
  useAppStore.getState().setConnection({ phase: "probing" });
  const cfg = st.settings.scan;
  await runScan(
    ranked,
    {
      concurrency: Math.min(3, cfg.concurrency),
      timeoutMs: cfg.timeoutMs,
      throughputBytesLimit: 0,
      method: cfg.method,
      onlyActiveSources: true,
      includeFavorites: true,
      runThroughput: false,
    },
    adapterFromBridge(),
    signal,
    {
      onProgress: (p) => {
        const last = p.results.at(-1);
        if (last) useAppStore.getState().applyScanResult(last);
      },
      sourceName: () => "",
    },
  );
  if (signal.aborted) throw new DOMException("cancelled", "AbortError");
  useAppStore.getState().setConnection({ phase: "selecting_best" });
  await wait(500, signal);
  const fresh = useAppStore.getState();
  return pickBestServer(
    fresh.servers.filter((s) => ranked.some((r) => r.id === s.id)),
    fresh.settings.scan.staleAfterMin,
  );
}

export async function connect(opts: { serverId?: string } = {}) {
  const store = useAppStore.getState();
  if (store.connection.phase !== "disconnected" && store.connection.phase !== "error") return;
  abort = new AbortController();
  const signal = abort.signal;
  const bridge = getBridge();
  const set = (p: Parameters<typeof store.setConnection>[0]) =>
    useAppStore.getState().setConnection(p);

  try {
    let server: Server | null = null;
    const manualId =
      opts.serverId ??
      (store.settings.connection.mode === "manual"
        ? store.settings.connection.manualServerId
        : null);
    if (manualId) {
      server = store.servers.find((s) => s.id === manualId) ?? null;
      if (!server) throw Object.assign(new Error("no server"), { code: "SERVER_NOT_FOUND" });
    } else {
      set({ phase: "fetching_servers", errorCode: undefined, errorMessage: undefined });
      await wait(600, signal);
      set({ phase: "searching" });
      await wait(500, signal);
      server = await quickProbeCandidates(signal);
      if (!server) throw Object.assign(new Error("no candidates"), { code: "NO_CANDIDATES" });
    }

    const perm = await bridge.connection.getPermission();
    if (perm !== "granted") {
      set({ phase: "requesting_permission", serverId: server.id });
      const ok = await askPermission();
      if (!ok) throw Object.assign(new Error("permission denied"), { code: "PERMISSION_DENIED" });
      const res = await bridge.connection.requestPermission();
      if (res !== "granted")
        throw Object.assign(new Error("permission denied"), { code: "PERMISSION_DENIED" });
    }
    if (signal.aborted) throw new DOMException("cancelled", "AbortError");

    set({ phase: "connecting", serverId: server.id });
    const fresh = useAppStore.getState();
    unsubTraffic?.();
    unsubPhase?.();
    unsubPhase = bridge.connection.onPhase((phase) => {
      if (phase === "connected" || phase === "reconnecting") set({ phase });
    });
    unsubTraffic = bridge.connection.onTraffic((s) => {
      const cur = useAppStore.getState().connection;
      const samples = [...cur.stats.samples, { t: s.t, downBps: s.downBps, upBps: s.upBps }].slice(
        -60,
      );
      set({
        stats: {
          ...cur.stats,
          downBps: s.downBps,
          upBps: s.upBps,
          bytesDown: s.bytesDown,
          bytesUp: s.bytesUp,
          samples,
          isDemo: bridge.isDemo,
        },
      });
    });
    const packages =
      fresh.routing.mode === "whitelist"
        ? fresh.routing.whitelist
        : fresh.routing.mode === "blacklist"
          ? fresh.routing.blacklist
          : [];
    await bridge.connection.connect({
      server,
      routing: { mode: fresh.routing.mode, packages },
      domainRules: fresh.domainRules.filter((r) => r.enabled),
      dns: {
        mode: fresh.settings.dns.mode,
        servers: fresh.settings.dns.customServers,
        ipv6: fresh.settings.dns.ipMode !== "ipv4",
      },
    });
    if (signal.aborted) {
      await bridge.connection.disconnect();
      throw new DOMException("cancelled", "AbortError");
    }
    set({
      phase: "connected",
      stats: { ...INITIAL_CONNECTION.stats, startedAt: Date.now(), isDemo: bridge.isDemo },
    });
    useAppStore.setState({
      lastWorkingServerId: server.id,
      routing: {
        ...fresh.routing,
        appliedMode: fresh.routing.mode,
        appliedAt: new Date().toISOString(),
      },
    });
    useAppStore
      .getState()
      .addEvent({
        level: "success",
        category: "connection",
        message: `Подключено: ${server.name}`,
        isDemo: bridge.isDemo,
      });
  } catch (e) {
    unsubTraffic?.();
    unsubPhase?.();
    if (e instanceof DOMException && e.name === "AbortError") {
      useAppStore.getState().setConnection({ ...INITIAL_CONNECTION });
      return;
    }
    const code = (e as { code?: string }).code ?? "UNKNOWN";
    useAppStore.getState().setConnection({ phase: "error", errorCode: code });
    useAppStore
      .getState()
      .addEvent({ level: "error", category: "connection", message: `Ошибка подключения: ${code}` });
  } finally {
    abort = null;
  }
}

/** Отмена на любом этапе до установки соединения. */
export function cancelConnect() {
  abort?.abort();
  if (permissionResolver) resolvePermissionPrompt(false);
}

export async function disconnect() {
  const st = useAppStore.getState();
  const { connection } = st;
  if (connection.phase !== "connected" && connection.phase !== "reconnecting") {
    cancelConnect();
    return;
  }
  const bridge = getBridge();
  unsubTraffic?.();
  unsubPhase?.();
  st.setConnection({ phase: "disconnecting" });
  await bridge.connection.disconnect();
  const server = st.servers.find((s) => s.id === connection.serverId);
  if (server && connection.stats.startedAt) {
    st.addSession({
      id: uid("ses"),
      serverId: server.id,
      serverName: server.name,
      countryCode: server.countryCode,
      startedAt: new Date(connection.stats.startedAt).toISOString(),
      endedAt: new Date().toISOString(),
      bytesDown: connection.stats.bytesDown,
      bytesUp: connection.stats.bytesUp,
      endReason: "user",
      isDemo: bridge.isDemo,
    });
  }
  useAppStore.getState().setConnection({ ...INITIAL_CONNECTION });
  useAppStore
    .getState()
    .addEvent({
      level: "info",
      category: "connection",
      message: "Отключено пользователем",
      isDemo: bridge.isDemo,
    });
}

export function isBusy(phase: string) {
  return !["disconnected", "connected", "error"].includes(phase);
}
