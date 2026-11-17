import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Download, RefreshCw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/app/store";
import { Card, Screen, Section } from "@/components/swit4/Screen";
import { DemoBadge } from "@/components/swit4/DemoBadge";
import { EmptyState } from "@/components/swit4/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SubStatus } from "@/features/subscriptions/SubStatus";
import {
  displayUrl,
  isLocalSource,
  nextUpdateAt,
  refreshSubscription,
  validateSubscriptionUrl,
} from "@/features/subscriptions/actions";
import { ServerRow, ListCard } from "@/features/servers/ServerRow";
import { ExportDialog } from "@/features/export/ExportDialog";
import { formatDateTime } from "@/lib/format";
import { useLocale } from "@/localization";
import { useL } from "@/lib/i18n";

export const Route = createFileRoute("/subscriptions/$id")({
  head: () => ({
    meta: [
      { title: "Подписка — SWIT4" },
      {
        name: "description",
        content: "Детали подписки SWIT4: серверы, ошибки строк и история изменений.",
      },
      { property: "og:title", content: "Подписка — SWIT4" },
      {
        property: "og:description",
        content: "Детали подписки SWIT4: серверы, ошибки строк и история изменений.",
      },
    ],
  }),
  component: SubscriptionDetail,
});

function SubscriptionDetail() {
  const { id } = Route.useParams();
  const L = useL();
  const locale = useLocale();
  const navigate = useNavigate();
  const sub = useAppStore((s) => s.subscriptions.find((x) => x.id === id));
  const allServers = useAppStore((s) => s.servers);
  const { updateSubscription, removeSubscription, addEvent } = useAppStore.getState();
  const [name, setName] = useState(sub?.name ?? "");
  const [url, setUrl] = useState(sub?.url ?? "");
  const [interval, setInterval] = useState(sub?.refreshIntervalMin ?? 30);
  const [reveal, setReveal] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  if (!sub)
    return (
      <Screen back="/subscriptions" title={L("Подписка", "Source")}>
        <EmptyState
          kind="subscriptions"
          title={L("Источник не найден", "Source not found")}
          action={
            <Button asChild>
              <Link to="/subscriptions">{L("К подпискам", "To sources")}</Link>
            </Button>
          }
        />
      </Screen>
    );
  const servers = allServers.filter((s) => s.subscriptionId === sub.id);
  const local = isLocalSource(sub);
  const next = nextUpdateAt(sub);

  const save = () => {
    if (!name.trim()) return setErr(L("Введите название", "Enter a name"));
    if (!local) {
      const v = validateSubscriptionUrl(url);
      if (!v.ok) return setErr(L("Некорректный или запрещённый URL", "Invalid or blocked URL"));
      if (interval < 5 || interval > 1440)
        return setErr(L("Интервал: от 5 до 1440 минут", "Interval: 5–1440 minutes"));
      updateSubscription(sub.id, { name: name.trim(), url: v.url, refreshIntervalMin: interval });
    } else updateSubscription(sub.id, { name: name.trim() });
    setErr(null);
    toast.success(L("Сохранено", "Saved"));
  };

  return (
    <Screen
      back="/subscriptions"
      title={sub.name}
      subtitle={<span className="font-mono">{displayUrl(sub)}</span>}
      actions={sub.isDemo ? <DemoBadge /> : undefined}
    >
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <SubStatus status={sub.status} />
        {!local && (
          <Button
            size="sm"
            variant="surface"
            onClick={() => void refreshSubscription(sub.id)}
            disabled={sub.status === "updating"}
          >
            <RefreshCw className={sub.status === "updating" ? "animate-spin" : ""} />{" "}
            {L("Обновить сейчас", "Refresh now")}
          </Button>
        )}
        <Button
          size="sm"
          variant="surface"
          onClick={() => setExportOpen(true)}
          disabled={servers.length === 0}
        >
          <Download /> {L("Экспорт подписки", "Export source")}
        </Button>
      </div>
      {sub.lastError && (
        <p className="mb-4 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
          {sub.lastError}
        </p>
      )}

      <Section title={L("Параметры", "Settings")}>
        <Card className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="n">{L("Название", "Name")}</Label>
            <Input id="n" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
          </div>
          {!local && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="u">URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="u"
                    value={reveal ? url : displayUrl({ ...sub, url })}
                    readOnly={!reveal}
                    onChange={(e) => setUrl(e.target.value)}
                    className="font-mono text-xs"
                  />
                  <Button variant="surface" onClick={() => setReveal(!reveal)}>
                    {reveal ? L("Скрыть", "Hide") : L("Изменить", "Edit")}
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="i">{L("Интервал, мин", "Interval, min")}</Label>
                <Input
                  id="i"
                  type="number"
                  min={5}
                  max={1440}
                  value={interval}
                  onChange={(e) => setInterval(Number(e.target.value))}
                />
              </div>
              {next && (
                <p className="text-xs text-muted-foreground">
                  {L("Следующее обновление ориентировочно", "Next refresh approx.")}{" "}
                  {formatDateTime(new Date(next).toISOString(), locale)}
                </p>
              )}
            </>
          )}
          <label className="flex items-center justify-between text-sm">
            {L("Источник включён", "Source enabled")}
            <Switch
              checked={sub.enabled}
              onCheckedChange={(v) =>
                updateSubscription(sub.id, {
                  enabled: v,
                  status: v ? (sub.lastUpdatedAt ? "ok" : "never_updated") : "disabled",
                })
              }
            />
          </label>
          {err && (
            <p role="alert" className="text-sm text-destructive">
              {err}
            </p>
          )}
          <Button onClick={save}>
            <Save /> {L("Сохранить", "Save")}
          </Button>
        </Card>
      </Section>

      <Section title={L("История изменений", "Change history")}>
        {sub.history.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground">
            {L("Обновлений ещё не было", "No updates yet")}
          </Card>
        ) : (
          <ListCard>
            {sub.history.map((h, i) => (
              <div key={i} className="flex items-center justify-between p-3 text-sm">
                <span className="text-muted-foreground">{formatDateTime(h.at, locale)}</span>
                <span className="font-mono text-xs">
                  <span className="text-status-ok">+{h.added}</span> /{" "}
                  <span className="text-status-down">−{h.removed}</span> · {L("всего", "total")}{" "}
                  {h.total}
                </span>
              </div>
            ))}
          </ListCard>
        )}
      </Section>

      <Section
        title={L(`Ошибки строк (${sub.errors.length})`, `Line errors (${sub.errors.length})`)}
      >
        {sub.errors.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground">
            {L("Ошибок формата нет", "No format errors")}
          </Card>
        ) : (
          <Card className="max-h-60 overflow-y-auto p-3 font-mono text-xs text-muted-foreground">
            {sub.errors.map((e) => (
              <div key={e.line} className="py-0.5">
                #{e.line} · <span className="text-destructive">{e.reason}</span> · {e.preview}
              </div>
            ))}
          </Card>
        )}
      </Section>

      <Section title={L(`Серверы (${servers.length})`, `Servers (${servers.length})`)}>
        {servers.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground">
            {L("Нет серверов", "No servers")}
          </Card>
        ) : (
          <ListCard>
            {servers.map((s) => (
              <ServerRow key={s.id} server={s} showCountry />
            ))}
          </ListCard>
        )}
      </Section>

      <Button variant="ghost" className="text-destructive" onClick={() => setConfirmDel(true)}>
        <Trash2 /> {L("Удалить источник", "Delete source")}
      </Button>

      <AlertDialog open={confirmDel} onOpenChange={setConfirmDel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{L("Удалить источник?", "Delete source?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {L(
                "Серверы источника будут удалены. Избранные сохранятся с пометкой «нет в источнике».",
                "Its servers are removed. Favorites are kept and marked “removed from source”.",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{L("Отмена", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                removeSubscription(sub.id);
                addEvent({
                  level: "warning",
                  category: "subscription",
                  message: `Источник «${sub.name}» удалён`,
                  isDemo: sub.isDemo,
                });
                void navigate({ to: "/subscriptions" });
              }}
            >
              {L("Удалить", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        servers={servers}
        title={sub.name}
      />
    </Screen>
  );
}
