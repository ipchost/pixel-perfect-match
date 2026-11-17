import { useAppStore } from "@/app/store";
import { getApi } from "@/services/api";
import { dedupKey, parseBatch, type BatchParseResult } from "@/services/parsers/uri";
import { maskSecrets, maskUrl } from "@/services/parsers/mask";
import { guessCountry } from "@/mocks/countries";
import { hashString, uid } from "@/lib/random";
import type { Server, Subscription, SubscriptionLineError } from "@/types";

export const LOCAL_SOURCE_PREFIX = "local://";
const MAX_BODY_BYTES = 5 * 1024 * 1024;

export function isLocalSource(sub: Subscription) {
  return sub.url.startsWith(LOCAL_SOURCE_PREFIX);
}

export function displayUrl(sub: Subscription) {
  return isLocalSource(sub) ? sub.url.slice(LOCAL_SOURCE_PREFIX.length) : maskUrl(sub.url);
}

const PRIVATE_HOST =
  /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|::1$|\[::1\]|172\.(1[6-9]|2\d|3[01])\.)/i;

/** Валидация URL подписки (клиентская часть SSRF-защиты; основная — на backend). */
export function validateSubscriptionUrl(
  raw: string,
): { ok: true; url: string } | { ok: false; reason: string } {
  const value = raw.trim();
  if (!value) return { ok: false, reason: "empty" };
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    return { ok: false, reason: "invalid" };
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return { ok: false, reason: "scheme" };
  if (PRIVATE_HOST.test(u.hostname)) return { ok: false, reason: "private" };
  if (value.length > 2048) return { ok: false, reason: "too_long" };
  return { ok: true, url: u.toString() };
}

export function serverIdFor(key: string) {
  return `srv_${hashString(key).toString(36)}`;
}

function toServers(
  parsed: BatchParseResult,
  subscriptionId: string | null,
  rawByLine: Map<number, string>,
): Server[] {
  return parsed.items.flatMap((item) => {
    if (!item.result.ok) return [];
    const { config, name } = item.result.value;
    const key = dedupKey(config);
    const server: Server = {
      id: serverIdFor(key),
      name: name || config.address,
      countryCode: guessCountry(name),
      city: "",
      config,
      subscriptionId,
      status: "unchecked",
      lastProbe: null,
      probeHistory: [],
      excludedFromAuto: false,
      rawUri: rawByLine.get(item.line) ?? item.result.raw,
      isDemo: false,
    };
    return [server];
  });
}

function lineErrors(parsed: BatchParseResult): SubscriptionLineError[] {
  return parsed.errors.slice(0, 50).map((e) => ({
    line: e.line,
    preview: maskSecrets(e.preview),
    reason: e.result.ok ? "" : e.result.reason,
  }));
}

export interface ImportOutcome {
  added: number;
  updated: number;
  duplicates: number;
  errors: SubscriptionLineError[];
  total: number;
  wasBase64: boolean;
}

/** Импорт набора URI/подписки (TXT, base64) в хранилище. Секреты остаются только на устройстве. */
export function importConfigs(text: string, subscriptionId: string | null): ImportOutcome {
  const parsed = parseBatch(text);
  const raw = new Map(parsed.items.map((i) => [i.line, i.result.raw]));
  const incoming = toServers(parsed, subscriptionId, raw);
  const st = useAppStore.getState();
  const existing = new Set(st.servers.map((s) => s.id));
  const uniq = new Map(incoming.map((s) => [s.id, s]));
  let added = 0;
  let updated = 0;
  uniq.forEach((s) => (existing.has(s.id) ? updated++ : added++));
  // Сохраняем результаты проверок у существующих серверов.
  const merged = [...uniq.values()].map((s) => {
    const prev = st.servers.find((x) => x.id === s.id);
    return prev
      ? {
          ...s,
          status: prev.status,
          lastProbe: prev.lastProbe,
          probeHistory: prev.probeHistory,
          excludedFromAuto: prev.excludedFromAuto,
          missingFromSource: undefined,
        }
      : s;
  });
  st.upsertServers(merged);
  return {
    added,
    updated,
    duplicates: parsed.duplicates + (incoming.length - uniq.size),
    errors: lineErrors(parsed),
    total: uniq.size,
    wasBase64: parsed.wasBase64,
  };
}

