import { useAppStore } from "@/app/store";
import { BUILTIN_SOURCES } from "@/data/builtin-sources";
import { uid } from "@/lib/random";
import type { DomainRule, RuleAction } from "@/types";
import { fetchBody, importConfigs, validateSubscriptionUrl } from "./actions";
import { classifyContent, fetchWithMirrors, type RoutingEntry } from "./classify";

export const CATALOG_PREFIX = "catalog:";
export const CATALOG_REFRESH_MIN = 30;
const MAX_RULES_IMPORT = 5000;
const CONCURRENCY = 3;

/** Распознанные routing-записи хранятся только в памяти до явного добавления в «Правила». */
const routingCache = new Map<string, RoutingEntry[]>();
const inFlight = new Set<string>();

export function catalogSubId(id: string) {
  return `${CATALOG_PREFIX}${id}`;
}

export function getCachedRouting(id: string) {
  return routingCache.get(id) ?? [];
}

async function safeFetch(url: string) {
  const v = validateSubscriptionUrl(url);
  if (!v.ok) throw new Error(v.reason.toUpperCase());
  if (!v.url.startsWith("https://")) throw new Error("HTTPS_ONLY");
  return fetchBody(v.url);
}

export async function refreshCatalogSource(id: string) {
  const src = BUILTIN_SOURCES.find((s) => s.id === id);
  if (!src || inFlight.has(id)) return;
  inFlight.add(id);
  const st = useAppStore.getState();
  st.patchCatalog(id, { status: "loading", error: null });
  try {
    const res = await fetchWithMirrors(src.urls, safeFetch);
    const now = new Date().toISOString();
    if ("error" in res) {
      useAppStore.getState().patchCatalog(id, {
        status: "error",
        error: `${res.error} (${res.attempts}/${src.urls.length})`,
        lastFetchedAt: now,
      });
      return;
    }
    const c = classifyContent(res.text);
    let serverCount = 0;
    if (c.kind === "servers") serverCount = importConfigs(res.text, catalogSubId(id)).total;
    if (c.kind === "routing") routingCache.set(id, c.routing);
    useAppStore.getState().patchCatalog(id, {
      status: "ok",
      kind: c.kind,
      mirrorIndex: res.index,
      serverCount,
      ruleCount: c.routing.length,
      lastFetchedAt: now,
      error: null,
    });
    useAppStore.getState().addEvent({
      level: "info",
      category: "subscription",
      message: `Каталог «${src.name}»: ${
        c.kind === "servers"
          ? `${serverCount} конфигураций`
          : c.kind === "routing"
            ? `список маршрутизации, ${c.routing.length} записей`
            : "формат не поддерживается"
      }`,
      isDemo: false,
    });
  } finally {
    inFlight.delete(id);
  }
}

export async function setCatalogEnabled(id: string, enabled: boolean) {
  const st = useAppStore.getState();
  st.patchCatalog(id, { enabled });
  if (enabled) return refreshCatalogSource(id);
  const sub = catalogSubId(id);
  st.removeServers(st.servers.filter((s) => s.subscriptionId === sub).map((s) => s.id));
  routingCache.delete(id);
}

/** Обновляет включённые источники с ограниченным параллелизмом. `onlyStale` — только старше 30 мин. */
export async function refreshEnabledCatalog(onlyStale = false) {
  const { catalog } = useAppStore.getState();
  const cutoff = Date.now() - CATALOG_REFRESH_MIN * 60_000;
  const queue = BUILTIN_SOURCES.filter((s) => {
    const c = catalog[s.id];
    if (!c?.enabled) return false;
    if (!onlyStale) return true;
    return !c.lastFetchedAt || Date.parse(c.lastFetchedAt) < cutoff;
  }).map((s) => s.id);
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (queue.length) await refreshCatalogSource(queue.shift()!);
  });
  await Promise.all(workers);
}

export function addRoutingToRules(id: string, action: RuleAction) {
  const entries = getCachedRouting(id).slice(0, MAX_RULES_IMPORT);
  const st = useAppStore.getState();
  const existing = new Set(st.domainRules.map((r) => `${r.match}:${r.value}`));
  const base = st.domainRules.length;
  const src = BUILTIN_SOURCES.find((s) => s.id === id);
  const added: DomainRule[] = entries
    .filter((e) => !existing.has(`${e.match}:${e.value}`))
    .map((e, i) => ({
      id: uid("rule"),
      match: e.match,
      value: e.value,
      action,
      priority: base + i,
      enabled: true,
      note: src ? `Каталог: ${src.name}` : undefined,
      isDemo: false,
    }));
  st.setDomainRules([...st.domainRules, ...added]);
  return added.length;
}
