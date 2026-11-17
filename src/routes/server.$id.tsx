import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Ban, Download, Eye, EyeOff, Gauge, Plug, RefreshCw, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/app/store";
import { Card, Notice, Screen, Section } from "@/components/swit4/Screen";
import { Flag } from "@/components/swit4/Flag";
import { StatusBadge } from "@/components/swit4/StatusBadge";
import { LatencyValue, SpeedValue } from "@/components/swit4/LatencyValue";
import { ProtocolChip } from "@/components/swit4/ProtocolChip";
import { DemoBadge } from "@/components/swit4/DemoBadge";
import { EmptyState } from "@/components/swit4/EmptyState";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ExportDialog } from "@/features/export/ExportDialog";
import { probeOne } from "@/features/servers/actions";
import { connect, disconnect } from "@/services/connection/controller";
import { maskMiddle } from "@/services/parsers/mask";
import { scoreServer, successRate } from "@/services/servers/rating";
import { getCountry } from "@/mocks/countries";
import { formatAge, formatDateTime } from "@/lib/format";
import { useT, useLocale } from "@/localization";
import { useL } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/server/$id")({
  head: () => ({
    meta: [
      { title: "Сервер — SWIT4" },
      { name: "description", content: "Детали сервера SWIT4: параметры, история проверок, экспорт и QR." },
      { property: "og:title", content: "Сервер — SWIT4" },
      { property: "og:description", content: "Детали сервера SWIT4: параметры, история проверок, экспорт и QR." },
    ],
  }),
  component: ServerDetail,
});

