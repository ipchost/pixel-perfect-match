import type { ConnectionMode } from "./connection";
import type { NetworkPolicy } from "./subscription";
import type { ProbeMethod } from "./server";

export type ThemePreference = "dark" | "light" | "system";
export type Locale = "ru" | "en";
export type MotionPreference = "full" | "reduced" | "system";
export type NetworkLossBehavior = "wait" | "reconnect" | "switch_server";
export type DnsMode = "system" | "custom" | "tunnel";
export type IpMode = "ipv4" | "ipv4_ipv6" | "ipv6_prefer";

export interface AppSettings {
  connection: {
    mode: ConnectionMode;
    manualServerId: string | null;
    autoReconnect: boolean;
    switchDelaySec: number;
    timeoutSec: number;
    onNetworkLoss: NetworkLossBehavior;
    startOnBoot: boolean;
    /** Максимум автопереключений за 10 минут — защита от цикла. */
    maxSwitchesPer10Min: number;
  };
  scan: {
    intervalMin: number;
    concurrency: number;
    timeoutMs: number;
    throughputLimitKb: number;
    method: ProbeMethod;
    onlyActiveSources: boolean;
    includeFavorites: boolean;
    staleAfterMin: number;
  };
  subscriptions: {
    autoUpdate: boolean;
    intervalMin: number;
    network: NetworkPolicy;
    notify: boolean;
    maxResponseKb: number;
  };
  dns: {
    mode: DnsMode;
    customServers: string[];
    ipMode: IpMode;
  };
  ui: {
    theme: ThemePreference;
    locale: Locale;
    motion: MotionPreference;
    animationIntensity: "low" | "normal";
    compact: boolean;
  };
  privacy: {
    appLock: boolean;
    clearClipboardAfterSec: number | null;
    keepHistoryDays: number;
  };
  killSwitchAcknowledged: boolean;
  onboardingDone: boolean;
}
