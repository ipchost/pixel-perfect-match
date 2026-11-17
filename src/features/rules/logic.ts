import type { DomainRule, RuleConflict, RuleMatchType } from "@/types";

const DOMAIN_RE = /^(?=.{1,253}$)(?!-)([a-z0-9-]{1,63}\.)*[a-z0-9-]{1,63}$/i;
const IPV4_RE = /^(25[0-5]|2[0-4]\d|1?\d?\d)(\.(25[0-5]|2[0-4]\d|1?\d?\d)){3}$/;
const IPV6_RE = /^[0-9a-f:]+$/i;

/** Проверка значения правила по типу совпадения. Возвращает код ошибки или null. */
export function validateRuleValue(match: RuleMatchType, raw: string): string | null {
  const v = raw.trim().toLowerCase();
  if (!v) return "empty";
  switch (match) {
    case "domain":
    case "domain_suffix":
      return DOMAIN_RE.test(v.replace(/^\./, "")) && v.includes(".") ? null : "invalid_domain";
    case "domain_keyword":
      return /^[a-z0-9.-]{2,64}$/.test(v) ? null : "invalid_keyword";
    case "ip":
      return IPV4_RE.test(v) || (v.includes(":") && IPV6_RE.test(v)) ? null : "invalid_ip";
    case "cidr": {
      const [ip, bits, extra] = v.split("/");
      if (extra !== undefined || !ip || bits === undefined) return "invalid_cidr";
      const n = Number(bits);
      if (IPV4_RE.test(ip)) return Number.isInteger(n) && n >= 0 && n <= 32 ? null : "invalid_cidr";
      if (ip.includes(":") && IPV6_RE.test(ip)) return Number.isInteger(n) && n >= 0 && n <= 128 ? null : "invalid_cidr";
      return "invalid_cidr";
    }
  }
}

export function normalizeValue(match: RuleMatchType, raw: string) {
  const v = raw.trim().toLowerCase();
  return match === "domain_suffix" ? v.replace(/^\./, "") : v;
}

function suffixCovers(suffix: string, domain: string) {
  return domain === suffix || domain.endsWith(`.${suffix}`);
}

/** Поиск конфликтов: дубликаты, одно значение с разными действиями, правило перекрыто более ранним суффиксом. */
export function findConflicts(rules: DomainRule[]): RuleConflict[] {
  const active = rules.filter((r) => r.enabled).sort((a, b) => a.priority - b.priority);
  const out: RuleConflict[] = [];
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i]!;
      const b = active[j]!;
      if (a.match === b.match && a.value === b.value) {
        out.push({ ruleIds: [a.id, b.id], value: b.value, reason: a.action === b.action ? "duplicate" : "same_value_different_action" });
      } else if (a.match === "domain_suffix" && (b.match === "domain" || b.match === "domain_suffix") && suffixCovers(a.value, b.value) && a.action !== b.action) {
        out.push({ ruleIds: [a.id, b.id], value: b.value, reason: "shadowed_by_suffix" });
      }
    }
  }
  return out;
}

/** Перенумерует приоритеты по текущему порядку (10, 20, 30…). */
export function renumber(rules: DomainRule[]): DomainRule[] {
  return rules.map((r, i) => ({ ...r, priority: (i + 1) * 10 }));
}

/** Импорт TXT: строки вида "proxy domain_suffix example.com" или просто "example.com" (proxy, suffix). */
export function parseRulesTxt(text: string): { rules: Omit<DomainRule, "id" | "priority">[]; errors: number } {
  const rules: Omit<DomainRule, "id" | "priority">[] = [];
  let errors = 0;
  const actions = new Set(["proxy", "direct", "block"]);
  const matches = new Set(["domain", "domain_suffix", "domain_keyword", "ip", "cidr"]);
  for (const line of text.split(/\r?\n/)) {
    const l = line.trim();
    if (!l || l.startsWith("#")) continue;
    const parts = l.split(/[\s,]+/);
    let action: DomainRule["action"] = "proxy";
    let match: RuleMatchType | null = null;
    let value = parts[parts.length - 1] ?? "";
    if (parts.length >= 3 && actions.has(parts[0]!) && matches.has(parts[1]!)) {
      action = parts[0] as DomainRule["action"];
      match = parts[1] as RuleMatchType;
      value = parts[2]!;
    } else if (parts.length === 1) {
      match = value.includes("/") ? "cidr" : IPV4_RE.test(value) ? "ip" : "domain_suffix";
    }
    if (!match || validateRuleValue(match, value)) {
      errors++;
      continue;
    }
    rules.push({ match, value: normalizeValue(match, value), action, enabled: true, isDemo: false });
  }
  return { rules, errors };
}

export function rulesToTxt(rules: DomainRule[]) {
  return ["# SWIT4 routing rules: <action> <match> <value>", ...[...rules].sort((a, b) => a.priority - b.priority).map((r) => `${r.action} ${r.match} ${r.value}`)].join("\n");
}

/** Package names: по одному в строке, валидный Java-пакет. */
export function parsePackageList(text: string): { packages: string[]; invalid: number } {
  const re = /^[a-zA-Z][\w]*(\.[a-zA-Z][\w]*)+$/;
  const packages: string[] = [];
  let invalid = 0;
  for (const line of text.split(/[\r\n,]+/)) {
    const p = line.trim();
    if (!p || p.startsWith("#")) continue;
    if (re.test(p)) {
      if (!packages.includes(p)) packages.push(p);
    } else invalid++;
  }
  return { packages, invalid };
}
