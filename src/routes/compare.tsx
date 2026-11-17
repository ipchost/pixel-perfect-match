import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useAppStore } from "@/app/store";
import { Card, Screen, Section } from "@/components/swit4/Screen";
import { Flag } from "@/components/swit4/Flag";
import { StatusBadge } from "@/components/swit4/StatusBadge";
import { LatencyValue, SpeedValue } from "@/components/swit4/LatencyValue";
import { DemoBadge } from "@/components/swit4/DemoBadge";
import { Checkbox } from "@/components/ui/checkbox";
import { scoreServer, successRate } from "@/services/servers/rating";
import { sortServers } from "@/features/servers/filters";
import { formatAge } from "@/lib/format";
import { useT } from "@/localization";
import { useL } from "@/lib/i18n";

export const Route = createFileRoute("/compare")({
  head: () => ({
    meta: [
      { title: "Сравнение серверов — SWIT4" },
      {
        name: "description",
        content: "Сравнение серверов SWIT4 по задержке, скорости, стабильности и рейтингу.",
      },
      { property: "og:title", content: "Сравнение серверов — SWIT4" },
      {
        property: "og:description",
        content: "Сравнение серверов SWIT4 по задержке, скорости, стабильности и рейтингу.",
      },
    ],
  }),
  component: Compare,
});

function Compare() {
  const t = useT();
  const L = useL();
  const servers = useAppStore((s) => s.servers);
  const favs = useAppStore((s) => s.favorites);
  const stale = useAppStore((s) => s.settings.scan.staleAfterMin);
  const ranked = useMemo(() => sortServers(servers, "rating", stale), [servers, stale]);
  const [picked, setPicked] = useState<string[]>(() =>
    favs.length >= 2 ? favs.slice(0, 3) : ranked.slice(0, 3).map((s) => s.id),
  );
  const chosen = picked
    .map((id) => servers.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));
  const toggle = (id: string, v: boolean) =>
    setPicked((p) => (v ? [...p, id].slice(-4) : p.filter((x) => x !== id)));

  return (
    <Screen
      title={L("Сравнение серверов", "Compare servers")}
      subtitle={L("До 4 серверов", "Up to 4 servers")}
      actions={<DemoBadge />}
      wide
    >
      <div className="mb-6 overflow-x-auto">
        <div
          className="grid min-w-[560px] gap-3"
          style={{
            gridTemplateColumns: `140px repeat(${Math.max(chosen.length, 1)}, minmax(0, 1fr))`,
          }}
        >
          <div />
          {chosen.map((s) => (
            <Link
              key={s.id}
              to="/server/$id"
              params={{ id: s.id }}
              className="surface-card flex items-center gap-2 p-3 hover:bg-surface-2"
            >
              <Flag code={s.countryCode} />
              <span className="truncate text-sm font-medium">{s.name}</span>
            </Link>
          ))}
          {[
            [
              L("Статус", "Status"),
              (s: (typeof chosen)[number]) => <StatusBadge status={s.status} />,
            ],
            [
              L("Задержка", "Latency"),
              (s: (typeof chosen)[number]) => <LatencyValue probe={s.lastProbe} />,
            ],
            [
              L("Скорость", "Speed"),
              (s: (typeof chosen)[number]) => <SpeedValue probe={s.lastProbe} />,
            ],
            [
              L("Стабильность", "Stability"),
              (s: (typeof chosen)[number]) => {
                const r = successRate(s);
                return (
                  <span className="font-mono text-sm">
                    {r === null ? "—" : `${Math.round(r * 100)}%`}
                  </span>
                );
              },
            ],
            [
              L("Рейтинг", "Score"),
              (s: (typeof chosen)[number]) => {
                const v = scoreServer(s, stale);
                return (
                  <span className="font-mono text-sm">{v === null ? "—" : Math.round(v)}</span>
                );
              },
            ],
            [
              L("Проверено", "Checked"),
              (s: (typeof chosen)[number]) => (
                <span className="text-xs text-muted-foreground">
                  {s.lastProbe ? formatAge(s.lastProbe.checkedAt, t) : t.common.never}
                </span>
              ),
            ],
            [
              L("Протокол", "Protocol"),
              (s: (typeof chosen)[number]) => (
                <span className="text-sm">{t.common.protocol[s.config.protocol]}</span>
              ),
            ],
          ].map(([label, render]) => (
            <Row key={label as string} label={label as string}>
              {chosen.map((s) => (
                <div key={s.id} className="flex items-center px-3">
                  {(render as (s: (typeof chosen)[number]) => React.ReactNode)(s)}
                </div>
              ))}
            </Row>
          ))}
        </div>
      </div>
      <Section title={L("Выбор серверов", "Pick servers")}>
        <Card className="max-h-96 divide-y divide-border overflow-y-auto">
          {ranked.map((s) => (
            <label key={s.id} className="flex cursor-pointer items-center gap-3 p-3">
              <Checkbox
                checked={picked.includes(s.id)}
                onCheckedChange={(v) => toggle(s.id, v === true)}
                aria-label={s.name}
              />
              <Flag code={s.countryCode} />
              <span className="flex-1 truncate text-sm">{s.name}</span>
              <LatencyValue probe={s.lastProbe} />
            </label>
          ))}
        </Card>
      </Section>
    </Screen>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <div className="flex items-center text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {children}
    </>
  );
}
