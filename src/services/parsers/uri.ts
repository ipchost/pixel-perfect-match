import type { Protocol, ServerConfig, Security, Transport } from "@/types";
import { b64decode, looksLikeBase64 } from "@/lib/base64";
import { maskSecrets } from "./mask";

export interface ParsedConfig {
  config: ServerConfig;
  name: string;
}

export type ParseResult =
  | { ok: true; value: ParsedConfig; raw: string }
  | { ok: false; reason: ParseErrorReason; raw: string };

export type ParseErrorReason =
  | "empty"
  | "unsupported_scheme"
  | "malformed"
  | "missing_host"
  | "invalid_port"
  | "missing_secret"
  | "invalid_base64"
  | "too_long";

export const SUPPORTED_SCHEMES = ["vless://", "vmess://", "trojan://", "ss://"] as const;
export const MAX_URI_LENGTH = 8192;

const TRANSPORTS: Transport[] = ["tcp", "ws", "grpc", "http", "h2", "quic", "xhttp"];

function asTransport(v: string | null | undefined): Transport | undefined {
  if (!v) return undefined;
  const t = v.toLowerCase();
  if (t === "raw") return "tcp";
  return (TRANSPORTS as string[]).includes(t) ? (t as Transport) : undefined;
}

function asSecurity(v: string | null | undefined): Security | undefined {
  if (!v) return undefined;
  const s = v.toLowerCase();
  return s === "tls" || s === "reality" || s === "none" ? s : undefined;
}

function decodeName(hash: string): string {
  const h = hash.startsWith("#") ? hash.slice(1) : hash;
  try {
    return decodeURIComponent(h);
  } catch {
    return h;
  }
}

function validPort(p: number): boolean {
  return Number.isInteger(p) && p > 0 && p < 65536;
}

/** Разбирает URL-подобные схемы (vless/trojan) через WHATWG URL, подменяя схему. */
function parseUrlLike(raw: string, scheme: string) {
  const url = new URL(raw.replace(new RegExp(`^${scheme}://`, "i"), "http://"));
  return url;
}

function parseVless(raw: string): ParseResult {
  let url: URL;
  try {
    url = parseUrlLike(raw, "vless");
  } catch {
    return { ok: false, reason: "malformed", raw };
  }
  const secret = decodeURIComponent(url.username);
  if (!secret) return { ok: false, reason: "missing_secret", raw };
  const address = url.hostname.replace(/^\[|\]$/g, "");
  if (!address) return { ok: false, reason: "missing_host", raw };
  const port = Number(url.port || 443);
  if (!validPort(port)) return { ok: false, reason: "invalid_port", raw };
  const q = url.searchParams;
  const config: ServerConfig = {
    protocol: "vless",
    address,
    port,
    secret,
    transport: asTransport(q.get("type")) ?? "tcp",
    security: asSecurity(q.get("security")) ?? "none",
    sni: q.get("sni") ?? undefined,
    host: q.get("host") ?? undefined,
    path: q.get("path") ?? undefined,
    flow: q.get("flow") ?? undefined,
    fingerprint: q.get("fp") ?? undefined,
    publicKey: q.get("pbk") ?? undefined,
    shortId: q.get("sid") ?? undefined,
    serviceName: q.get("serviceName") ?? undefined,
    alpn: q.get("alpn")?.split(",").filter(Boolean),
  };
  return { ok: true, raw, value: { config, name: decodeName(url.hash) || address } };
}

function parseTrojan(raw: string): ParseResult {
  let url: URL;
  try {
    url = parseUrlLike(raw, "trojan");
  } catch {
    return { ok: false, reason: "malformed", raw };
  }
  const secret = decodeURIComponent(url.username);
  if (!secret) return { ok: false, reason: "missing_secret", raw };
  const address = url.hostname.replace(/^\[|\]$/g, "");
  if (!address) return { ok: false, reason: "missing_host", raw };
  const port = Number(url.port || 443);
  if (!validPort(port)) return { ok: false, reason: "invalid_port", raw };
  const q = url.searchParams;
  const config: ServerConfig = {
    protocol: "trojan",
    address,
    port,
    secret,
    transport: asTransport(q.get("type")) ?? "tcp",
    security: asSecurity(q.get("security")) ?? "tls",
    sni: q.get("sni") ?? q.get("peer") ?? undefined,
    host: q.get("host") ?? undefined,
    path: q.get("path") ?? undefined,
    fingerprint: q.get("fp") ?? undefined,
    serviceName: q.get("serviceName") ?? undefined,
    alpn: q.get("alpn")?.split(",").filter(Boolean),
  };
  return { ok: true, raw, value: { config, name: decodeName(url.hash) || address } };
}

interface VmessJson {
  v?: string | number;
  ps?: string;
  add?: string;
  port?: string | number;
  id?: string;
  aid?: string | number;
  scy?: string;
  net?: string;
  type?: string;
  host?: string;
  path?: string;
  tls?: string;
  sni?: string;
  fp?: string;
  alpn?: string;
}

function parseVmess(raw: string): ParseResult {
  const body = raw.slice("vmess://".length);
  let json: VmessJson;
  try {
    json = JSON.parse(b64decode(body)) as VmessJson;
  } catch {
    return { ok: false, reason: "invalid_base64", raw };
  }
  if (!json || typeof json !== "object") return { ok: false, reason: "malformed", raw };
  if (!json.add) return { ok: false, reason: "missing_host", raw };
  if (!json.id) return { ok: false, reason: "missing_secret", raw };
  const port = Number(json.port);
  if (!validPort(port)) return { ok: false, reason: "invalid_port", raw };
  const config: ServerConfig = {
    protocol: "vmess",
    address: json.add,
    port,
    secret: json.id,
    alterId: Number(json.aid ?? 0) || 0,
    cipher: json.scy || "auto",
    transport: asTransport(json.net) ?? "tcp",
    security: json.tls === "tls" ? "tls" : json.tls === "reality" ? "reality" : "none",
    host: json.host || undefined,
    path: json.path || undefined,
    sni: json.sni || undefined,
    fingerprint: json.fp || undefined,
    alpn: json.alpn ? json.alpn.split(",").filter(Boolean) : undefined,
  };
  return { ok: true, raw, value: { config, name: json.ps || json.add } };
}

