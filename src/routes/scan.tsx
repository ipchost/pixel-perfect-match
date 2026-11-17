import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  CircleSlash,
  FileWarning,
  Play,
  Plug,
  Radar,
  Snail,
  Square,
} from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/app/store";
import { Card, Notice, Screen, Section } from "@/components/swit4/Screen";
import { DemoBadge } from "@/components/swit4/DemoBadge";
import { Flag } from "@/components/swit4/Flag";
import { EmptyState } from "@/components/swit4/EmptyState";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { cancelScan, scanCandidates, startScan } from "@/services/scanner/controller";
import { connect, disconnect } from "@/services/connection/controller";
import { formatDateTime } from "@/lib/format";
import { useT, useLocale } from "@/localization";
import { useL } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { ScanResultItem, ScanStage } from "@/types";

export const Route = createFileRoute("/scan")({
  head: () => ({
    meta: [
      { title: "Поиск рабочих серверов — SWIT4" },
      {
        name: "description",
        content:
          "Контролируемое сканирование серверов из ваших подписок: прогресс, отмена и результаты.",
      },
      { property: "og:title", content: "Поиск рабочих серверов — SWIT4" },
      {
        property: "og:description",
        content:
          "Контролируемое сканирование серверов из ваших подписок: прогресс, отмена и результаты.",
      },
    ],
  }),
  component: ScanPage,
});

type Group = "available" | "slow" | "unavailable" | "config_error";

function groupOf(r: ScanResultItem): Group {
  if (r.status === "available") return "available";
  if (r.status === "slow" || r.status === "unstable") return "slow";
  if (r.status === "config_error") return "config_error";
  return "unavailable";
}