function makeSubscription(name: string, url: string, intervalMin: number): Subscription {
  return {
    id: uid("sub"),
    name:
      name.trim() ||
      (url.startsWith(LOCAL_SOURCE_PREFIX)
        ? url.slice(LOCAL_SOURCE_PREFIX.length)
        : new URL(url).hostname),
    url,
    addedAt: new Date().toISOString(),
    lastUpdatedAt: null,
    refreshIntervalMin: intervalMin,
    configCount: 0,
    availableCount: 0,
    status: "never_updated",
    enabled: true,
    errors: [],
    history: [],
    isDemo: false,
  };
}

/** Создаёт локальный источник из текста (TXT-файл, буфер обмена, ручной ввод). */
export function importAsLocalSource(
  name: string,
  text: string,
): { sub: Subscription | null; outcome: ImportOutcome } {
  const sub = makeSubscription(name, `${LOCAL_SOURCE_PREFIX}${name.trim() || "import.txt"}`, 0);
  const outcome = importConfigs(text, sub.id);
  if (outcome.total === 0) return { sub: null, outcome };
  const st = useAppStore.getState();
  st.addSubscription({
    ...sub,
    configCount: outcome.total,
    lastUpdatedAt: new Date().toISOString(),
    status: "ok",
    errors: outcome.errors,
    history: [
      {
        at: new Date().toISOString(),
        added: outcome.added,
        removed: 0,
        total: outcome.total,
        isDemo: false,
      },
    ],
  });
  st.addEvent({
    level: "success",
    category: "subscription",
    message: `Импортирован источник «${sub.name}»: ${outcome.total} конфигураций`,
    isDemo: false,
  });
  return { sub, outcome };
}

export async function addUrlSubscription(name: string, url: string, intervalMin: number) {
  const sub = makeSubscription(name, url, intervalMin);
  useAppStore.getState().addSubscription(sub);
  useAppStore.getState().addEvent({
    level: "info",
    category: "subscription",
    message: `Добавлена подписка «${sub.name}» (${maskUrl(url)})`,
    isDemo: false,
  });
  await refreshSubscription(sub.id);
  return sub;
}

export async function fetchBody(url: string): Promise<string> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await fetch(url, { signal: ctrl.signal, redirect: "follow", credentials: "omit" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const len = Number(res.headers.get("content-length") ?? 0);
    if (len > MAX_BODY_BYTES) throw new Error("TOO_LARGE");
    const text = await res.text();
    if (text.length > MAX_BODY_BYTES) throw new Error("TOO_LARGE");
    return text;
  } finally {
    clearTimeout(timer);
  }
}

const inFlight = new Set<string>();

/**
 * Обновление подписки. Пользовательские URL браузер пытается загрузить напрямую (часто блокируется CORS —
 * в Android-версии и на backend этого ограничения нет). DEMO-подписки обновляются через mock API.
 */
