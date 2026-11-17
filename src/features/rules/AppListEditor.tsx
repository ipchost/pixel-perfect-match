import { useEffect, useMemo, useRef, useState } from "react";
import { CheckSquare, Download, RotateCcw, Upload } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/app/store";
import { Card, Notice } from "@/components/swit4/Screen";
import { DemoBadge } from "@/components/swit4/DemoBadge";
import { EmptyState } from "@/components/swit4/EmptyState";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { SearchInput, Chips } from "@/features/servers/Toolbar";
import { getBridge } from "@/services/native/demo-bridge";
import { SWIT4_PACKAGE } from "@/mocks/apps";
import { useL } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { AppIcon } from "./AppIcon";
import { parsePackageList } from "./logic";

export function useInstalledApps() {
  const apps = useAppStore((s) => s.installedApps);
  const setApps = useAppStore((s) => s.setInstalledApps);
  useEffect(() => {
    if (apps === null) void getBridge().apps.list().then(setApps);
  }, [apps, setApps]);
  return apps;
}

/** Редактор белого или чёрного списка. Черновик применяется только после подтверждения. */
export function AppListEditor({ list }: { list: "whitelist" | "blacklist" }) {
  const L = useL();
  const apps = useInstalledApps();
  const routing = useAppStore((s) => s.routing);
  const setRouting = useAppStore((s) => s.setRouting);
  const addEvent = useAppStore((s) => s.addEvent);
  const phase = useAppStore((s) => s.connection.phase);
  const saved = routing[list];
  const [draft, setDraft] = useState<Set<string>>(new Set(saved));
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | "user" | "system" | "selected">("all");
  const [confirm, setConfirm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => setDraft(new Set(saved)), [saved]);

  const visible = useMemo(() => {
    const query = q.trim().toLowerCase();
    return (apps ?? []).filter((a) => {
      if (query && !`${a.label} ${a.packageName}`.toLowerCase().includes(query)) return false;
      if (kind === "user") return !a.isSystem;
      if (kind === "system") return a.isSystem;
      if (kind === "selected") return draft.has(a.packageName);
      return true;
    });
  }, [apps, q, kind, draft]);

  const missing = [...draft].filter((p) => apps && !apps.some((a) => a.packageName === p));
  const dirty = draft.size !== saved.length || saved.some((p) => !draft.has(p));
  const toggle = (p: string, v: boolean) => setDraft((d) => { const n = new Set(d); if (v) n.add(p); else n.delete(p); return n; });

  const apply = async () => {
    const pkgs = [...draft];
    const res = await getBridge().routing.validate(list, pkgs);
    if (!res.ok && res.reason === "empty_whitelist" && routing.mode === "whitelist") {
      toast.error(L("Белый список пуст — ни одно приложение не пойдёт через VPN", "Allowlist is empty — no app would use the VPN"));
      return;
    }
    setRouting({ [list]: pkgs });
    addEvent({ level: "info", category: "routing", message: `${list === "whitelist" ? "Белый" : "Чёрный"} список сохранён: ${pkgs.length} приложений` });
    toast.success(L("Правила сохранены", "Rules saved"), { description: phase === "connected" ? L("Применятся при следующем подключении", "Applied on next connect") : undefined });
  };

  const exportList = async () => {
    await getBridge().exporter.saveFile(`swit4-${list}.txt`, [`# SWIT4 ${list}`, ...draft].join("\n"), "text/plain");
  };
  const importList = async (f: File | undefined) => {
    if (!f) return;
    const { packages, invalid } = parsePackageList(await f.text());
    setDraft(new Set(packages));
    toast(L(`Импортировано пакетов: ${packages.length}`, `Imported packages: ${packages.length}`), { description: invalid ? L(`Пропущено некорректных: ${invalid}`, `Skipped invalid: ${invalid}`) : undefined });
  };

  const isWhite = list === "whitelist";
  return (
    <div className="space-y-4">
      <Notice tone={isWhite ? "info" : "warning"} title={isWhite ? L("Только выбранные → через VPN", "Only selected → via VPN") : L("Все, кроме выбранных → через VPN", "All except selected → via VPN")}>
        {isWhite ? L("Остальные приложения идут напрямую. Android: VpnService.Builder.addAllowedApplication().", "Other apps go direct. Android: VpnService.Builder.addAllowedApplication().") : L("Выбранные приложения идут напрямую, в обход VPN. Android: addDisallowedApplication().", "Selected apps bypass the VPN. Android: addDisallowedApplication().")}
        {routing.mode !== list && <div className="mt-1 font-medium text-warning">{L("Этот список сейчас не активен — включите режим на экране «Приложения».", "This list isn't active — enable the mode on the Apps screen.")}</div>}
      </Notice>
      <div className="flex items-center gap-2 text-xs text-muted-foreground"><DemoBadge /> {L("Браузер не видит приложения устройства — это демонстрационный список.", "The browser can't see device apps — this is a demo list.")}</div>
      <SearchInput value={q} onChange={setQ} placeholder={L("Название или package name", "Name or package name")} />
      <Chips label={L("Фильтр", "Filter")} value={kind} onChange={setKind} options={[{ value: "all", label: L("Все", "All") }, { value: "user", label: L("Пользовательские", "User") }, { value: "system", label: L("Системные", "System") }, { value: "selected", label: L(`Выбранные · ${draft.size}`, `Selected · ${draft.size}`) }]} />
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="surface" onClick={() => setDraft((d) => new Set([...d, ...visible.filter((a) => a.packageName !== SWIT4_PACKAGE).map((a) => a.packageName)]))}><CheckSquare /> {L("Выбрать все", "Select all")}</Button>
        <Button size="sm" variant="surface" onClick={() => setDraft(new Set())}><RotateCcw /> {L("Сбросить", "Reset")}</Button>
        <Button size="sm" variant="surface" onClick={() => fileRef.current?.click()}><Upload /> {L("Импорт", "Import")}</Button>
        <Button size="sm" variant="surface" onClick={exportList}><Download /> {L("Экспорт", "Export")}</Button>
        <input ref={fileRef} type="file" accept=".txt,text/plain" className="hidden" onChange={(e) => void importList(e.target.files?.[0])} />
      </div>
      {missing.length > 0 && <Notice tone="warning">{L(`Не установлены (будут пропущены): ${missing.join(", ")}`, `Not installed (skipped): ${missing.join(", ")}`)}</Notice>}

      {apps === null ? (
        <Card className="space-y-3 p-4">{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-10 w-full" />)}</Card>
      ) : visible.length === 0 ? (
        <EmptyState kind="apps" title={L("Приложения не найдены", "No apps found")} />
      ) : (
        <div className="surface-card divide-y divide-border overflow-hidden">
          {visible.map((a) => {
            const self = a.packageName === SWIT4_PACKAGE;
            const checked = draft.has(a.packageName);
            return (
              <label key={a.packageName} className={cn("flex cursor-pointer items-center gap-3 p-3", checked && "bg-primary-soft", self && "cursor-not-allowed opacity-60")}>
                <AppIcon iconKey={a.iconKey} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 text-sm font-medium"><span className="truncate">{a.label}</span>{a.isSystem && <span className="rounded bg-surface-3 px-1 text-[10px] text-muted-foreground">{L("система", "system")}</span>}</div>
                  <div className="truncate font-mono text-[11px] text-muted-foreground">{a.packageName}</div>
                </div>
                <Checkbox checked={checked} disabled={self} onCheckedChange={(v) => toggle(a.packageName, v === true)} aria-label={a.label} />
              </label>
            );
          })}
        </div>
      )}

      <div className="sticky bottom-20 z-20 flex items-center gap-3 rounded-2xl border border-border bg-popover p-3 shadow-float md:bottom-4">
        <span className="flex-1 text-sm">{L(`Выбрано: ${draft.size}`, `Selected: ${draft.size}`)}{dirty && <span className="ml-2 text-xs text-warning">{L("не сохранено", "unsaved")}</span>}</span>
        <Button disabled={!dirty} onClick={() => setConfirm(true)}>{L("Применить", "Apply")}</Button>
      </div>

      <AlertDialog open={confirm} onOpenChange={setConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{L("Применить новые правила?", "Apply new rules?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {isWhite ? L(`Через VPN будут идти только ${draft.size} выбранных приложений.`, `Only ${draft.size} selected apps will use the VPN.`) : L(`${draft.size} выбранных приложений будут обходить VPN.`, `${draft.size} selected apps will bypass the VPN.`)}{" "}
              {L("На Android список применяется до создания VPN-интерфейса, поэтому активное соединение будет переподключено.", "On Android the list is applied before the VPN interface is created, so an active connection will reconnect.")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{L("Отмена", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void apply()}>{L("Применить", "Apply")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
