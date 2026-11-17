import { useRef, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Download, Info, LayoutGrid, RotateCcw, ShieldOff, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/app/store";
import { Card, Notice, Screen, Section } from "@/components/swit4/Screen";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { EXTRA_NAV } from "@/features/shell/nav";
import { buildBackup, restoreBackup } from "@/features/stats/backup";
import { getBridge } from "@/services/native/demo-bridge";
import { useT } from "@/localization";
import { useL } from "@/lib/i18n";
import { STORAGE_KEY } from "@/app/store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Настройки — SWIT4" },
      { name: "description", content: "Тема, язык, подключение, сканирование, подписки, DNS, приватность и резервное копирование SWIT4." },
      { property: "og:title", content: "Настройки — SWIT4" },
      { property: "og:description", content: "Тема, язык, подключение, сканирование, подписки, DNS, приватность и резервное копирование SWIT4." },
    ],
  }),
  component: SettingsPage,
});

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div className="min-w-0"><div className="text-sm">{label}</div>{hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}</div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Pick<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label: string }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as T)}>
      <SelectTrigger className="w-40" aria-label={label}><SelectValue /></SelectTrigger>
      <SelectContent>{options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
    </Select>
  );
}

function Num({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (n: number) => void; label: string }) {
  return <Input type="number" className="w-24" aria-label={label} min={min} max={max} value={value} onChange={(e) => { const n = Number(e.target.value); if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, n))); }} />;
}

