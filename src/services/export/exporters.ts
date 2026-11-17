import type { Server, ServerConfig } from "@/types";
import { b64encode } from "@/lib/base64";

function enc(v: string) {
  return encodeURIComponent(v);
}

function hostForUri(address: string) {
  return address.includes(":") && !address.startsWith("[") ? `[${address}]` : address;
}

function queryOf(params: Record<string, string | undefined>) {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== "")
    .map(([k, v]) => `${k}=${enc(v as string)}`)
    .join("&");
  return q ? `?${q}` : "";
}

/** Экспорт в стандартную URI-строку протокола (совместима с v2rayNG, NekoBox, Hiddify и др.). */
export function toUri(config: ServerConfig, name: string): string {
  const host = hostForUri(config.address);
  const fragment = `#${enc(name)}`;
  switch (config.protocol) {
    case "vless":
      return `vless://${enc(config.secret)}@${host}:${config.port}${queryOf({
        type: config.transport ?? "tcp",
        security: config.security ?? "none",
        encryption: "none",
        sni: config.sni,
        host: config.host,
        path: config.path,
        flow: config.flow,
        fp: config.fingerprint,
        pbk: config.publicKey,
        sid: config.shortId,
        serviceName: config.serviceName,
        alpn: config.alpn?.join(","),
      })}${fragment}`;
    case "trojan":
      return `trojan://${enc(config.secret)}@${host}:${config.port}${queryOf({
        type: config.transport ?? "tcp",
        security: config.security ?? "tls",
        sni: config.sni,
        host: config.host,
        path: config.path,
        fp: config.fingerprint,
        serviceName: config.serviceName,
        alpn: config.alpn?.join(","),
      })}${fragment}`;
    case "vmess": {
      const json = {
        v: "2",
        ps: name,
        add: config.address,
        port: String(config.port),
        id: config.secret,
        aid: String(config.alterId ?? 0),
        scy: config.cipher ?? "auto",
        net: config.transport ?? "tcp",
        type: "none",
        host: config.host ?? "",
        path: config.path ?? "",
        tls: config.security === "tls" ? "tls" : "",
        sni: config.sni ?? "",
        fp: config.fingerprint ?? "",
        alpn: config.alpn?.join(",") ?? "",
      };
      return `vmess://${b64encode(JSON.stringify(json))}`;
    }
    case "shadowsocks": {
      const userinfo = b64encode(`${config.method ?? "chacha20-ietf-poly1305"}:${config.secret}`)
        .replace(/=+$/, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
      return `ss://${userinfo}@${host}:${config.port}${fragment}`;
    }
  }
}

/** Фрагмент outbound для Xray-core JSON-конфигурации. */
export function toXrayOutbound(config: ServerConfig, tag = "proxy"): Record<string, unknown> {
  const stream: Record<string, unknown> = {
    network: config.transport === "h2" ? "http" : (config.transport ?? "tcp"),
    security: config.security ?? "none",
  };
  if (config.security === "tls")
    stream["tlsSettings"] = {
      serverName: config.sni,
      fingerprint: config.fingerprint,
      alpn: config.alpn,
    };
  if (config.security === "reality")
    stream["realitySettings"] = {
      serverName: config.sni,
      fingerprint: config.fingerprint ?? "chrome",
      publicKey: config.publicKey,
      shortId: config.shortId,
    };
  if (config.transport === "ws")
    stream["wsSettings"] = {
      path: config.path ?? "/",
      headers: config.host ? { Host: config.host } : undefined,
    };
  if (config.transport === "grpc")
    stream["grpcSettings"] = { serviceName: config.serviceName ?? "" };

  switch (config.protocol) {
    case "vless":
      return {
        tag,
        protocol: "vless",
        settings: {
          vnext: [
            {
              address: config.address,
              port: config.port,
              users: [{ id: config.secret, encryption: "none", flow: config.flow }],
            },
          ],
        },
        streamSettings: stream,
      };
    case "vmess":
      return {
        tag,
        protocol: "vmess",
        settings: {
          vnext: [
            {
              address: config.address,
              port: config.port,
              users: [
                {
                  id: config.secret,
                  alterId: config.alterId ?? 0,
                  security: config.cipher ?? "auto",
                },
              ],
            },
          ],
        },
        streamSettings: stream,
      };
    case "trojan":
      return {
        tag,
        protocol: "trojan",
        settings: {
          servers: [{ address: config.address, port: config.port, password: config.secret }],
        },
        streamSettings: stream,
      };
    case "shadowsocks":
      return {
        tag,
        protocol: "shadowsocks",
        settings: {
          servers: [
            {
              address: config.address,
              port: config.port,
              method: config.method,
              password: config.secret,
            },
          ],
        },
      };
  }
}

export function toXrayJson(server: Server): string {
  return JSON.stringify(
    {
      remarks: server.name,
      _swit4: { exportedAt: new Date().toISOString(), isDemo: server.isDemo },
      outbounds: [toXrayOutbound(server.config), { tag: "direct", protocol: "freedom" }],
    },
    null,
    2,
  );
}

/** Многострочный TXT со списком URI — формат обычной подписки. */
export function toUriList(servers: Server[], header?: string): string {
  const lines = servers.map((s) => toUri(s.config, s.name));
  return [header ? `# ${header}` : null, ...lines].filter(Boolean).join("\n");
}

export interface ThirdPartyCompat {
  client: string;
  protocols: ServerConfig["protocol"][];
  notes?: string;
}

/** Совместимость форматов со сторонними клиентами — для предупреждений в UI. */
export const THIRD_PARTY_COMPAT: ThirdPartyCompat[] = [
  { client: "v2rayNG", protocols: ["vless", "vmess", "trojan", "shadowsocks"] },
  { client: "NekoBox", protocols: ["vless", "vmess", "trojan", "shadowsocks"] },
  { client: "Hiddify", protocols: ["vless", "vmess", "trojan", "shadowsocks"] },
  { client: "Shadowsocks Android", protocols: ["shadowsocks"], notes: "Только Shadowsocks" },
  { client: "Outline", protocols: ["shadowsocks"], notes: "Только Shadowsocks" },
];

export function incompatibleClients(protocol: ServerConfig["protocol"]): string[] {
  return THIRD_PARTY_COMPAT.filter((c) => !c.protocols.includes(protocol)).map((c) => c.client);
}
