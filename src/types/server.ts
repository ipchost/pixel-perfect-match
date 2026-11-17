/** Протоколы, которые поддерживает парсер SWIT4 (см. src/services/parsers). */
export type Protocol = "vless" | "vmess" | "trojan" | "shadowsocks";

export type Transport = "tcp" | "ws" | "grpc" | "http" | "h2" | "quic" | "xhttp";
export type Security = "none" | "tls" | "reality";

/**
 * Статус сервера. Никогда не выводится из цвета: UI всегда показывает текст + иконку.
 * `unchecked` — проверки не было; `checking` — идёт проверка; `config_error` — конфиг не прошёл валидацию.
 */
export type ServerStatus =
  | "available"
  | "slow"
  | "unstable"
  | "unavailable"
  | "unchecked"
  | "checking"
  | "config_error";

/** Метод, которым было получено значение задержки. TCP connect ≠ ping. */
export type ProbeMethod = "tcp_connect" | "tls_handshake" | "proxy_handshake" | "control_endpoint";

export interface ProbeResult {
  /** Задержка в мс. `null`, если не измерялась. */
  latencyMs: number | null;
  method: ProbeMethod;
  /** Скорость в Мбит/с. `null`, если тест пропускной способности НЕ выполнялся. */
  downloadMbps: number | null;
  uploadMbps: number | null;
  /** Ограничение тестового трафика, которое было применено (байты). */
  testBytesLimit?: number | undefined;
  /** ISO-время проверки. */
  checkedAt: string;
  success: boolean;
  errorCode?: string | undefined;
}

/** Параметры конфигурации. Секреты (uuid/password) никогда не попадают в логи — см. maskSecrets(). */
export interface ServerConfig {
  protocol: Protocol;
  address: string;
  port: number;
  /** UUID (vless/vmess) или пароль (trojan/shadowsocks). СЕКРЕТ. */
  secret: string;
  /** Метод шифрования Shadowsocks. */
  method?: string | undefined;
  transport?: Transport | undefined;
  security?: Security | undefined;
  sni?: string | undefined;
  host?: string | undefined;
  path?: string | undefined;
  flow?: string | undefined;
  fingerprint?: string | undefined;
  publicKey?: string | undefined;
  shortId?: string | undefined;
  serviceName?: string | undefined;
  alpn?: string[] | undefined;
  /** vmess alterId */
  alterId?: number | undefined;
  /** vmess cipher */
  cipher?: string | undefined;
}

export interface Server {
  id: string;
  name: string;
  countryCode: string; // ISO 3166-1 alpha-2
  city: string;
  config: ServerConfig;
  subscriptionId: string | null;
  status: ServerStatus;
  lastProbe: ProbeResult | null;
  /** История последних проверок (новые в начале), для рейтинга стабильности. */
  probeHistory: ProbeResult[];
  /** Исключён ли из автоматического выбора. */
  excludedFromAuto: boolean;
  /** Сервер больше не присутствует в источнике (для избранного). */
  missingFromSource?: boolean | undefined;
  /** Исходная URI-строка, если сервер импортирован из URI. СЕКРЕТ. */
  rawUri?: string | undefined;
  isDemo: boolean;
}

export interface Country {
  code: string;
  nameRu: string;
  nameEn: string;
}

export interface CountryGroup {
  country: Country;
  cities: { city: string; servers: Server[] }[];
  total: number;
  available: number;
  bestLatencyMs: number | null;
}
