import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { RefreshCw, Search } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/app/store";
import { Notice, Screen } from "@/components/swit4/Screen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { BUILTIN_SOURCES } from "@/data/builtin-sources";
import {
  addRoutingToRules,
  getCachedRouting,
  refreshCatalogSource,
  refreshEnabledCatalog,
  setCatalogEnabled,
} from "@/features/subscriptions/catalog";
import { maskUrl } from "@/services/parsers/mask";
import { formatAge } from "@/lib/format";
import { useL } from "@/lib/i18n";
import { useT } from "@/localization";
import { EMPTY_CATALOG_STATE, type CatalogContentKind } from "@/types";

const TITLE = "Каталог источников — SWIT4";
const DESC =
  "Встроенный каталог SWIT4: 26 публичных источников с зеркалами, автоопределение формата и разделение серверов и правил маршрутизации.";

export const Route = createFileRoute("/subscriptions/catalog")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CatalogPage,
});

function CatalogPage() {
  const L = useL();
  const t = useT();
  const catalog = useAppStore((s) => s.catalog);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  // В браузере: при открытии обновляем включённые источники старше 30 мин.
  // Регулярное автообновление — задача backend (каждые 30 мин) и Android WorkManager (best-effort).
  useEffect(() => {
    void refreshEnabledCatalog(true);
  }, []);

  const kindLabel: Record<CatalogContentKind, string> = {
    servers: L("Серверная подписка", "Server subscription"),
    routing: L("Список маршрутизации", "Routing list"),
    unsupported: L("Формат не поддерживается", "Unsupported format"),
    empty: L("Пустой ответ", "Empty response"),
    unknown: L("Не проверен", "Not inspected"),
  };

  const list = BUILTIN_SOURCES.filter((s) =>
    `${s.name} ${s.urls.join(" ")}`.toLowerCase().includes(q.trim().toLowerCase()),
  );
  const enabledCount = Object.values(catalog).filter((c) => c.enabled).length;
  const urlCount = BUILTIN_SOURCES.reduce((n, s) => n + s.urls.length, 0);

  const refreshAll = async () => {
    setBusy(true);
    await refreshEnabledCatalog(false);
    setBusy(false);
  };

  const toRules = (id: string, action: "proxy" | "direct") => {
    const n = addRoutingToRules(id, action);
    toast.success(L(`Добавлено правил: ${n}`, `Rules added: ${n}`));
  };

  return (
    <Screen
      title={L("Встроенный каталог", "Built-in catalogue")}
      subtitle={L(
        `${BUILTIN_SOURCES.length} источников · ${urlCount} URL · ${enabledCount} включено`,
        `${BUILTIN_SOURCES.length} sources · ${urlCount} URLs · ${enabledCount} enabled`,
      )}
      back="/subscriptions"
      actions={
        <Button
          variant="ghost"
          size="icon"
          disabled={busy || enabledCount === 0}
          onClick={() => void refreshAll()}
          aria-label={L("Обновить включённые", "Refresh enabled")}
        >
          <RefreshCw className={busy ? "animate-spin" : ""} />
        </Button>
      }
    >
      <div className="space-y-4">
        <Notice tone="warning" title={L("Непроверенные публичные источники", "Unverified public sources")}>
          {L(
            "Все источники выключены по умолчанию. Формат определяется по загруженному содержимому, а не по названию. Списки доменов/IP/CIDR не попадают в серверы — их можно добавить в «Правила». Зеркала используются по очереди как запасные. В браузере загрузка может блокироваться CORS; автообновление каждые 30 мин выполняет backend, на Android — WorkManager без гарантии точного времени.",
            "All sources are off by default. Format is detected from downloaded content, not the name. Domain/IP/CIDR lists never become servers — you can add them to Rules. Mirrors are tried one by one as fallbacks. Browsers may block downloads via CORS; 30-min auto-refresh runs on the backend, on Android via best-effort WorkManager.",
          )}
        </Notice>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={L("Поиск источника", "Search source")}
            aria-label={L("Поиск источника", "Search source")}
            className="h-11 rounded-xl bg-surface pl-10"
          />
        </div>
        {list.map((src) => {
          const c = catalog[src.id] ?? EMPTY_CATALOG_STATE;
          const cached = c.kind === "routing" ? getCachedRouting(src.id).length : 0;
          return (
            <div key={src.id} className="surface-card p-4" data-testid={`catalog-${src.id}`}>
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{src.name}</div>
                  <div className="mt-1 space-y-0.5">
                    {src.urls.map((u, i) => (
                      <div
                        key={u}
                        className={`truncate font-mono text-[11px] ${c.mirrorIndex === i ? "text-primary" : "text-muted-foreground"}`}
                      >
                        {i === 0 ? "" : L("зеркало · ", "mirror · ")}
                        {maskUrl(u)}
                      </div>
                    ))}
                  </div>
                </div>
                <Switch
                  checked={c.enabled}
                  onCheckedChange={(v) => void setCatalogEnabled(src.id, v)}
                  aria-label={L(`Включить ${src.name}`, `Enable ${src.name}`)}
                />
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                <span className="text-foreground">
                  {c.status === "loading" ? L("Загрузка…", "Loading…") : kindLabel[c.kind]}
                </span>
                {c.kind === "servers" && (
                  <span>
                    {L("Конфиг.", "Configs")}: <b className="font-mono text-foreground">{c.serverCount}</b>
                  </span>
                )}
                {c.kind === "routing" && (
                  <span>
                    {L("Записей", "Entries")}: <b className="font-mono text-foreground">{c.ruleCount}</b>
                  </span>
                )}
                <span>
                  {L("Загружено", "Fetched")} {formatAge(c.lastFetchedAt, t)}
                </span>
              </div>
              {c.error && <p className="mt-2 text-xs text-destructive">{c.error}</p>}
              {c.enabled && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="surface"
                    disabled={c.status === "loading"}
                    onClick={() => void refreshCatalogSource(src.id)}
                  >
                    <RefreshCw /> {L("Обновить", "Refresh")}
                  </Button>
                  {cached > 0 && (
                    <>
                      <Button size="sm" variant="surface" onClick={() => toRules(src.id, "proxy")}>
                        {L("В правила: через VPN", "To rules: via VPN")}
                      </Button>
                      <Button size="sm" variant="surface" onClick={() => toRules(src.id, "direct")}>
                        {L("В правила: напрямую", "To rules: direct")}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Screen>
  );
}
