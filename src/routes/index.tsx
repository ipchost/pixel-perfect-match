import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  Bell,
  ChevronRight,
  Clock,
  ListTree,
  Radar,
  Rss,
  Server as ServerIcon,
  ShieldAlert,
} from "lucide-react";
import { selectServerById, selectUnreadEvents, useAppStore } from "@/app/store";
import { Logo } from "@/components/swit4/Logo";
import { Card, Notice, Section } from "@/components/swit4/Screen";
import { DemoBadge } from "@/components/swit4/DemoBadge";
import { Flag } from "@/components/swit4/Flag";
import { LatencyValue } from "@/components/swit4/LatencyValue";
import { ProtocolChip } from "@/components/swit4/ProtocolChip";
import { EmptyState } from "@/components/swit4/EmptyState";
import { Button } from "@/components/ui/button";
import { ConnectButton } from "@/features/home/ConnectButton";
import { startScan } from "@/services/scanner/controller";
import { getCountry } from "@/mocks/countries";
import { formatAge, formatBps, formatBytes, formatDuration } from "@/lib/format";
import { useNow } from "@/hooks/use-now";
import { useT, useLocale } from "@/localization";
import { useL } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SWIT4 — Главная" },
      {
        name: "description",
        content: "Статус соединения, выбор сервера и поиск рабочих серверов в SWIT4.",
      },
      { property: "og:title", content: "SWIT4 — Главная" },
      {
        property: "og:description",
        content: "Статус соединения, выбор сервера и поиск рабочих серверов в SWIT4.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const t = useT();
  const L = useL();
  const locale = useLocale();
  const navigate = useNavigate();
  const conn = useAppStore((s) => s.connection);
  const mode = useAppStore((s) => s.settings.connection.mode);
  const manualId = useAppStore((s) => s.settings.connection.manualServerId);
  const patchSettings = useAppStore((s) => s.patchSettings);
  const servers = useAppStore((s) => s.servers);
  const subs = useAppStore((s) => s.subscriptions);
  const routing = useAppStore((s) => s.routing);
  const unread = useAppStore(selectUnreadEvents);
  const lastWorking = useAppStore(
    (s) => s.servers.find((x) => x.id === s.lastWorkingServerId) ?? null,
  );
  const shownId = conn.serverId ?? (mode === "manual" ? manualId : null);
  const server = useAppStore(selectServerById(shownId));
  const now = useNow(1000);
  const connected = conn.phase === "connected" || conn.phase === "reconnecting";
  const hasSamples = connected && conn.stats.samples.length > 0;
  const working = servers.filter((s) => s.status === "available" || s.status === "slow").length;

  const findWorking = () => {
    void startScan();
    void navigate({ to: "/scan" });
  };

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-28 pt-safe md:px-8 md:pb-12">
      <header className="flex h-16 items-center justify-between md:h-20">
        <Logo className="md:hidden" />
        <h1 className="hidden font-display text-2xl font-semibold md:block">
          {L("Главная", "Home")}
        </h1>
        <Link
          to="/events"
          aria-label={L("Журнал событий", "Event log")}
          className="relative inline-flex size-10 items-center justify-center rounded-full hover:bg-surface-2"
        >
          <Bell className="size-5" />
          {unread > 0 && (
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-signal" />
          )}
        </Link>
      </header>

      {servers.length === 0 ? (
        <EmptyState
          kind="servers"
          title={t.home.noServersTitle}
          text={t.home.noServersText}
          action={
            <Button asChild size="touch">
              <Link to="/subscriptions">{t.home.addSubscription}</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="relative overflow-hidden rounded-[2rem] bg-hero px-4 pb-6 pt-4">
            <div className="flex items-center justify-center gap-2">
              <span
                className={cn(
                  "size-2 rounded-full",
                  connected
                    ? "bg-status-ok"
                    : conn.phase === "error"
                      ? "bg-status-down"
                      : "bg-status-unknown",
                )}
              />
              <span className="text-sm font-medium" role="status" aria-live="polite">
                {t.home.phase[conn.phase]}
              </span>
              {conn.stats.isDemo && connected && <DemoBadge />}
            </div>
            {connected && conn.stats.startedAt && (
              <p className="mt-1 text-center font-mono text-xs text-muted-foreground tabular">
                {formatDuration(now - conn.stats.startedAt)}
              </p>
            )}
            <div className="mt-2">
              <ConnectButton />
            </div>
            {conn.phase === "error" && (
              <Notice
                tone="danger"
                icon={<ShieldAlert />}
                className="mt-4"
                title={t.home.errorGeneric}
              >
                {conn.errorCode === "NO_CANDIDATES"
                  ? t.home.errorNoCandidates
                  : conn.errorCode === "PERMISSION_DENIED"
                    ? L("Разрешение VPN не выдано", "VPN permission not granted")
                    : conn.errorCode}
              </Notice>
            )}

            <div
              className="mx-auto mt-5 grid max-w-sm grid-cols-2 gap-1 rounded-2xl bg-surface-2 p-1"
              role="radiogroup"
              aria-label={L("Режим выбора сервера", "Server selection mode")}
            >
              {(["auto", "manual"] as const).map((m) => (
                <button
                  key={m}
                  role="radio"
                  aria-checked={mode === m}
                  onClick={() => patchSettings("connection", { mode: m })}
                  className={cn(
                    "h-10 rounded-xl text-sm font-medium transition-colors",
                    mode === m ? "bg-surface text-foreground shadow-card" : "text-muted-foreground",
                  )}
                >
                  {m === "auto" ? t.home.modeAuto : t.home.modeManual}
                </button>
              ))}
            </div>
            <p className="mt-2 text-center text-xs text-muted-foreground">
              {mode === "auto" ? t.home.modeAutoHint : t.home.modeManualHint}
            </p>

            <Link
              to="/servers"
              className="surface-card mx-auto mt-4 flex max-w-sm items-center gap-3 p-3.5 hover:bg-surface-2"
            >
              {server ? (
                <>
                  <Flag code={server.countryCode} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{server.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {getCountry(server.countryCode)[locale === "en" ? "nameEn" : "nameRu"]}
                      {server.city ? ` · ${server.city}` : ""}
                    </div>
                  </div>
                  <ProtocolChip protocol={server.config.protocol} />
                </>
              ) : (
                <>
                  <ServerIcon className="size-5 text-muted-foreground" />
                  <div className="flex-1 text-sm text-muted-foreground">
                    {mode === "auto"
                      ? L(
                          "Лучший сервер будет выбран при подключении",
                          "Best server is picked on connect",
                        )
                      : t.home.noServerSelected}
                  </div>
                </>
              )}
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>

            <div className="mx-auto mt-4 max-w-sm">
              <Button size="xl" variant="surface" className="w-full" onClick={findWorking}>
                <Radar className="text-primary" /> {t.home.findWorking}
              </Button>
              <p className="mt-1.5 text-center text-xs text-muted-foreground">
                {t.home.findWorkingHint}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <Section title={L("Показатели", "Metrics")} aside={<DemoBadge />}>
              <Card className="grid grid-cols-2 divide-x divide-border">
                <div className="p-4">
                  <div className="text-xs text-muted-foreground">{t.home.ping}</div>
                  <div className="mt-1">
                    <LatencyValue probe={server?.lastProbe ?? null} className="text-lg" />
                  </div>
                  {server?.lastProbe && (
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Clock className="size-3" />
                      {t.common.method[server.lastProbe.method]} ·{" "}
                      {formatAge(server.lastProbe.checkedAt, t, now)}
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="text-xs text-muted-foreground">
                    {L("Скорость сейчас", "Current speed")}
                  </div>
                  {hasSamples ? (
                    <div className="mt-1 space-y-0.5 font-mono text-sm tabular">
                      <div className="flex items-center gap-1">
                        <ArrowDownRight className="size-3.5 text-primary" />
                        {formatBps(conn.stats.downBps, locale)}
                      </div>
                      <div className="flex items-center gap-1">
                        <ArrowUpRight className="size-3.5 text-signal" />
                        {formatBps(conn.stats.upBps, locale)}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-1 text-sm text-muted-foreground">{t.common.notMeasured}</div>
                  )}
                </div>
                <div className="col-span-2 border-t border-border p-4">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{t.home.traffic}</span>
                    {connected && <span>{t.home.duration}</span>}
                  </div>
                  <div className="mt-1 flex items-center justify-between font-mono text-sm tabular">
                    <span>
                      ↓ {formatBytes(conn.stats.bytesDown, locale)} · ↑{" "}
                      {formatBytes(conn.stats.bytesUp, locale)}
                    </span>
                    {connected && conn.stats.startedAt && (
                      <span>{formatDuration(now - conn.stats.startedAt)}</span>
                    )}
                  </div>
                  <Sparkline
                    values={conn.stats.samples.map((s) => s.downBps)}
                    empty={t.home.activityEmpty}
                  />
                </div>
              </Card>
            </Section>

            <Section title={L("Подписки", "Sources")}>
              <Link
                to="/subscriptions"
                className="surface-card flex items-center gap-3 p-4 hover:bg-surface-2"
              >
                <Rss className="size-5 text-signal" />
                <div className="min-w-0 flex-1 text-sm">
                  <div className="font-medium">
                    {L(
                      `${subs.filter((s) => s.enabled).length} активных из ${subs.length}`,
                      `${subs.filter((s) => s.enabled).length} active of ${subs.length}`,
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {L(
                      `${working} рабочих серверов · ошибок: ${subs.filter((s) => s.status === "error").length}`,
                      `${working} working servers · errors: ${subs.filter((s) => s.status === "error").length}`,
                    )}
                  </div>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            </Section>

            <div className="grid grid-cols-2 gap-3">
              <Link to="/servers" className="surface-card p-4 hover:bg-surface-2">
                <ServerIcon className="size-5 text-primary" />
                <div className="mt-3 text-sm font-medium">{L("Серверы", "Servers")}</div>
                <div className="text-xs text-muted-foreground">
                  {t.common.servers(servers.length)}
                </div>
              </Link>
              <Link to="/rules" className="surface-card p-4 hover:bg-surface-2">
                <ListTree className="size-5 text-signal" />
                <div className="mt-3 text-sm font-medium">{L("Правила", "Rules")}</div>
                <div className="text-xs text-muted-foreground">
                  {routing.mode === "all"
                    ? L("Все приложения через VPN", "All apps via VPN")
                    : routing.mode === "whitelist"
                      ? L(
                          `Белый список · ${routing.whitelist.length}`,
                          `Allowlist · ${routing.whitelist.length}`,
                        )
                      : L(
                          `Чёрный список · ${routing.blacklist.length}`,
                          `Blocklist · ${routing.blacklist.length}`,
                        )}
                </div>
              </Link>
            </div>

            {lastWorking && !connected && (
              <p className="px-1 text-xs text-muted-foreground">
                {t.home.lastWorking}:{" "}
                <Link
                  to="/server/$id"
                  params={{ id: lastWorking.id }}
                  className="text-foreground underline-offset-2 hover:underline"
                >
                  {lastWorking.name}
                </Link>
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Sparkline({ values, empty }: { values: number[]; empty: string }) {
  if (values.length < 2) return <p className="mt-3 text-xs text-muted-foreground">{empty}</p>;
  const max = Math.max(...values, 1);
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${30 - (v / max) * 28}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="mt-3 h-12 w-full" aria-hidden>
      <polyline
        points={pts}
        fill="none"
        stroke="var(--primary)"
        strokeWidth="1.5"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
