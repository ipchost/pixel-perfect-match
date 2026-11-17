import type { AppRoutingConfig, AppSettings, ConnectionState } from "@/types";

export const DEFAULT_SETTINGS: AppSettings = {
  connection: {
    mode: "auto",
    manualServerId: null,
    autoReconnect: true,
    switchDelaySec: 10,
    timeoutSec: 15,
    onNetworkLoss: "reconnect",
    startOnBoot: false,
    maxSwitchesPer10Min: 3,
  },
  scan: {
    intervalMin: 60,
    concurrency: 4,
    timeoutMs: 5000,
    throughputLimitKb: 2048,
    method: "proxy_handshake",
    onlyActiveSources: true,
    includeFavorites: true,
    staleAfterMin: 120,
  },
  subscriptions: {
    autoUpdate: true,
    intervalMin: 30,
    network: "any",
    notify: true,
    maxResponseKb: 5120,
  },
  dns: { mode: "tunnel", customServers: ["1.1.1.1", "9.9.9.9"], ipMode: "ipv4" },
  ui: { theme: "dark", locale: "ru", motion: "system", animationIntensity: "normal", compact: false },
  privacy: { appLock: false, clearClipboardAfterSec: 60, keepHistoryDays: 30 },
  killSwitchAcknowledged: false,
  onboardingDone: false,
};

export const DEFAULT_ROUTING: AppRoutingConfig = {
  mode: "all",
  whitelist: [],
  blacklist: [],
  appliedMode: null,
  appliedAt: null,
};

export const INITIAL_CONNECTION: ConnectionState = {
  phase: "disconnected",
  serverId: null,
  stats: { startedAt: null, bytesDown: 0, bytesUp: 0, downBps: 0, upBps: 0, samples: [], isDemo: true },
};
