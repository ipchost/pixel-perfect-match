import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Info, Plus, RefreshCw } from "lucide-react";
import { useAppStore } from "@/app/store";
import { Notice, Screen } from "@/components/swit4/Screen";
import { DemoBadge } from "@/components/swit4/DemoBadge";
import { EmptyState } from "@/components/swit4/EmptyState";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { AddSourceDialog } from "@/features/subscriptions/AddSourceDialog";
import { SubStatus } from "@/features/subscriptions/SubStatus";
import { displayUrl, isLocalSource, refreshSubscription } from "@/features/subscriptions/actions";
import { formatAge } from "@/lib/format";
import { useT } from "@/localization";
import { useL } from "@/lib/i18n";

export const Route = createFileRoute("/subscriptions/")({
  head: () => ({
    meta: [
      { title: "Подписки — SWIT4" },
      {
        name: "description",
        content: "Подписки и импорт конфигураций SWIT4: URL, URI, TXT, автообновление.",
      },
      { property: "og:title", content: "Подписки — SWIT4" },
      {
        property: "og:description",
        content: "Подписки и импорт конфигураций SWIT4: URL, URI, TXT, автообновление.",
      },
    ],
  }),
  component: SubscriptionsPage,
});

function SubscriptionsPage() {
  const t = useT();
  const L = useL();
  const subs = useAppStore((s) => s.subscriptions);
  const servers = useAppStore((s) => s.servers);
  const update = useAppStore((s) => s.updateSubscription);
  const [open, setOpen] = useState(false);
  const refreshAll = () =>
    subs
      .filter((s) => s.enabled && !isLocalSource(s))
      .forEach((s) => void refreshSubscription(s.id));

  return (
    <Screen
      title={L("Подписки", "Sources")}
      subtitle={L(`${subs.length} источников`, `${subs.length} sources`)}
      actions={
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={refreshAll}
            aria-label={L("Обновить все", "Refresh all")}
          >
            <RefreshCw />
          </Button>
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus /> {L("Добавить", "Add")}
          </Button>
        </>
      }
    >
      {subs.length === 0 ? (
        <EmptyState
          kind="subscriptions"
          title={L("Нет источников", "No sources")}
          text={L(
            "Добавьте ссылку на подписку или импортируйте конфигурации.",
            "Add a subscription URL or import configs.",
          )}
          action={
            <Button onClick={() => setOpen(true)}>
              <Plus /> {L("Добавить источник", "Add source")}
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {subs.map((s) => {
            const list = servers.filter((x) => x.subscriptionId === s.id);
            const checked = list.filter((x) => x.lastProbe).length;
            const working = list.filter(
              (x) => x.status === "available" || x.status === "slow",
            ).length;
            return (
              <div key={s.id} className="surface-card p-4">
                <div className="flex items-start gap-3">
                  <Link to="/subscriptions/$id" params={{ id: s.id }} className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{s.name}</span>
                      {s.isDemo && <DemoBadge withIcon={false} />}
                    </div>
                    <div className="mt-0.5 truncate font-mono text-[11.5px] text-muted-foreground">
                      {displayUrl(s)}
                    </div>
                  </Link>
                  <Switch
                    checked={s.enabled}
                    onCheckedChange={(v) =>
                      update(s.id, {
                        enabled: v,
                        status: v ? (s.lastUpdatedAt ? "ok" : "never_updated") : "disabled",
                      })
                    }
                    aria-label={L("Включить источник", "Enable source")}
                  />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
                  <SubStatus status={s.status} />
                  <span>
                    {L("Конфиг.", "Configs")}:{" "}
                    <b className="font-mono text-foreground">
                      {Math.max(s.configCount, list.length)}
                    </b>
                  </span>
                  <span>
                    {L("Проверено", "Checked")}:{" "}
                    <b className="font-mono text-foreground">{checked}</b>
                  </span>
                  <span>
                    {L("Рабочих", "Working")}: <b className="font-mono text-status-ok">{working}</b>
                  </span>
                  <span>
                    {L("Обновлено", "Updated")} {formatAge(s.lastUpdatedAt, t)}
                  </span>
                  {!isLocalSource(s) && (
                    <span>
                      {L(`каждые ${s.refreshIntervalMin} мин`, `every ${s.refreshIntervalMin} min`)}
                    </span>
                  )}
                </div>
                {s.lastError && <p className="mt-2 text-xs text-destructive">{s.lastError}</p>}
                <div className="mt-3 flex gap-2">
                  {!isLocalSource(s) && (
                    <Button
                      size="sm"
                      variant="surface"
                      onClick={() => void refreshSubscription(s.id)}
                      disabled={s.status === "updating"}
                    >
                      <RefreshCw className={s.status === "updating" ? "animate-spin" : ""} />{" "}
                      {L("Обновить", "Refresh")}
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" asChild>
                    <Link to="/subscriptions/$id" params={{ id: s.id }}>
                      {L("Подробнее", "Details")} <ChevronRight />
                    </Link>
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Notice
        tone="info"
        icon={<Info />}
        className="mt-6"
        title={L("Автообновление", "Auto-refresh")}
      >
        {L(
          "По умолчанию — каждые 30 минут, пока приложение открыто. В продукте основной планировщик работает на backend; Android WorkManager не гарантирует точный запуск каждые 30 минут из-за ограничений системы (Doze, экономия батареи).",
          "Default is every 30 minutes while the app is open. In production the main scheduler runs on the backend; Android WorkManager can't guarantee exact 30-minute runs due to system limits (Doze, battery saver).",
        )}
      </Notice>
      <AddSourceDialog open={open} onOpenChange={setOpen} />
    </Screen>
  );
}