function SettingsPage() {
  const t = useT();
  const L = useL();
  const s = useAppStore((st) => st.settings);
  const patch = useAppStore((st) => st.patchSettings);
  const clearAll = useAppStore((st) => st.clearAllLocalData);
  const [killOpen, setKillOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const restore = async (f: File | undefined) => {
    if (!f) return;
    const r = restoreBackup(await f.text());
    if (r.ok) toast.success(L("Настройки и правила восстановлены", "Settings and rules restored"));
    else toast.error(L("Файл не похож на резервную копию SWIT4", "Not a SWIT4 backup file"));
  };

  return (
    <Screen title={L("Настройки", "Settings")}>
      <div className="mb-6 grid grid-cols-2 gap-2 md:hidden">
        {EXTRA_NAV.map((n) => (
          <Link key={n.to} to={n.to} className="surface-card flex items-center gap-2.5 p-3 text-sm hover:bg-surface-2"><n.icon className="size-4 text-primary" />{L(n.ru, n.en)}</Link>
        ))}
      </div>

      <Section title={L("Внешний вид", "Appearance")}>
        <Card className="divide-y divide-border">
          <Row label={L("Тема", "Theme")}><Pick label={L("Тема", "Theme")} value={s.ui.theme} onChange={(v) => patch("ui", { theme: v })} options={[{ value: "dark", label: L("Тёмная", "Dark") }, { value: "light", label: L("Светлая", "Light") }, { value: "system", label: L("Системная", "System") }]} /></Row>
          <Row label={L("Язык", "Language")}><Pick label={L("Язык", "Language")} value={s.ui.locale} onChange={(v) => patch("ui", { locale: v })} options={[{ value: "ru", label: "Русский" }, { value: "en", label: "English" }]} /></Row>
          <Row label={L("Анимации", "Motion")} hint={L("«Системно» учитывает «уменьшить движение»", "“System” respects reduce motion")}><Pick label={L("Анимации", "Motion")} value={s.ui.motion} onChange={(v) => patch("ui", { motion: v })} options={[{ value: "system", label: L("Системно", "System") }, { value: "full", label: L("Полные", "Full") }, { value: "reduced", label: L("Минимум", "Reduced") }]} /></Row>
        </Card>
      </Section>

      <Section title={L("Подключение", "Connection")}>
        <Card className="divide-y divide-border">
          <Row label={L("Автопереподключение", "Auto-reconnect")}><Switch checked={s.connection.autoReconnect} onCheckedChange={(v) => patch("connection", { autoReconnect: v })} /></Row>
          <Row label={L("При потере сети", "On network loss")}><Pick label={L("При потере сети", "On network loss")} value={s.connection.onNetworkLoss} onChange={(v) => patch("connection", { onNetworkLoss: v })} options={[{ value: "wait", label: L("Ждать", "Wait") }, { value: "reconnect", label: L("Переподключить", "Reconnect") }, { value: "switch_server", label: L("Сменить сервер", "Switch server") }]} /></Row>
          <Row label={L("Макс. автосмен за 10 мин", "Max auto-switches / 10 min")} hint={L("Защита от бесконечного переподключения", "Prevents reconnect loops")}><Num label="max" value={s.connection.maxSwitchesPer10Min} min={1} max={10} onChange={(n) => patch("connection", { maxSwitchesPer10Min: n })} /></Row>
          <Row label={L("Тайм-аут подключения, с", "Connect timeout, s")}><Num label="timeout" value={s.connection.timeoutSec} min={5} max={60} onChange={(n) => patch("connection", { timeoutSec: n })} /></Row>
          <Row label={L("Запуск при загрузке", "Start on boot")} hint={t.common.nativeOnly}><Switch checked={s.connection.startOnBoot} onCheckedChange={(v) => patch("connection", { startOnBoot: v })} /></Row>
          <Row label="Kill switch / Always-on VPN" hint={L("Будущая нативная функция Android lockdown", "Future native Android lockdown feature")}>
            <Button size="sm" variant="surface" onClick={() => setKillOpen(true)}><ShieldOff /> {s.killSwitchAcknowledged ? L("Понятно", "Acknowledged") : L("Подробнее", "Details")}</Button>
          </Row>
        </Card>
      </Section>

      <Section title={L("Сканирование", "Scanning")}>
        <Card className="divide-y divide-border">
          <Row label={L("Параллельных проверок", "Concurrent checks")}><Num label="concurrency" value={s.scan.concurrency} min={1} max={8} onChange={(n) => patch("scan", { concurrency: n })} /></Row>
          <Row label={L("Тайм-аут проверки, мс", "Probe timeout, ms")}><Num label="timeout ms" value={s.scan.timeoutMs} min={1000} max={15000} onChange={(n) => patch("scan", { timeoutMs: n })} /></Row>
          <Row label={L("Метод проверки", "Probe method")}><Pick label={L("Метод", "Method")} value={s.scan.method} onChange={(v) => patch("scan", { method: v })} options={(["tcp_connect", "tls_handshake", "proxy_handshake", "control_endpoint"] as const).map((m) => ({ value: m, label: t.common.method[m] }))} /></Row>
          <Row label={L("Лимит теста скорости, KB", "Speed test limit, KB")}><Num label="limit" value={s.scan.throughputLimitKb} min={128} max={10240} onChange={(n) => patch("scan", { throughputLimitKb: n })} /></Row>
          <Row label={L("Только включённые источники", "Enabled sources only")}><Switch checked={s.scan.onlyActiveSources} onCheckedChange={(v) => patch("scan", { onlyActiveSources: v })} /></Row>
          <Row label={L("Включать избранное", "Include favorites")}><Switch checked={s.scan.includeFavorites} onCheckedChange={(v) => patch("scan", { includeFavorites: v })} /></Row>
          <Row label={L("Результат устаревает через, мин", "Result stale after, min")}><Num label="stale" value={s.scan.staleAfterMin} min={10} max={1440} onChange={(n) => patch("scan", { staleAfterMin: n })} /></Row>
        </Card>
      </Section>

      <Section title={L("Подписки", "Sources")}>
        <Card className="divide-y divide-border">
          <Row label={L("Автообновление", "Auto-refresh")} hint={L("Пока приложение открыто; точное расписание — на backend", "While the app is open; exact schedule runs on backend")}><Switch checked={s.subscriptions.autoUpdate} onCheckedChange={(v) => patch("subscriptions", { autoUpdate: v })} /></Row>
          <Row label={L("Интервал по умолчанию, мин", "Default interval, min")}><Num label="interval" value={s.subscriptions.intervalMin} min={5} max={1440} onChange={(n) => patch("subscriptions", { intervalMin: n })} /></Row>
          <Row label={L("Сеть для обновления", "Update network")}><Pick label={L("Сеть", "Network")} value={s.subscriptions.network} onChange={(v) => patch("subscriptions", { network: v })} options={[{ value: "any", label: L("Любая", "Any") }, { value: "wifi_only", label: "Wi-Fi" }, { value: "no_roaming", label: L("Без роуминга", "No roaming") }]} /></Row>
        </Card>
      </Section>

      <Section title="DNS / IP">
        <Card className="divide-y divide-border">
          <Row label="DNS"><Pick label="DNS" value={s.dns.mode} onChange={(v) => patch("dns", { mode: v })} options={[{ value: "tunnel", label: L("Через туннель", "Via tunnel") }, { value: "system", label: L("Системный", "System") }, { value: "custom", label: L("Свой", "Custom") }]} /></Row>
          {s.dns.mode === "custom" && <Row label={L("Серверы DNS", "DNS servers")}><Input className="w-48 font-mono text-xs" value={s.dns.customServers.join(", ")} onChange={(e) => patch("dns", { customServers: e.target.value.split(/[\s,]+/).filter(Boolean) })} /></Row>}
          <Row label={L("Протокол IP", "IP mode")}><Pick label="IP" value={s.dns.ipMode} onChange={(v) => patch("dns", { ipMode: v })} options={[{ value: "ipv4", label: "IPv4" }, { value: "ipv4_ipv6", label: "IPv4 + IPv6" }, { value: "ipv6_prefer", label: L("Предпочитать IPv6", "Prefer IPv6") }]} /></Row>
        </Card>
      </Section>

      <Section title={L("Приватность и данные", "Privacy & data")}>
        <Card className="divide-y divide-border">
          <Row label={L("Очищать буфер после копирования, с", "Clear clipboard after copy, s")}><Num label="clipboard" value={s.privacy.clearClipboardAfterSec ?? 0} min={0} max={600} onChange={(n) => patch("privacy", { clearClipboardAfterSec: n === 0 ? null : n })} /></Row>
          <Row label={L("Хранить историю, дней", "Keep history, days")}><Num label="history" value={s.privacy.keepHistoryDays} min={1} max={365} onChange={(n) => patch("privacy", { keepHistoryDays: n })} /></Row>
          <Row label={L("Резервная копия настроек и правил", "Backup settings & rules")} hint={L("Без серверов и ключей", "Without servers and keys")}>
            <div className="flex gap-2">
              <Button size="sm" variant="surface" onClick={() => void getBridge().exporter.saveFile("swit4-backup.json", buildBackup(), "application/json")}><Download /> {L("Сохранить", "Save")}</Button>
              <Button size="sm" variant="surface" onClick={() => fileRef.current?.click()}><Upload /> {L("Восстановить", "Restore")}</Button>
              <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={(e) => void restore(e.target.files?.[0])} />
            </div>
          </Row>
          <Row label={L("Повторить знакомство", "Replay onboarding")}><Button size="sm" variant="surface" asChild><Link to="/onboarding"><RotateCcw /> {L("Открыть", "Open")}</Link></Button></Row>
          <Row label={L("Удалить все локальные данные", "Delete all local data")}><Button size="sm" variant="destructive" onClick={() => setResetOpen(true)}><Trash2 /> {L("Удалить", "Delete")}</Button></Row>
        </Card>
      </Section>

      <Section title={L("Будущие нативные функции", "Future native features")}>
        <Card className="divide-y divide-border text-sm">
          {[L("Плитка Quick Settings", "Quick Settings tile"), L("Виджет на главном экране", "Home-screen widget"), L("Системный share sheet", "System share sheet"), L("Deep links для импорта с подтверждением", "Deep links for import with confirmation")].map((x) => (
            <div key={x} className="flex items-center justify-between p-4"><span className="flex items-center gap-3"><LayoutGrid className="size-4 text-muted-foreground" />{x}</span><span className="text-xs text-muted-foreground">{t.common.nativeOnly}</span></div>
          ))}
        </Card>
      </Section>

      <Link to="/about" className="surface-card flex items-center gap-3 p-4 hover:bg-surface-2"><Info className="size-5 text-signal" /><span className="flex-1 text-sm">{L("О приложении и лицензии", "About & licenses")}</span><ChevronRight className="size-4 text-muted-foreground" /></Link>
      <p className="mt-4 px-1 font-mono text-[10.5px] text-muted-foreground">localStorage: {STORAGE_KEY}</p>

      <AlertDialog open={killOpen} onOpenChange={setKillOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Kill switch / Always-on VPN</AlertDialogTitle>
            <AlertDialogDescription>{L("В Android-версии блокировка трафика вне VPN включается через системные настройки «Постоянная VPN» и «Блокировать соединения без VPN». При сбое сервера интернет на устройстве будет недоступен, пока VPN не восстановится. В веб-прототипе функция не работает.", "In the Android app, blocking non-VPN traffic is enabled via system “Always-on VPN” and “Block connections without VPN”. If the server fails, the device has no internet until VPN recovers. Not functional in the web prototype.")}</AlertDialogDescription>
          </AlertDialogHeader>
          <Notice tone="warning">{L("Требуется явное согласие пользователя на нативном экране.", "Requires explicit user consent on a native screen.")}</Notice>
          <AlertDialogFooter>
            <AlertDialogCancel>{L("Закрыть", "Close")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => patch("killSwitchAcknowledged", true)}>{L("Понимаю риски", "I understand the risks")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={resetOpen} onOpenChange={setResetOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{L("Удалить все данные?", "Delete all data?")}</AlertDialogTitle>
            <AlertDialogDescription>{L("Будут удалены серверы, подписки, правила, избранное и история на этом устройстве.", "Servers, sources, rules, favorites and history on this device will be deleted.")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{L("Отмена", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => { clearAll(); toast(L("Данные удалены", "Data deleted")); }}>{L("Удалить", "Delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Screen>
  );
}
