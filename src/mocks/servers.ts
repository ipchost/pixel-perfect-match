import type {
  ProbeMethod,
  ProbeResult,
  Protocol,
  Server,
  ServerConfig,
  ServerStatus,
} from "@/types";
import { seeded } from "@/lib/random";

/**
 * DEMO: все адреса — в зарезервированной зоне .example (RFC 2606), секреты сгенерированы.
 * Эти конфигурации не работают в реальных клиентах и помечены isDemo: true.
 */
const SEED: Array<[string, string, string, Protocol, string | null]> = [
  ["DE", "Frankfurt", "Frankfurt 01", "vless", "sub_demo_main"],
  ["DE", "Frankfurt", "Frankfurt 02", "vless", "sub_demo_main"],
  ["DE", "Frankfurt", "Frankfurt 03", "trojan", "sub_demo_alt"],
  ["DE", "Berlin", "Berlin 01", "vmess", "sub_demo_main"],
  ["NL", "Amsterdam", "Amsterdam 01", "vless", "sub_demo_main"],
  ["NL", "Amsterdam", "Amsterdam 02", "shadowsocks", "sub_demo_alt"],
  ["NL", "Rotterdam", "Rotterdam 01", "trojan", "sub_demo_main"],
  ["FI", "Helsinki", "Helsinki 01", "vless", "sub_demo_main"],
  ["FI", "Helsinki", "Helsinki 02", "vmess", "sub_demo_alt"],
  ["SE", "Stockholm", "Stockholm 01", "vless", "sub_demo_main"],
  ["PL", "Warsaw", "Warsaw 01", "trojan", "sub_demo_alt"],
  ["FR", "Paris", "Paris 01", "vless", "sub_demo_main"],
  ["FR", "Marseille", "Marseille 01", "shadowsocks", "sub_demo_alt"],
  ["GB", "London", "London 01", "vless", "sub_demo_main"],
  ["GB", "London", "London 02", "trojan", "sub_demo_main"],
  ["US", "New York", "New York 01", "vless", "sub_demo_main"],
  ["US", "Los Angeles", "Los Angeles 01", "vmess", "sub_demo_alt"],
  ["US", "Miami", "Miami 01", "shadowsocks", "sub_demo_alt"],
  ["JP", "Tokyo", "Tokyo 01", "vless", "sub_demo_main"],
  ["SG", "Singapore", "Singapore 01", "trojan", "sub_demo_main"],
  ["TR", "Istanbul", "Istanbul 01", "vless", "sub_demo_alt"],
  ["KZ", "Almaty", "Almaty 01", "vmess", "sub_demo_alt"],
  ["AM", "Yerevan", "Yerevan 01", "shadowsocks", "sub_demo_alt"],
  ["CH", "Zurich", "Zurich 01", "vless", "sub_demo_main"],
  ["DE", "Munich", "Munich 01", "vless", null],
];

const STATUS_PLAN: ServerStatus[] = [
  "available",
  "available",
  "slow",
  "available",
  "available",
  "unstable",
  "available",
  "available",
  "unchecked",
  "available",
  "unavailable",
  "available",
  "unchecked",
  "available",
  "slow",
  "available",
  "unstable",
  "unchecked",
  "slow",
  "available",
  "config_error",
  "unavailable",
  "unchecked",
  "available",
  "available",
];

function uuidFrom(rand: () => number): string {
  const hex = () => Math.floor(rand() * 16).toString(16);
  const s = (n: number) => Array.from({ length: n }, hex).join("");
  return `${s(8)}-${s(4)}-4${s(3)}-a${s(3)}-${s(12)}`;
}

