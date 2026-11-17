import { parseBatch } from "@/services/parsers/uri";
import type { CatalogContentKind, RuleMatchType } from "@/types";

export interface RoutingEntry {
  match: RuleMatchType;
  value: string;
}

export interface Classification {
  kind: CatalogContentKind;
  serverCount: number;
  routing: RoutingEntry[];
}

const DOMAIN = /^(?=.{1,253}$)(?:[a-z0-9_](?:[a-z0-9_-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i;
const IPV4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const CIDR4 = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}\/(3[0-2]|[12]?\d)$/;
const CIDR6 = /^[0-9a-f:]+:[0-9a-f:]*\/\d{1,3}$/i;

/** Распознаёт строку списка маршрутизации (domain / IP / CIDR, включая префиксы Clash/Xray). */
export function parseRoutingLine(raw: string): RoutingEntry | null {
  let l = raw.trim().replace(/^-\s+/, "").replace(/^['"]|['"]$/g, "");
  if (!l) return null;
  const clash = /^(DOMAIN-SUFFIX|DOMAIN-KEYWORD|DOMAIN|IP-CIDR6?|)\s*,\s*([^,\s]+)/i.exec(l);
  if (clash && clash[1]) {
    const t = clash[1].toUpperCase();
    const v = clash[2]!;
    if (t === "DOMAIN-SUFFIX") return { match: "domain_suffix", value: v.toLowerCase() };
    if (t === "DOMAIN-KEYWORD") return { match: "domain_keyword", value: v.toLowerCase() };
    if (t === "DOMAIN") return { match: "domain", value: v.toLowerCase() };
    return { match: "cidr", value: v };
  }
  const xray = /^(full|domain|keyword|regexp):(.+)$/i.exec(l);
  if (xray) {
    const t = xray[1]!.toLowerCase();
    if (t === "regexp") return null;
    const v = xray[2]!.trim().toLowerCase();
    if (t === "full") return { match: "domain", value: v };
    if (t === "keyword") return { match: "domain_keyword", value: v };
    return DOMAIN.test(v) ? { match: "domain_suffix", value: v } : null;
  }
  l = l.replace(/^\+\.|^\*\.|^\./, "");
  if (CIDR4.test(l) || CIDR6.test(l)) return { match: "cidr", value: l };
  if (IPV4.test(l)) return { match: "ip", value: l };
  if (DOMAIN.test(l)) return { match: "domain_suffix", value: l.toLowerCase() };
  return null;
}

/**
 * Определяет фактический формат источника по содержимому.
 * Серверная подписка — если распознаны поддерживаемые URI (VLESS/VMess/Trojan/SS, в т.ч. base64).
 * Список маршрутизации — если ≥60% значимых строк являются доменами/IP/CIDR.
 */
export function classifyContent(text: string): Classification {
  const body = text.trim();
  if (!body) return { kind: "empty", serverCount: 0, routing: [] };
  if (/^<(!doctype|html)/i.test(body)) return { kind: "unsupported", serverCount: 0, routing: [] };
  const parsed = parseBatch(body);
  if (parsed.valid.length > 0)
    return { kind: "servers", serverCount: parsed.valid.length, routing: [] };
  const lines = body
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+#.*$/, "").trim())
    .filter((l) => l && !l.startsWith("#") && !l.startsWith("//") && !/^payload:/i.test(l));
  if (lines.length === 0) return { kind: "empty", serverCount: 0, routing: [] };
  const routing: RoutingEntry[] = [];
  const seen = new Set<string>();
  for (const l of lines) {
    const e = parseRoutingLine(l);
    if (!e) continue;
    const k = `${e.match}:${e.value}`;
    if (!seen.has(k)) {
      seen.add(k);
      routing.push(e);
    }
  }
  if (routing.length / lines.length >= 0.6) return { kind: "routing", serverCount: 0, routing };
  return { kind: "unsupported", serverCount: 0, routing: [] };
}

/** Последовательный перебор зеркал: следующий URL пробуется только после ошибки предыдущего. */
export async function fetchWithMirrors(
  urls: string[],
  fetchOne: (url: string) => Promise<string>,
): Promise<{ text: string; index: number } | { error: string; attempts: number }> {
  let last = "NO_URL";
  for (let i = 0; i < urls.length; i++) {
    try {
      return { text: await fetchOne(urls[i]!), index: i };
    } catch (e) {
      last = e instanceof Error ? e.message : String(e);
    }
  }
  return { error: last, attempts: urls.length };
}