/**
 * Shadowsocks SIP002: ss://base64(method:password)@host:port#name
 * и легаси-формат: ss://base64(method:password@host:port)#name
 */
function parseShadowsocks(raw: string): ParseResult {
  const withoutScheme = raw.slice("ss://".length);
  const hashIdx = withoutScheme.indexOf("#");
  const name = hashIdx >= 0 ? decodeName(withoutScheme.slice(hashIdx + 1)) : "";
  let main = hashIdx >= 0 ? withoutScheme.slice(0, hashIdx) : withoutScheme;
  const qIdx = main.indexOf("?");
  if (qIdx >= 0) main = main.slice(0, qIdx);
  main = main.replace(/\/$/, "");

  let userinfo: string;
  let hostport: string;
  const at = main.lastIndexOf("@");
  try {
    if (at >= 0) {
      const ui = decodeURIComponent(main.slice(0, at));
      userinfo = ui.includes(":") ? ui : b64decode(ui);
      hostport = main.slice(at + 1);
    } else {
      const decoded = b64decode(main);
      const dAt = decoded.lastIndexOf("@");
      if (dAt < 0) return { ok: false, reason: "malformed", raw };
      userinfo = decoded.slice(0, dAt);
      hostport = decoded.slice(dAt + 1);
    }
  } catch {
    return { ok: false, reason: "invalid_base64", raw };
  }
  const colon = userinfo.indexOf(":");
  if (colon < 0) return { ok: false, reason: "malformed", raw };
  const method = userinfo.slice(0, colon);
  const secret = userinfo.slice(colon + 1);
  if (!secret) return { ok: false, reason: "missing_secret", raw };
  const m = hostport.match(/^\[?([^\]]+?)\]?:(\d+)$/);
  if (!m) return { ok: false, reason: "missing_host", raw };
  const port = Number(m[2]);
  if (!validPort(port)) return { ok: false, reason: "invalid_port", raw };
  const config: ServerConfig = { protocol: "shadowsocks", address: m[1], port, secret, method };
  return { ok: true, raw, value: { config, name: name || m[1] } };
}

export function detectProtocol(line: string): Protocol | null {
  const l = line.trim().toLowerCase();
  if (l.startsWith("vless://")) return "vless";
  if (l.startsWith("vmess://")) return "vmess";
  if (l.startsWith("trojan://")) return "trojan";
  if (l.startsWith("ss://")) return "shadowsocks";
  return null;
}

/** Разбор одной URI-строки. Никогда не исполняет содержимое — только парсит. */
export function parseUri(input: string): ParseResult {
  const raw = input.trim();
  if (!raw) return { ok: false, reason: "empty", raw };
  if (raw.length > MAX_URI_LENGTH) return { ok: false, reason: "too_long", raw };
  switch (detectProtocol(raw)) {
    case "vless":
      return parseVless(raw);
    case "vmess":
      return parseVmess(raw);
    case "trojan":
      return parseTrojan(raw);
    case "shadowsocks":
      return parseShadowsocks(raw);
    default:
      return { ok: false, reason: "unsupported_scheme", raw };
  }
}

export interface BatchParseLine {
  line: number;
  result: ParseResult;
  /** Обезличенный фрагмент для показа пользователю. */
  preview: string;
}

export interface BatchParseResult {
  items: BatchParseLine[];
  valid: ParsedConfig[];
  errors: BatchParseLine[];
  duplicates: number;
  /** Тело было целиком в base64 (типичный формат подписки). */
  wasBase64: boolean;
}

/** Ключ дедупликации: протокол + адрес + порт + секрет + транспорт. */
export function dedupKey(c: ServerConfig): string {
  return [c.protocol, c.address.toLowerCase(), c.port, c.secret, c.transport ?? "", c.path ?? ""].join("|");
}

/**
 * Разбор многострочного текста: TXT-файл, тело подписки (в т.ч. base64), вставка из буфера.
 * Пустые строки и комментарии (# ...) пропускаются.
 */
export function parseBatch(text: string, maxLines = 5000): BatchParseResult {
  let body = text;
  let wasBase64 = false;
  if (!body.includes("://") && looksLikeBase64(body)) {
    try {
      body = b64decode(body);
      wasBase64 = true;
    } catch {
      /* оставляем как есть — ошибки покажутся построчно */
    }
  }
  const lines = body.split(/\r?\n/).slice(0, maxLines);
  const items: BatchParseLine[] = [];
  const seen = new Set<string>();
  const valid: ParsedConfig[] = [];
  let duplicates = 0;
  lines.forEach((l, idx) => {
    const trimmed = l.trim();
    if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("//")) return;
    const result = parseUri(trimmed);
    const preview = maskSecrets(trimmed).slice(0, 80);
    items.push({ line: idx + 1, result, preview });
    if (result.ok) {
      const key = dedupKey(result.value.config);
      if (seen.has(key)) {
        duplicates += 1;
        return;
      }
      seen.add(key);
      valid.push(result.value);
    }
  });
  return { items, valid, errors: items.filter((i) => !i.result.ok), duplicates, wasBase64 };
}