function makeConfig(protocol: Protocol, host: string, rand: () => number): ServerConfig {
  const secret =
    protocol === "shadowsocks" || protocol === "trojan"
      ? `demo-${uuidFrom(rand).slice(0, 18)}`
      : uuidFrom(rand);
  switch (protocol) {
    case "vless":
      return {
        protocol,
        address: host,
        port: 443,
        secret,
        transport: rand() > 0.5 ? "tcp" : "grpc",
        security: "reality",
        sni: "www.example.com",
        fingerprint: "chrome",
        publicKey: "DEMO_PUBLIC_KEY_not_real_0000000000000000",
        shortId: "6ba85179",
        flow: "xtls-rprx-vision",
        serviceName: "grpc",
      };
    case "vmess":
      return {
        protocol,
        address: host,
        port: 443,
        secret,
        transport: "ws",
        security: "tls",
        sni: host,
        host,
        path: "/ws",
        alterId: 0,
        cipher: "auto",
      };
    case "trojan":
      return {
        protocol,
        address: host,
        port: 443,
        secret,
        transport: "tcp",
        security: "tls",
        sni: host,
      };
    case "shadowsocks":
      return { protocol, address: host, port: 8388, secret, method: "chacha20-ietf-poly1305" };
  }
}

function methodFor(protocol: Protocol): ProbeMethod {
  return protocol === "shadowsocks"
    ? "tcp_connect"
    : protocol === "vless"
      ? "proxy_handshake"
      : "tls_handshake";
}

function probeFor(
  status: ServerStatus,
  protocol: Protocol,
  ageMin: number,
  now: number,
  rand: () => number,
): ProbeResult | null {
  if (status === "unchecked" || status === "checking") return null;
  const checkedAt = new Date(now - ageMin * 60_000).toISOString();
  if (status === "config_error")
    return {
      latencyMs: null,
      method: methodFor(protocol),
      downloadMbps: null,
      uploadMbps: null,
      checkedAt,
      success: false,
      errorCode: "CONFIG_INVALID",
    };
  if (status === "unavailable")
    return {
      latencyMs: null,
      method: methodFor(protocol),
      downloadMbps: null,
      uploadMbps: null,
      checkedAt,
      success: false,
      errorCode: "TIMEOUT",
    };
  const base =
    status === "available"
      ? 40 + rand() * 90
      : status === "slow"
        ? 260 + rand() * 200
        : 120 + rand() * 180;
  const measuredSpeed = status !== "unstable" && rand() > 0.25;
  return {
    latencyMs: Math.round(base),
    method: methodFor(protocol),
    downloadMbps: measuredSpeed
      ? Math.round((status === "slow" ? 4 + rand() * 10 : 25 + rand() * 120) * 10) / 10
      : null,
    uploadMbps: measuredSpeed
      ? Math.round((status === "slow" ? 2 + rand() * 5 : 10 + rand() * 60) * 10) / 10
      : null,
    testBytesLimit: measuredSpeed ? 2 * 1024 * 1024 : undefined,
    checkedAt,
    success: true,
  };
}

export function createDemoServers(now = Date.now()): Server[] {
  const rand = seeded(424242);
  return SEED.map(([cc, city, name, protocol, sub], i) => {
    const host = `${city.toLowerCase().replace(/\s+/g, "-")}-${String(i + 1).padStart(2, "0")}.${cc.toLowerCase()}.demo-swit4.example`;
    const status = STATUS_PLAN[i] ?? "unchecked";
    const ageMin = i % 5 === 0 ? 60 * 26 : 3 + Math.round(rand() * 50);
    const lastProbe = probeFor(status, protocol, ageMin, now, rand);
    const history: ProbeResult[] = lastProbe
      ? [
          lastProbe,
          ...Array.from({ length: 6 }, (_, k) =>
            probeFor(
              rand() > (status === "unstable" ? 0.5 : 0.1)
                ? status === "slow"
                  ? "slow"
                  : "available"
                : "unavailable",
              protocol,
              ageMin + (k + 1) * 30,
              now,
              rand,
            )!,
          ),
        ]
      : [];
    return {
      id: `srv_demo_${String(i + 1).padStart(2, "0")}`,
      name,
      countryCode: cc,
      city,
      config: makeConfig(protocol, host, rand),
      subscriptionId: sub ?? null,
      status,
      lastProbe,
      probeHistory: history,
      excludedFromAuto: false,
      missingFromSource: i === 24 ? true : undefined,
      isDemo: true,
    };
  });
}
