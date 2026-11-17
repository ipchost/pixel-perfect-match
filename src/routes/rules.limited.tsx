import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Archive, Info, Save, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/app/store";
import { Card, Notice, Screen, Section } from "@/components/swit4/Screen";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { getBridge } from "@/services/native/demo-bridge";
import { validateRuleValue } from "@/features/rules/logic";
import { formatDateTime } from "@/lib/format";
import { useLocale } from "@/localization";
import { useL } from "@/lib/i18n";

export const Route = createFileRoute("/rules/limited")({
  head: () => ({
    meta: [
      { title: "Режим ограниченной связи — SWIT4" },
      { name: "description", content: "Заранее подготовленные списки доменов, IP и приложений для частичной доступности сети." },
      { property: "og:title", content: "Режим ограниченной связи — SWIT4" },
      { property: "og:description", content: "Заранее подготовленные списки доменов, IP и приложений для частичной доступности сети." },
    ],
  }),
  component: Limited,
});

function Limited() {
  const L = useL();
  const locale = useLocale();
  const limited = useAppStore((s) => s.limited);
  const setLimited = useAppStore((s) => s.setLimited);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);
  const [domains, setDomains] = useState(limited.allowedDomains.join("\n"));
  const [ips, setIps] = useState(limited.allowedIps.join("\n"));
  const [apps, setApps] = useState(limited.apps.join("\n"));
  const [err, setErr] = useState<string | null>(null);
  const lines = (s: string) => s.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);

  const save = () => {
    const d = lines(domains);
    const i = lines(ips);
    const badD = d.filter((x) => validateRuleValue("domain_suffix", x));
    const badI = i.filter((x) => validateRuleValue(x.includes("/") ? "cidr" : "ip", x));
    if (badD.length || badI.length) return setErr(L(`Некорректные значения: ${[...badD, ...badI].join(", ")}`, `Invalid values: ${[...badD, ...badI].join(", ")}`));
    setErr(null);
    setLimited({ allowedDomains: d, allowedIps: i, apps: lines(apps), savedAt: new Date().toISOString() });
    toast.success(L("Профиль сохранён локально", "Profile saved locally"));
  };
  const backup = async () => {
    await getBridge().exporter.saveFile("swit4-limited-profile.json", JSON.stringify({ version: 1, ...limited }, null, 2), "application/json");
    setLimited({ lastBackupAt: new Date().toISOString() });
  };

  return (
    <Screen back="/rules" title={L("Ограниченная связь", "Limited connectivity")}>
      <Notice tone="warning" icon={<Info />} className="mb-6" title={L("Что умеет этот режим", "What this mode does")}>
        {L("Правила могут помочь, когда сеть доступна частично: трафик к важным сервисам пойдёт через рабочий маршрут. Режим не восстанавливает физически отключённый интернет и не гарантирует доступ при полном отключении всех каналов связи.", "Rules may help when the network is partially available by routing key services over a working path. This mode can't restore a physically disconnected internet and doesn't guarantee access when all channels are down.")}
      </Notice>
      <Card className="mb-6 flex items-center gap-4 p-4">
        <WifiOff className="size-6 text-muted-foreground" />
        <div className="flex-1"><div className="font-medium">{L("Профиль ограниченной связи", "Limited profile")}</div><div className="text-xs text-muted-foreground">{limited.savedAt ? L(`Сохранён ${formatDateTime(limited.savedAt, locale)}`, `Saved ${formatDateTime(limited.savedAt, locale)}`) : L("Ещё не сохранён", "Not saved yet")}</div></div>
        <Switch checked={limited.enabled} onCheckedChange={(v) => { setLimited({ enabled: v }); setActiveProfile(v ? "limited" : "normal"); }} aria-label={L("Включить профиль", "Enable profile")} />
      </Card>
      <Section title={L("Списки", "Lists")}>
        <Card className="space-y-4 p-4">
          <div className="space-y-1.5"><Label htmlFor="ld">{L("Разрешённые домены (по одному в строке)", "Allowed domains (one per line)")}</Label><Textarea id="ld" rows={5} value={domains} onChange={(e) => setDomains(e.target.value)} className="font-mono text-xs" /></div>
          <div className="space-y-1.5"><Label htmlFor="li">{L("Разрешённые IP / CIDR", "Allowed IP / CIDR")}</Label><Textarea id="li" rows={3} value={ips} onChange={(e) => setIps(e.target.value)} className="font-mono text-xs" /></div>
          <div className="space-y-1.5"><Label htmlFor="la">{L("Приложения (package names)", "Apps (package names)")}</Label><Textarea id="la" rows={3} value={apps} onChange={(e) => setApps(e.target.value)} className="font-mono text-xs" /></div>
          {err && <p role="alert" className="text-sm text-destructive">{err}</p>}
          <div className="flex flex-wrap gap-2">
            <Button onClick={save}><Save /> {L("Сохранить", "Save")}</Button>
            <Button variant="surface" onClick={backup}><Archive /> {L("Резервная копия", "Backup")}</Button>
          </div>
          {limited.lastBackupAt && <p className="text-xs text-muted-foreground">{L("Последняя копия", "Last backup")}: {formatDateTime(limited.lastBackupAt, locale)}</p>}
        </Card>
      </Section>
    </Screen>
  );
}