export async function refreshSubscription(id: string) {
  if (inFlight.has(id)) return;
  const st = useAppStore.getState();
  const sub = st.subscriptions.find((s) => s.id === id);
  if (!sub) return;
  if (isLocalSource(sub)) {
    st.updateSubscription(id, {
      lastError: "Локальный источник: обновите повторным импортом файла",
    });
    return;
  }
  inFlight.add(id);
  st.updateSubscription(id, { status: "updating" });
  const now = new Date().toISOString();
  try {
    if (sub.isDemo) {
      const res = await getApi().refreshSubscription(id);
      if (!res.ok) throw new Error(res.error.message);
      const total = Math.max(0, sub.configCount + res.data.added - res.data.removed);
      useAppStore.getState().updateSubscription(id, {
        status: "ok",
        lastUpdatedAt: now,
        lastError: undefined,
        configCount: total,
        history: [
          { at: now, added: res.data.added, removed: res.data.removed, total, isDemo: true },
          ...sub.history,
        ].slice(0, 30),
      });
      useAppStore.getState().addEvent({
        level: "success",
        category: "subscription",
        message: `Подписка «${sub.name}» обновлена (+${res.data.added} / −${res.data.removed})`,
      });
      return;
    }
    const body = await fetchBody(sub.url);
    const before = new Set(
      useAppStore
        .getState()
        .servers.filter((s) => s.subscriptionId === id)
        .map((s) => s.id),
    );
    const outcome = importConfigs(body, id);
    if (outcome.total === 0) throw new Error("NO_VALID_CONFIGS");
    const after = new Set(
      useAppStore
        .getState()
        .servers.filter((s) => s.subscriptionId === id)
        .map((s) => s.id),
    );
    // Удалённые из источника: избранные остаются с пометкой, остальные удаляются.
    const parsedIds = new Set(parseBatch(body).valid.map((v) => serverIdFor(dedupKey(v.config))));
    const gone = [...before].filter((x) => !parsedIds.has(x));
    const fav = new Set(useAppStore.getState().favorites);
    useAppStore.getState().removeServers(gone.filter((g) => !fav.has(g)));
    gone
      .filter((g) => fav.has(g))
      .forEach((g) => useAppStore.getState().updateServer(g, { missingFromSource: true }));
    useAppStore.getState().updateSubscription(id, {
      status: "ok",
      lastUpdatedAt: now,
      lastError: undefined,
      configCount: after.size,
      errors: outcome.errors,
      history: [
        {
          at: now,
          added: outcome.added,
          removed: gone.length,
          total: outcome.total,
          isDemo: false,
        },
        ...sub.history,
      ].slice(0, 30),
    });
    useAppStore.getState().addEvent({
      level: "success",
      category: "subscription",
      message: `Подписка «${sub.name}» обновлена: ${outcome.total} конфигураций`,
      isDemo: false,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const human =
      msg === "NO_VALID_CONFIGS"
        ? "Ответ не содержит поддерживаемых конфигураций"
        : msg === "TOO_LARGE"
          ? "Ответ превышает лимит 5 МБ"
          : msg.startsWith("HTTP")
            ? `Сервер ответил ${msg}`
            : sub.isDemo
              ? msg
              : "Браузер не смог загрузить источник (CORS или сеть). В Android-версии и через backend загрузка выполняется без этого ограничения. Используйте импорт TXT.";
    useAppStore.getState().updateSubscription(id, { status: "error", lastError: human });
    useAppStore.getState().addEvent({
      level: "error",
      category: "subscription",
      message: `Ошибка обновления «${sub.name}»: ${maskSecrets(human)}`,
      isDemo: sub.isDemo,
    });
  } finally {
    inFlight.delete(id);
  }
}

/** Проверяет подписки, которым пора обновиться. Точное расписание — задача backend/WorkManager. */
export function runAutoUpdateTick() {
  const st = useAppStore.getState();
  if (!st.settings.subscriptions.autoUpdate) return;
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  const now = Date.now();
  st.subscriptions.forEach((s) => {
    if (!s.enabled || isLocalSource(s) || s.status === "updating" || s.refreshIntervalMin <= 0)
      return;
    const last = s.lastUpdatedAt ? Date.parse(s.lastUpdatedAt) : 0;
    if (now - last >= s.refreshIntervalMin * 60_000) void refreshSubscription(s.id);
  });
}

export function nextUpdateAt(sub: Subscription): number | null {
  if (!sub.enabled || isLocalSource(sub) || sub.refreshIntervalMin <= 0) return null;
  const last = sub.lastUpdatedAt ? Date.parse(sub.lastUpdatedAt) : Date.now();
  return last + sub.refreshIntervalMin * 60_000;
}
