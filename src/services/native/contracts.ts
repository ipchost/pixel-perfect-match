/**
 * Контракты нативного bridge SWIT4.
 *
 * Веб-прототип НЕ поднимает VPN-туннель и НЕ видит приложения устройства.
 * Нативное Android-приложение (Kotlin, VpnService, Xray-core) реализует эти интерфейсы
 * и пробрасывает их в WebView/JS (или используется как спецификация для Compose UI).
 * Подробности: ANDROID_INTEGRATION.md.
 */
import type {
  AppRoutingMode,
  ConnectionPhase,
  DomainRule,
  InstalledApp,
  ProbeResult,
  ScanOptions,
  Server,
  TrafficSample,
} from "@/types";

export type Unsubscribe = () => void;

export type VpnPermissionState = "granted" | "denied" | "not_requested" | "unsupported";
export type ComponentHealth = "ok" | "degraded" | "down" | "unknown" | "unsupported";

export interface ConnectOptions {
  server: Server;
  routing: { mode: AppRoutingMode; packages: string[] };
  domainRules: DomainRule[];
  dns: { mode: "system" | "custom" | "tunnel"; servers: string[]; ipv6: boolean };
}

/** Android: VpnService + foreground notification. */
export interface ConnectionManager {
  getPermission(): Promise<VpnPermissionState>;
  /** Android: VpnService.prepare() → системный диалог. */
  requestPermission(): Promise<VpnPermissionState>;
  connect(opts: ConnectOptions): Promise<void>;
  disconnect(): Promise<void>;
  onPhase(cb: (phase: ConnectionPhase, detail?: { errorCode?: string }) => void): Unsubscribe;
  onTraffic(cb: (s: TrafficSample & { bytesDown: number; bytesUp: number }) => void): Unsubscribe;
}

/** Отдельный adapter над Xray-core (libXray / AndroidLibXrayLite). */
export interface XrayEngine {
  version(): Promise<string | null>;
  validateConfig(json: string): Promise<{ ok: boolean; error?: string }>;
  health(): Promise<ComponentHealth>;
}

export interface ServerScanner {
  probe(server: Server, opts: ScanOptions, signal?: AbortSignal): Promise<ProbeResult>;
}

/** Android PackageManager. Список НЕ отправляется на backend. */
export interface InstalledAppsRepository {
  list(): Promise<InstalledApp[]>;
  /** data: URI или blob URL иконки; в демо — null (используются локальные иконки). */
  icon(packageName: string): Promise<string | null>;
}

/** VpnService.Builder.addAllowedApplication / addDisallowedApplication. */
export interface RoutingManager {
  /** Проверка, что набор пакетов применим (пакеты установлены, режимы не смешаны). */
  validate(
    mode: AppRoutingMode,
    packages: string[],
  ): Promise<{ ok: boolean; missing: string[]; reason?: string }>;
  /** Режим, применённый к текущему туннелю. */
  applied(): Promise<{ mode: AppRoutingMode; packages: string[] } | null>;
}

/** Android Sharesheet / SAF / Clipboard. */
export interface ExportManager {
  copy(
    text: string,
    opts?: { sensitive?: boolean | undefined; clearAfterSec?: number | null },
  ): Promise<boolean>;
  share(payload: {
    title: string;
    text?: string | undefined;
    fileName?: string | undefined;
    mime?: string;
  }): Promise<boolean>;
  saveFile(fileName: string, content: string, mime: string): Promise<boolean>;
}

export interface DiagnosticsSnapshot {
  vpnPermission: VpnPermissionState;
  vpnService: ComponentHealth;
  xrayEngine: ComponentHealth;
  xrayVersion: string | null;
  dns: ComponentHealth;
  backend: ComponentHealth;
  network: "wifi" | "cellular" | "none" | "unknown";
  ipv6: ComponentHealth;
  checkedAt: string;
  isDemo: boolean;
}

export interface DiagnosticsManager {
  snapshot(): Promise<DiagnosticsSnapshot>;
  /** Проверка качества сети ДО подключения: отличить проблему Wi-Fi/моб. сети от проблемы сервера. */
  networkQuality(): Promise<{
    reachable: boolean;
    latencyMs: number | null;
    method: string;
    isDemo: boolean;
  }>;
}

export interface NativeBridge {
  readonly platform: "android" | "web-demo";
  readonly isDemo: boolean;
  connection: ConnectionManager;
  xray: XrayEngine;
  scanner: ServerScanner;
  apps: InstalledAppsRepository;
  routing: RoutingManager;
  exporter: ExportManager;
  diagnostics: DiagnosticsManager;
}

declare global {
  interface Window {
    /** Внедряется нативным Android-приложением. Отсутствует в браузере. */
    SWIT4Native?: NativeBridge | undefined;
  }
}
