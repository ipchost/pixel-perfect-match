import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Download, Globe2, List, Plus, Radar, X } from "lucide-react";
import { useAppStore } from "@/app/store";
import { Screen } from "@/components/swit4/Screen";
import { Flag } from "@/components/swit4/Flag";
import { EmptyState } from "@/components/swit4/EmptyState";
import { DemoBadge } from "@/components/swit4/DemoBadge";
import { Button } from "@/components/ui/button";
import { groupByCountry } from "@/services/servers/grouping";
import { ServerRow, ListCard } from "@/features/servers/ServerRow";
import { Chips, SearchInput, useStatusOptions } from "@/features/servers/Toolbar";
import { filterServers, sortServers, type SortKey, type StatusFilter } from "@/features/servers/filters";
import { ExportDialog } from "@/features/export/ExportDialog";
import { useLocale } from "@/localization";
import { useL } from "@/lib/i18n";
import type { Protocol } from "@/types";

export const Route = createFileRoute("/servers/")({
  head: () => ({
    meta: [
      { title: "Серверы — SWIT4" },
      { name: "description", content: "Каталог серверов SWIT4 по странам с фильтрами, рейтингом и экспортом." },
      { property: "og:title", content: "Серверы — SWIT4" },
      { property: "og:description", content: "Каталог серверов SWIT4 по странам с фильтрами, рейтингом и экспортом." },
    ],
  }),
  component: ServersPage,
});

function ServersPage() {
  const L = useL();
  const locale = useLocale();
  const servers = useAppStore((s) => s.servers);
  const stale = useAppStore((s) => s.settings.scan.staleAfterMin);
  const [view, setView] = useState<"countries" | "list">("countries");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [protocol, setProtocol] = useState<Protocol | "all">("all");
  const [sort, setSort] = useState<SortKey>("rating");
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exportOpen, setExportOpen] = useState(false);
  const statusOptions = useStatusOptions();

  const filtered = useMemo(() => sortServers(filterServers(servers, q, status, protocol), sort, stale), [servers, q, status, protocol, sort, stale]);
  const groups = useMemo(() => groupByCountry(filtered, locale), [filtered, locale]);
  const toggle = (id: string, v: boolean) => setSelected((s) => { const n = new Set(s); if (v) n.add(id); else n.delete(id); return n; });

  return (
    <Screen
      title={L("Серверы", "Servers")}
      subtitle={L(`${servers.length} конфигураций · ${groups.length} стран`, `${servers.length} configs · ${groups.length} countries`)}
      wide
      actions={
        <>
          <Button variant="ghost" size="icon" aria-label={view === "countries" ? L("Показать списком", "Show as list") : L("По странам", "By country")} onClick={() => setView(view === "countries" ? "list" : "countries")}>
            {view === "countries" ? <List /> : <Globe2 />}
          </Button>
          <Button variant="ghost" size="icon" asChild aria-label={L("Найти рабочие", "Find working")}><Link to="/scan"><Radar /></Link></Button>
        </>
      }
    >
      {servers.length === 0 ? (
        <EmptyState kind="servers" title={L("Пока нет серверов", "No servers yet")} text={L("Добавьте подписку или импортируйте конфигурацию.", "Add a source or import a config.")} action={<Button asChild size="touch"><Link to="/subscriptions"><Plus /> {L("Добавить подписку", "Add source")}</Link></Button>} />
      ) : (
        <div className="space-y-4">
          <SearchInput value={q} onChange={setQ} placeholder={L("Страна, город или имя сервера", "Country, city or server name")} />
          <Chips label={L("Статус", "Status")} value={status} onChange={setStatus} options={statusOptions} />
          <div className="flex flex-wrap items-center gap-2">
            <Chips label={L("Протокол", "Protocol")} value={protocol} onChange={setProtocol} options={[{ value: "all", label: L("Все протоколы", "All protocols") }, { value: "vless", label: "VLESS" }, { value: "vmess", label: "VMess" }, { value: "trojan", label: "Trojan" }, { value: "shadowsocks", label: "Shadowsocks" }]} />
          </div>
          {view === "list" && (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Chips label={L("Сортировка", "Sort")} value={sort} onChange={setSort} options={[{ value: "rating", label: L("Рейтинг", "Rating") }, { value: "latency", label: L("Задержка", "Latency") }, { value: "stability", label: L("Стабильность", "Stability") }, { value: "name", label: L("Имя", "Name") }]} />
              <Button variant={selecting ? "secondary" : "surface"} size="sm" onClick={() => { setSelecting(!selecting); setSelected(new Set()); }}>
                {selecting ? <><X /> {L("Отмена", "Cancel")}</> : L("Выбрать", "Select")}
              </Button>
            </div>
          )}

          {filtered.length === 0 ? (
            <EmptyState kind="search" title={L("Ничего не найдено", "Nothing found")} text={L("Измените фильтры или запрос.", "Change filters or query.")} />
          ) : view === "countries" ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {groups.map((g) => (
                <Link key={g.country.code} to="/servers/$country" params={{ country: g.country.code }} className="surface-card flex items-center gap-3 p-4 transition-colors hover:bg-surface-2">
                  <Flag code={g.country.code} className="h-6 w-9" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{locale === "en" ? g.country.nameEn : g.country.nameRu}</div>
                    <div className="text-xs text-muted-foreground">
                      {L(`${g.available} из ${g.total} рабочих`, `${g.available} of ${g.total} working`)}
                      {g.bestLatencyMs !== null && <> · {L("лучший", "best")} <span className="font-mono text-foreground">{g.bestLatencyMs} {L("мс", "ms")}</span></>}
                    </div>
                  </div>
                  <ChevronRight className="size-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          ) : (
            <ListCard>
              {filtered.map((s) => <ServerRow key={s.id} server={s} showCountry selectable={selecting} selected={selected.has(s.id)} onSelect={(v) => toggle(s.id, v)} />)}
            </ListCard>
          )}
          <p className="flex items-center gap-2 px-1 text-xs text-muted-foreground"><DemoBadge /> {L("Задержки получены демо-проверкой; метод указан рядом со значением.", "Latencies come from demo checks; method is shown next to each value.")}</p>
        </div>
      )}

      {selecting && selected.size > 0 && (
        <div className="fixed inset-x-4 bottom-20 z-30 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-border bg-popover p-3 shadow-float md:bottom-6">
          <span className="flex-1 text-sm">{L(`Выбрано: ${selected.size}`, `Selected: ${selected.size}`)}</span>
          <Button size="sm" variant="surface" onClick={() => setSelected(new Set(filtered.map((s) => s.id)))}>{L("Все", "All")}</Button>
          <Button size="sm" onClick={() => setExportOpen(true)}><Download /> {L("Экспорт", "Export")}</Button>
        </div>
      )}
      <ExportDialog open={exportOpen} onOpenChange={setExportOpen} servers={servers.filter((s) => selected.has(s.id))} title={L("Выбранные серверы", "Selected servers")} />
    </Screen>
  );
}