function ServerDetail() {
  const { id } = Route.useParams();
  const t = useT();
  const L = useL();
  const locale = useLocale();
  const server = useAppStore((s) => s.servers.find((x) => x.id === id));
  const fav = useAppStore((s) => s.favorites.includes(id));
  const conn = useAppStore((s) => s.connection);
  const subName = useAppStore((s) => s.subscriptions.find((x) => x.id === server?.subscriptionId)?.name);
  const stale = useAppStore((s) => s.settings.scan.staleAfterMin);
  const { toggleFavorite, setExcludedFromAuto, patchSettings, removeServers } = useAppStore.getState();
  const [reveal, setReveal] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [busy, setBusy] = useState<null | "probe" | "speed">(null);

  if (!server) {
    return (
      <Screen back="/servers" title={L("Сервер", "Server")}>
        <EmptyState kind="servers" title={L("Сервер не найден", "Server not found")} text={L("Возможно, он был удалён вместе с источником.", "It may have been removed with its source.")} action={<Button asChild><Link to="/servers">{L("К серверам", "To servers")}</Link></Button>} />
      </Screen>
    );
  }
  const c = server.config;
  const isCurrent = conn.serverId === server.id && (conn.phase === "connected" || conn.phase === "reconnecting");
  const rate = successRate(server);
  const score = scoreServer(server, stale);
  const run = async (kind: "probe" | "speed") => {
    setBusy(kind);
    await probeOne(server.id, kind === "speed");
    setBusy(null);
  };
  const connectHere = async () => {
    patchSettings("connection", { mode: "manual", manualServerId: server.id });
    if (conn.phase === "connected") await disconnect();
    void connect({ serverId: server.id });
    toast(L("Подключение (DEMO)", "Connecting (DEMO)"), { description: server.name });
  };

  const rows: [string, string | undefined][] = [
    [L("Адрес", "Address"), `${c.address}:${c.port}`],
    [L("Транспорт", "Transport"), c.transport],
    [L("Безопасность", "Security"), c.security],
    ["SNI", c.sni],
    ["Host", c.host],
    ["Path", c.path],
    ["Flow", c.flow],
    [L("Шифрование", "Cipher"), c.method ?? c.cipher],
    ["Fingerprint", c.fingerprint],
  ];

  return (
    <Screen back={`/servers/${server.countryCode}`} title={server.name} subtitle={<span className="inline-flex items-center gap-2"><Flag code={server.countryCode} className="h-3.5 w-5" />{getCountry(server.countryCode)[locale === "en" ? "nameEn" : "nameRu"]}{server.city && ` · ${server.city}`}</span>} actions={server.isDemo ? <DemoBadge /> : undefined}>
      {server.missingFromSource && <Notice tone="warning" className="mb-4" title={t.common.missingFromSource}>{L("Сервер сохранён, потому что он в избранном.", "Kept because it's in favorites.")}</Notice>}

      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Button size="touch" onClick={isCurrent ? () => void disconnect() : connectHere}><Plug /> {isCurrent ? L("Отключить", "Disconnect") : L("Подключить", "Connect")}</Button>
        <Button size="touch" variant="surface" onClick={() => run("probe")} disabled={busy !== null}><RefreshCw className={cn(busy === "probe" && "animate-spin")} /> {L("Проверить", "Check")}</Button>
        <Button size="touch" variant="surface" onClick={() => run("speed")} disabled={busy !== null}><Gauge className={cn(busy === "speed" && "animate-pulse")} /> {L("Тест скорости", "Speed test")}</Button>
        <Button size="touch" variant="surface" onClick={() => setExportOpen(true)}><Download /> {L("Экспорт", "Export")}</Button>
      </div>

      <Section title={L("Последняя проверка", "Last check")} aside={server.lastProbe && server.isDemo ? <DemoBadge /> : undefined}>
        <Card className="grid grid-cols-2 gap-4 p-4 sm:grid-cols-4">
          <Metric label={L("Статус", "Status")}><StatusBadge status={server.status} /></Metric>
          <Metric label={L("Задержка", "Latency")}><LatencyValue probe={server.lastProbe} /></Metric>
          <Metric label={L("Скорость", "Speed")}><SpeedValue probe={server.lastProbe} /></Metric>
          <Metric label={L("Рейтинг", "Score")}><span className="font-mono text-sm">{score === null ? "—" : Math.round(score)}</span>{rate !== null && <span className="ml-1 text-xs text-muted-foreground">· {Math.round(rate * 100)}% {L("успешных", "ok")}</span>}</Metric>
          {server.lastProbe && (
            <p className="col-span-2 text-xs text-muted-foreground sm:col-span-4">
              {L("Метод", "Method")}: {t.common.method[server.lastProbe.method]} · {formatAge(server.lastProbe.checkedAt, t)}
              {server.lastProbe.downloadMbps === null && ` · ${L("тест скорости не выполнялся", "speed test not run")}`}
              {server.lastProbe.testBytesLimit ? ` · ${L("лимит", "limit")} ${Math.round(server.lastProbe.testBytesLimit / 1024)} KB` : ""}
            </p>
          )}
        </Card>
      </Section>

      <Section title={L("Конфигурация", "Configuration")}>
        <Card className="divide-y divide-border">
          <div className="flex items-center justify-between p-4"><span className="text-sm text-muted-foreground">{L("Протокол", "Protocol")}</span><ProtocolChip protocol={c.protocol} /></div>
          {rows.filter(([, v]) => v).map(([k, v]) => (
            <div key={k} className="flex items-center justify-between gap-4 p-4"><span className="text-sm text-muted-foreground">{k}</span><span className="truncate font-mono text-[13px]">{v}</span></div>
          ))}
          <div className="flex items-center justify-between gap-4 p-4">
            <span className="text-sm text-muted-foreground">{c.protocol === "vless" || c.protocol === "vmess" ? "UUID" : L("Пароль", "Password")}</span>
            <span className="flex items-center gap-2"><span className="truncate font-mono text-[13px]">{reveal ? c.secret : maskMiddle(c.secret, 4)}</span>
              <Button variant="ghost" size="icon" className="size-8" onClick={() => setReveal(!reveal)} aria-label={reveal ? L("Скрыть", "Hide") : L("Показать", "Reveal")}>{reveal ? <EyeOff /> : <Eye />}</Button>
            </span>
          </div>
          <div className="flex items-center justify-between p-4"><span className="text-sm text-muted-foreground">{L("Источник", "Source")}</span><span className="text-sm">{subName ?? L("Добавлен вручную", "Added manually")}</span></div>
        </Card>
      </Section>

      <Section title={L("История проверок", "Check history")}>
        {server.probeHistory.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground">{L("Проверок ещё не было", "No checks yet")}</Card>
        ) : (
          <Card className="p-4">
            <div className="flex h-16 items-end gap-1" aria-hidden>
              {[...server.probeHistory].reverse().map((p, i) => (
                <span key={i} className={cn("flex-1 rounded-sm", p.success ? "bg-primary/70" : "bg-destructive/60")} style={{ height: `${p.success && p.latencyMs ? Math.max(12, 100 - p.latencyMs / 5) : 100}%` }} title={`${formatDateTime(p.checkedAt, locale)} · ${p.latencyMs ?? "—"}`} />
              ))}
            </div>
            <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
              {server.probeHistory.slice(0, 5).map((p, i) => (
                <li key={i} className="flex justify-between"><span>{formatDateTime(p.checkedAt, locale)} · {t.common.methodShort[p.method]}</span><span className="font-mono">{p.success ? `${p.latencyMs ?? "—"} ${t.common.ms}` : p.errorCode ?? "fail"}</span></li>
              ))}
            </ul>
          </Card>
        )}
      </Section>

      <Section title={L("Управление", "Manage")}>
        <Card className="divide-y divide-border">
          <label className="flex items-center justify-between gap-4 p-4"><span className="flex items-center gap-3 text-sm"><Star className="size-4 text-warning" />{L("В избранном", "Favorite")}</span><Switch checked={fav} onCheckedChange={() => toggleFavorite(server.id)} /></label>
          <label className="flex items-center justify-between gap-4 p-4"><span className="flex items-center gap-3 text-sm"><Ban className="size-4 text-muted-foreground" />{L("Исключить из автовыбора", "Exclude from auto")}</span><Switch checked={server.excludedFromAuto} onCheckedChange={(v) => setExcludedFromAuto(server.id, v)} /></label>
          <Link to="/compare" className="flex items-center gap-3 p-4 text-sm hover:bg-surface-2"><Gauge className="size-4 text-signal" />{L("Сравнить с другими", "Compare with others")}</Link>
          {server.subscriptionId === null || server.missingFromSource ? (
            <button className="flex w-full items-center gap-3 p-4 text-left text-sm text-destructive hover:bg-surface-2" onClick={() => { removeServers([server.id]); toast(L("Сервер удалён", "Server removed")); history.back(); }}><Trash2 className="size-4" />{L("Удалить сервер", "Delete server")}</button>
          ) : null}
        </Card>
      </Section>

      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} servers={[server]} title={server.name} />
    </Screen>
  );
}

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs text-muted-foreground">{label}</div>
      <div className="flex flex-wrap items-center">{children}</div>
    </div>
  );
}
