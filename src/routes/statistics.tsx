import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/app/store";
import { Card, Screen, Section } from "@/components/swit4/Screen";
import { DemoBadge } from "@/components/swit4/DemoBadge";
import { Flag } from "@/components/swit4/Flag";
import { EmptyState } from "@/components/swit4/EmptyState";
import { Button } from "@/components/ui/button";
import { formatBytes, formatDateTime, formatDuration } from "@/lib/format";
import { useLocale } from "@/localization";
import { useL } from "@/lib/i18n";

export const Route = createFileRoute("/statistics")({
  head: () => ({
    meta: [
      { title: "Статистика — SWIT4" },
      {
        name: "description",
        content: "Трафик по дням, история сессий и счётчики подключений SWIT4.",
      },
      { property: "og:title", content: "Статистика — SWIT4" },
      {
        property: "og:description",
        content: "Трафик по дням, история сессий и счётчики подключений SWIT4.",
      },
    ],
  }),
  component: Stats,
});

function Stats() {
  const L = useL();
  const locale = useLocale();
  const daily = useAppStore((s) => s.daily);
  const sessions = useAppStore((s) => s.sessions);
  const count = useAppStore((s) => s.connectionsCount);
  const clearHistory = useAppStore((s) => s.clearHistory);
  const days = useMemo(
    () => [...daily].sort((a, b) => a.date.localeCompare(b.date)).slice(-14),
    [daily],
  );
  const max = Math.max(1, ...days.map((d) => d.bytesDown + d.bytesUp));
  const totalDown = daily.reduce((a, d) => a + d.bytesDown, 0);
  const totalUp = daily.reduce((a, d) => a + d.bytesUp, 0);
  const isDemo = daily.some((d) => d.isDemo) || sessions.some((s) => s.isDemo);

  return (
    <Screen title={L("Статистика", "Statistics")} actions={isDemo ? <DemoBadge /> : undefined}>
      <div className="mb-6 grid grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">{L("Входящий", "Down")}</div>
          <div className="mt-1 font-mono text-lg font-semibold">
            {formatBytes(totalDown, locale)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">{L("Исходящий", "Up")}</div>
          <div className="mt-1 font-mono text-lg font-semibold">{formatBytes(totalUp, locale)}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">{L("Подключений", "Connections")}</div>
          <div className="mt-1 font-mono text-lg font-semibold">{count}</div>
        </Card>
      </div>
      <Section title={L("Трафик за 14 дней", "Traffic, 14 days")}>
        {days.length === 0 ? (
          <EmptyState kind="stats" title={L("Нет данных", "No data")} />
        ) : (
          <Card className="p-4">
            <div
              className="flex h-40 items-end gap-1.5"
              role="img"
              aria-label={L("График трафика по дням", "Daily traffic chart")}
            >
              {days.map((d) => (
                <div
                  key={d.date}
                  className="flex flex-1 flex-col justify-end gap-px"
                  title={`${d.date}: ↓${formatBytes(d.bytesDown, locale)} ↑${formatBytes(d.bytesUp, locale)}`}
                >
                  <span
                    className="rounded-t-sm bg-signal/70"
                    style={{ height: `${(d.bytesUp / max) * 100}%` }}
                  />
                  <span
                    className="rounded-b-sm bg-primary/80"
                    style={{ height: `${(d.bytesDown / max) * 100}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between font-mono text-[10px] text-muted-foreground">
              <span>{days[0]?.date.slice(5)}</span>
              <span>{days.at(-1)?.date.slice(5)}</span>
            </div>
            <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-primary" />
                {L("входящий", "down")}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-signal" />
                {L("исходящий", "up")}
              </span>
            </div>
          </Card>
        )}
      </Section>
      <Section
        title={L("История сессий", "Session history")}
        aside={
          <Button
            size="sm"
            variant="ghost"
            className="text-destructive"
            onClick={() => {
              clearHistory();
              toast(L("История очищена", "History cleared"));
            }}
          >
            <Trash2 /> {L("Очистить", "Clear")}
          </Button>
        }
      >
        {sessions.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground">
            {L("Сессий пока нет", "No sessions yet")}
          </Card>
        ) : (
          <div className="surface-card divide-y divide-border overflow-hidden">
            {sessions.slice(0, 50).map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-3">
                <Flag code={s.countryCode} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <span className="truncate">{s.serverName}</span>
                    {s.isDemo && <DemoBadge withIcon={false} />}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {formatDateTime(s.startedAt, locale)} ·{" "}
                    {formatDuration(Date.parse(s.endedAt) - Date.parse(s.startedAt))}
                  </div>
                </div>
                <div className="text-right font-mono text-[11px] text-muted-foreground">
                  ↓{formatBytes(s.bytesDown, locale)}
                  <br />↑{formatBytes(s.bytesUp, locale)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </Screen>
  );
}
