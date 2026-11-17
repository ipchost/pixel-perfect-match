import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, CheckCircle2, Download, Info, Trash2, TriangleAlert } from "lucide-react";
import { useAppStore } from "@/app/store";
import { Screen } from "@/components/swit4/Screen";
import { DemoBadge } from "@/components/swit4/DemoBadge";
import { EmptyState } from "@/components/swit4/EmptyState";
import { Button } from "@/components/ui/button";
import { Chips } from "@/features/servers/Toolbar";
import { getBridge } from "@/services/native/demo-bridge";
import { maskSecrets } from "@/services/parsers/mask";
import { formatDateTime } from "@/lib/format";
import { useLocale } from "@/localization";
import { useL } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { EventCategory, EventLevel } from "@/types";

export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Журнал событий — SWIT4" },
      {
        name: "description",
        content:
          "Журнал подключений, подписок, сканирований и правил SWIT4 с маскировкой секретов.",
      },
      { property: "og:title", content: "Журнал событий — SWIT4" },
      {
        property: "og:description",
        content:
          "Журнал подключений, подписок, сканирований и правил SWIT4 с маскировкой секретов.",
      },
    ],
  }),
  component: Events,
});

const ICON: Record<EventLevel, { i: typeof Info; c: string }> = {
  info: { i: Info, c: "text-signal" },
  success: { i: CheckCircle2, c: "text-status-ok" },
  warning: { i: TriangleAlert, c: "text-warning" },
  error: { i: AlertCircle, c: "text-destructive" },
};

function Events() {
  const L = useL();
  const locale = useLocale();
  const events = useAppStore((s) => s.events);
  const markRead = useAppStore((s) => s.markEventsRead);
  const clear = useAppStore((s) => s.clearEvents);
  const [cat, setCat] = useState<EventCategory | "all">("all");
  const [lvl, setLvl] = useState<EventLevel | "all">("all");
  useEffect(() => {
    const t = setTimeout(markRead, 1500);
    return () => clearTimeout(t);
  }, [markRead]);
  const list = useMemo(
    () =>
      events.filter(
        (e) => (cat === "all" || e.category === cat) && (lvl === "all" || e.level === lvl),
      ),
    [events, cat, lvl],
  );
  const exportLog = () =>
    void getBridge().exporter.saveFile(
      "swit4-events.txt",
      events
        .map(
          (e) =>
            `${e.at}\t${e.level}\t${e.category}\t${maskSecrets(e.message)}${e.isDemo ? "\t[DEMO]" : ""}`,
        )
        .join("\n"),
      "text/plain",
    );

  return (
    <Screen
      title={L("Журнал событий", "Event log")}
      subtitle={L("Секреты маскируются автоматически", "Secrets are masked automatically")}
      actions={
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={exportLog}
            aria-label={L("Экспорт", "Export")}
          >
            <Download />
          </Button>
          <Button variant="ghost" size="icon" onClick={clear} aria-label={L("Очистить", "Clear")}>
            <Trash2 />
          </Button>
        </>
      }
    >
      <div className="mb-4 space-y-2">
        <Chips
          label={L("Категория", "Category")}
          value={cat}
          onChange={setCat}
          options={[
            { value: "all", label: L("Все", "All") },
            { value: "connection", label: L("Соединение", "Connection") },
            { value: "subscription", label: L("Подписки", "Sources") },
            { value: "scan", label: L("Сканирование", "Scan") },
            { value: "routing", label: L("Правила", "Rules") },
            { value: "system", label: L("Система", "System") },
            { value: "update", label: L("Обновления", "Updates") },
          ]}
        />
        <Chips
          label={L("Уровень", "Level")}
          value={lvl}
          onChange={setLvl}
          options={[
            { value: "all", label: L("Любой", "Any") },
            { value: "error", label: L("Ошибки", "Errors") },
            { value: "warning", label: L("Предупреждения", "Warnings") },
            { value: "success", label: L("Успех", "Success") },
            { value: "info", label: L("Инфо", "Info") },
          ]}
        />
      </div>
      {list.length === 0 ? (
        <EmptyState kind="events" title={L("Событий нет", "No events")} />
      ) : (
        <div className="surface-card divide-y divide-border overflow-hidden">
          {list.map((e) => {
            const m = ICON[e.level];
            return (
              <div key={e.id} className={cn("flex gap-3 p-3", !e.read && "bg-signal-soft")}>
                <m.i className={cn("mt-0.5 size-4 shrink-0", m.c)} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{e.message}</p>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                    {formatDateTime(e.at, locale)} · {e.category}
                    {e.isDemo && <DemoBadge withIcon={false} />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Screen>
  );
}
