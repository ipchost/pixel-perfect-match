import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ChevronRight,
  Globe,
  ShieldHalf,
  ShieldMinus,
  ShieldPlus,
  Smartphone,
  WifiOff,
} from "lucide-react";
import { useAppStore } from "@/app/store";
import { Screen, Section } from "@/components/swit4/Screen";
import { useL } from "@/lib/i18n";
import { findConflicts } from "@/features/rules/logic";

export const Route = createFileRoute("/rules/")({
  head: () => ({
    meta: [
      { title: "Правила маршрутизации — SWIT4" },
      {
        name: "description",
        content:
          "Белый и чёрный списки приложений, доменные и IP-правила, режим ограниченной связи.",
      },
      { property: "og:title", content: "Правила маршрутизации — SWIT4" },
      {
        property: "og:description",
        content:
          "Белый и чёрный списки приложений, доменные и IP-правила, режим ограниченной связи.",
      },
    ],
  }),
  component: RulesHub,
});

function RulesHub() {
  const L = useL();
  const routing = useAppStore((s) => s.routing);
  const rules = useAppStore((s) => s.domainRules);
  const limited = useAppStore((s) => s.limited);
  const conflicts = findConflicts(rules).length;
  const modeLabel =
    routing.mode === "all"
      ? L("Все приложения через VPN", "All apps via VPN")
      : routing.mode === "whitelist"
        ? L("Белый список", "Allowlist")
        : L("Чёрный список", "Blocklist");
  const items = [
    {
      to: "/rules/apps" as const,
      icon: Smartphone,
      title: L("Приложения", "Apps"),
      text: modeLabel,
      accent: "text-primary",
    },
    {
      to: "/rules/whitelist" as const,
      icon: ShieldPlus,
      title: L("Белый список", "Allowlist"),
      text: L(
        `${routing.whitelist.length} приложений · только они через VPN`,
        `${routing.whitelist.length} apps · only these via VPN`,
      ),
      accent: "text-status-ok",
    },
    {
      to: "/rules/blacklist" as const,
      icon: ShieldMinus,
      title: L("Чёрный список", "Blocklist"),
      text: L(
        `${routing.blacklist.length} приложений · идут напрямую`,
        `${routing.blacklist.length} apps · go direct`,
      ),
      accent: "text-warning",
    },
    {
      to: "/rules/domains" as const,
      icon: Globe,
      title: L("Домены и IP", "Domains & IP"),
      text: L(
        `${rules.length} правил${conflicts ? ` · конфликтов: ${conflicts}` : ""}`,
        `${rules.length} rules${conflicts ? ` · conflicts: ${conflicts}` : ""}`,
      ),
      accent: "text-signal",
    },
    {
      to: "/rules/limited" as const,
      icon: WifiOff,
      title: L("Ограниченная связь", "Limited connectivity"),
      text: limited.enabled ? L("Профиль включён", "Profile enabled") : L("Выключено", "Off"),
      accent: "text-muted-foreground",
    },
  ];
  return (
    <Screen
      title={L("Правила", "Rules")}
      subtitle={L("Хранятся только на устройстве", "Stored on device only")}
    >
      <div className="mb-6 flex items-center gap-4 rounded-3xl bg-hero p-5">
        <ShieldHalf className="size-10 shrink-0 text-primary" />
        <div>
          <div className="text-xs uppercase tracking-wider text-muted-foreground">
            {L("Активный режим", "Active mode")}
          </div>
          <div className="font-display text-lg font-semibold">{modeLabel}</div>
          {routing.appliedAt && (
            <div className="text-xs text-muted-foreground">
              {L("Применён к последнему туннелю", "Applied to last tunnel")}
            </div>
          )}
        </div>
      </div>
      <Section>
        <div className="surface-card divide-y divide-border overflow-hidden">
          {items.map((i) => (
            <Link key={i.to} to={i.to} className="flex items-center gap-4 p-4 hover:bg-surface-2">
              <i.icon className={`size-5 ${i.accent}`} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{i.title}</div>
                <div className="truncate text-xs text-muted-foreground">{i.text}</div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </Section>
    </Screen>
  );
}