function ScanPage() {
  const t = useT();
  const L = useL();
  const locale = useLocale();
  const scan = useAppStore((s) => s.scan);
  const servers = useAppStore((s) => s.servers);
  const cfg = useAppStore((s) => s.settings.scan);
  const conn = useAppStore((s) => s.connection);
  const patchSettings = useAppStore((s) => s.patchSettings);
  const [throughput, setThroughput] = useState(true);
  const [tab, setTab] = useState<Group>("available");
  const running = scan !== null && !["done", "cancelled", "error"].includes(scan.stage);
  const candidates = useMemo(() => scanCandidates(), [servers]); // eslint-disable-line react-hooks/exhaustive-deps

  const stageLabel: Record<ScanStage, string> = {
    idle: L("Ожидание", "Idle"),
    fetching: L("Получение серверов из источников", "Fetching servers from sources"),
    normalizing: L("Нормализация и дедупликация", "Normalizing and deduplicating"),
    validating: L("Валидация конфигураций", "Validating configs"),
    probing: L("Проверка доступности", "Probing"),
    measuring: L("Измерение задержки", "Measuring latency"),
    throughput: L("Контрольный тест скорости", "Control throughput test"),
    done: L("Готово", "Done"),
    cancelled: L("Остановлено", "Cancelled"),
    error: L("Ошибка", "Error"),
  };

  const groups = useMemo(() => {
    const g: Record<Group, ScanResultItem[]> = {
      available: [],
      slow: [],
      unavailable: [],
      config_error: [],
    };
    scan?.results.forEach((r) => g[groupOf(r)].push(r));
    (Object.keys(g) as Group[]).forEach((k) =>
      g[k].sort((a, b) => (a.latencyMs ?? 1e9) - (b.latencyMs ?? 1e9)),
    );
    return g;
  }, [scan]);

  const pct = scan && scan.total > 0 ? Math.round((scan.done / scan.total) * 100) : 0;
  const tabs: { key: Group; label: string; icon: typeof CheckCircle2; cls: string }[] = [
    {
      key: "available",
      label: L("Доступные", "Available"),
      icon: CheckCircle2,
      cls: "text-status-ok",
    },
    { key: "slow", label: L("Медленные", "Slow"), icon: Snail, cls: "text-status-slow" },
    {
      key: "unavailable",
      label: L("Недоступные", "Unavailable"),
      icon: CircleSlash,
      cls: "text-status-down",
    },
    {
      key: "config_error",
      label: L("Ошибки конфиг.", "Config errors"),
      icon: FileWarning,
      cls: "text-status-down",
    },
  ];

  const connectTo = async (id: string) => {
    if (conn.phase === "connected") await disconnect();
    patchSettings("connection", { mode: "manual", manualServerId: id });
    void connect({ serverId: id });
    toast(L("Подключение в DEMO-режиме", "Connecting in DEMO mode"), {
      description: L("Реальный туннель не создаётся", "No real tunnel is created"),
    });
  };

  return (
    <Screen
      back="/"
      title={L("Поиск рабочих серверов", "Find working servers")}
      subtitle={L(
        `${candidates.length} кандидатов из включённых источников`,
        `${candidates.length} candidates from enabled sources`,
      )}
      actions={<DemoBadge />}
    >
      <Card className="relative mb-6 overflow-hidden p-5">
        {running && (
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-scan-sweep"
            aria-hidden
          />
        )}
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "flex size-14 shrink-0 items-center justify-center rounded-2xl",
              running ? "bg-primary-soft" : "bg-surface-2",
            )}
          >
            <Radar
              className={cn(
                "size-7",
                running ? "text-primary animate-orbit-slow" : "text-muted-foreground",
              )}
            />
          </div>
          <div className="min-w-0 flex-1" aria-live="polite">
            <div className="font-medium">
              {scan ? stageLabel[scan.stage] : L("Готов к проверке", "Ready to scan")}
            </div>
            <div className="text-xs text-muted-foreground">
              {scan
                ? L(
                    `Проверено ${scan.done} из ${scan.total}`,
                    `Checked ${scan.done} of ${scan.total}`,
                  )
                : L(
                    `Параллельно: ${cfg.concurrency} · тайм-аут ${cfg.timeoutMs / 1000} с · ${t.common.method[cfg.method]}`,
                    `Concurrency: ${cfg.concurrency} · timeout ${cfg.timeoutMs / 1000}s · ${t.common.method[cfg.method]}`,
                  )}
            </div>
          </div>
          {running ? (
            <Button variant="destructive" className="w-full sm:w-auto" onClick={cancelScan}>
              <Square /> {L("Отменить", "Cancel")}
            </Button>
          ) : (
            <Button
              onClick={() => void startScan({ runThroughput: throughput })}
              disabled={candidates.length === 0}
            className="w-full sm:w-auto"
            >
              <Play /> {scan ? L("Заново", "Again") : L("Начать", "Start")}
            </Button>
          )}
        </div>
        {scan && (
          <>
            <Progress
              value={pct}
              className="mt-4 h-2"
              aria-label={L("Прогресс сканирования", "Scan progress")}
            />
            <div className="mt-4 grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
              <Counter
                label={L("Доступно", "OK")}
                value={groups.available.length}
                cls="text-status-ok"
              />
              <Counter
                label={L("Медленно", "Slow")}
                value={groups.slow.length}
                cls="text-status-slow"
              />
              <Counter
                label={L("Недоступно", "Down")}
                value={groups.unavailable.length}
                cls="text-status-down"
              />
              <Counter
                label={L("Ошибки", "Errors")}
                value={groups.config_error.length + scan.invalidConfigs}
                cls="text-status-down"
              />
              <Counter label={L("Дубликаты", "Dupes")} value={scan.duplicatesRemoved} />
              <Counter label={L("Осталось", "Left")} value={Math.max(0, scan.total - scan.done)} />
            </div>
            {scan.finishedAt && (
              <p className="mt-3 text-xs text-muted-foreground">
                {formatDateTime(scan.finishedAt, locale)}
              </p>
            )}
          </>
        )}
        {!running && (
          <label className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4 text-sm">
            <span>
              {L(
                `Контрольный тест скорости (до ${cfg.throughputLimitKb} KB на сервер)`,
                `Control speed test (up to ${cfg.throughputLimitKb} KB per server)`,
              )}
            </span>
            <Switch checked={throughput} onCheckedChange={setThroughput} />
          </label>
        )}
      </Card>

      <Notice tone="info" className="mb-6">
        {L(
          "Проверяются только серверы из ваших включённых источников. Произвольные IP-диапазоны не сканируются. TCP connect — это не полноценный ping: метод указан у каждого значения.",
          "Only servers from your enabled sources are checked. Arbitrary IP ranges are never scanned. TCP connect isn't a full ping: each value shows its method.",
        )}
      </Notice>

      {!scan ? (
        candidates.length === 0 ? (
          <EmptyState
            kind="subscriptions"
            title={L("Нет кандидатов", "No candidates")}
            text={L("Включите хотя бы один источник.", "Enable at least one source.")}
            action={
              <Button asChild>
                <Link to="/subscriptions">{L("Подписки", "Sources")}</Link>
              </Button>
            }
          />
        ) : (
          <EmptyState
            kind="search"
            title={L("Результатов пока нет", "No results yet")}
            text={L("Нажмите «Начать», чтобы проверить серверы.", "Press Start to check servers.")}
          />
        )
      ) : (
        <Section title={L("Результаты", "Results")}>
          <div
            role="tablist"
            className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 scrollbar-none md:mx-0 md:px-0"
          >
            {tabs.map((tb) => (
              <button
                key={tb.key}
                role="tab"
                aria-selected={tab === tb.key}
                onClick={() => setTab(tb.key)}
                className={cn(
                  "flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium",
                  tab === tb.key
                    ? "border-primary/40 bg-primary-soft text-foreground"
                    : "border-border bg-surface text-muted-foreground",
                )}
              >
                <tb.icon className={cn("size-3.5", tb.cls)} /> {tb.label}{" "}
                <span className="font-mono">{groups[tb.key].length}</span>
              </button>
            ))}
          </div>
          {groups[tab].length === 0 ? (
            <Card className="p-6 text-center text-sm text-muted-foreground">
              {running ? L("Ожидаем результаты…", "Waiting for results…") : L("Пусто", "Empty")}
            </Card>
          ) : (
            <div className="surface-card divide-y divide-border overflow-hidden">
              {groups[tab].map((r) => {
                const s = servers.find((x) => x.id === r.serverId);
                if (!s) return null;
                const isCur = conn.serverId === s.id && conn.phase === "connected";
                return (
                  <motion.div
                    key={r.serverId}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center gap-3 p-3"
                  >
                    <Flag code={s.countryCode} />
                    <Link to="/server/$id" params={{ id: s.id }} className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{s.name}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {r.sourceName} · {t.common.method[r.method]}
                        {r.downloadMbps !== null ? ` · ↓${r.downloadMbps} ${t.common.mbps}` : ""}
                        {r.errorCode ? ` · ${r.errorCode}` : ""}
                      </div>
                    </Link>
                    <span className="font-mono text-sm tabular">
                      {r.latencyMs !== null ? `${r.latencyMs} ${t.common.ms}` : "—"}
                    </span>
                    {(tab === "available" || tab === "slow") && (
                      <Button
                        size="sm"
                        variant={isCur ? "secondary" : "default"}
                        disabled={isCur}
                        onClick={() => connectTo(s.id)}
                        aria-label={L(`Подключиться к ${s.name}`, `Connect to ${s.name}`)}
                      >
                        <Plug /> {isCur ? L("Активен", "Active") : L("Выбрать", "Use")}
                      </Button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </Section>
      )}
    </Screen>
  );
}

function Counter({ label, value, cls }: { label: string; value: number; cls?: string }) {
  return (
    <div className="rounded-xl bg-surface-2 px-2 py-2">
      <div className={cn("font-mono text-lg font-semibold tabular", cls)}>{value}</div>
      <div className="text-[10.5px] text-muted-foreground">{label}</div>
    </div>
  );
}
