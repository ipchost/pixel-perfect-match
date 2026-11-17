import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ChevronRight, Globe2, ShieldMinus, ShieldPlus } from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/app/store";
import { Notice, Screen } from "@/components/swit4/Screen";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useL } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { AppRoutingMode } from "@/types";

export const Route = createFileRoute("/rules/apps")({
  head: () => ({
    meta: [
      { title: "Приложения и VPN — SWIT4" },
      {
        name: "description",
        content:
          "Выбор режима раздельного туннелирования: все приложения, белый или чёрный список.",
      },
      { property: "og:title", content: "Приложения и VPN — SWIT4" },
      {
        property: "og:description",
        content:
          "Выбор режима раздельного туннелирования: все приложения, белый или чёрный список.",
      },
    ],
  }),
  component: AppsMode,
});

function AppsMode() {
  const L = useL();
  const routing = useAppStore((s) => s.routing);
  const setRouting = useAppStore((s) => s.setRouting);
  const addEvent = useAppStore((s) => s.addEvent);
  const [pending, setPending] = useState<AppRoutingMode | null>(null);
  const modes: {
    mode: AppRoutingMode;
    icon: typeof Globe2;
    title: string;
    text: string;
    diagram: [string, string];
  }[] = [
    {
      mode: "all",
      icon: Globe2,
      title: L("Все приложения", "All apps"),
      text: L("Весь трафик устройства идёт через VPN.", "All device traffic goes through the VPN."),
      diagram: [L("все → VPN", "all → VPN"), ""],
    },
    {
      mode: "whitelist",
      icon: ShieldPlus,
      title: L("A. Белый список", "A. Allowlist"),
      text: L(
        "Только выбранные приложения идут через VPN, остальные — напрямую.",
        "Only selected apps use the VPN, others go direct.",
      ),
      diagram: [
        L(
          `выбранные (${routing.whitelist.length}) → VPN`,
          `selected (${routing.whitelist.length}) → VPN`,
        ),
        L("остальные → напрямую", "others → direct"),
      ],
    },
    {
      mode: "blacklist",
      icon: ShieldMinus,
      title: L("B. Чёрный список", "B. Blocklist"),
      text: L(
        "Все приложения идут через VPN, кроме выбранных — они идут напрямую.",
        "All apps use the VPN except selected ones, which go direct.",
      ),
      diagram: [
        L("остальные → VPN", "others → VPN"),
        L(
          `выбранные (${routing.blacklist.length}) → напрямую`,
          `selected (${routing.blacklist.length}) → direct`,
        ),
      ],
    },
  ];
  const confirm = () => {
    if (!pending) return;
    if (pending === "whitelist" && routing.whitelist.length === 0)
      toast.warning(L("Белый список пуст — добавьте приложения", "Allowlist is empty — add apps"));
    setRouting({ mode: pending });
    addEvent({ level: "info", category: "routing", message: `Режим приложений: ${pending}` });
    setPending(null);
  };
  return (
    <Screen
      back="/rules"
      title={L("Приложения", "Apps")}
      subtitle={L("Режимы взаимоисключающие", "Modes are mutually exclusive")}
    >
      <div role="radiogroup" aria-label={L("Режим", "Mode")} className="space-y-3">
        {modes.map((m) => {
          const active = routing.mode === m.mode;
          return (
            <button
              key={m.mode}
              role="radio"
              aria-checked={active}
              onClick={() => !active && setPending(m.mode)}
              className={cn(
                "surface-card flex w-full items-start gap-4 p-4 text-left transition-all",
                active ? "ring-2 ring-primary" : "hover:bg-surface-2",
              )}
            >
              <span
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-2xl",
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-surface-2 text-muted-foreground",
                )}
              >
                <m.icon className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 font-medium">
                  {m.title}
                  {active && <Check className="size-4 text-primary" />}
                </span>
                <span className="mt-0.5 block text-sm text-muted-foreground">{m.text}</span>
                <span className="mt-2 flex flex-wrap gap-1.5 font-mono text-[11px]">
                  <span className="rounded-md bg-primary-soft px-1.5 py-0.5 text-primary">
                    {m.diagram[0]}
                  </span>
                  {m.diagram[1] && (
                    <span className="rounded-md bg-surface-3 px-1.5 py-0.5 text-muted-foreground">
                      {m.diagram[1]}
                    </span>
                  )}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Button asChild variant="surface" size="touch">
          <Link to="/rules/whitelist">
            <ShieldPlus /> {L("Изменить белый список", "Edit allowlist")}{" "}
            <ChevronRight className="ml-auto" />
          </Link>
        </Button>
        <Button asChild variant="surface" size="touch">
          <Link to="/rules/blacklist">
            <ShieldMinus /> {L("Изменить чёрный список", "Edit blocklist")}{" "}
            <ChevronRight className="ml-auto" />
          </Link>
        </Button>
      </div>
      <Notice tone="info" className="mt-6">
        {L(
          "В Android-версии список приложений получает PackageManager, выбор хранится локально и никогда не отправляется на backend. Удалённые приложения автоматически пропускаются.",
          "In the Android app PackageManager lists apps; the selection stays local and is never sent to the backend. Uninstalled apps are skipped.",
        )}
      </Notice>
      <AlertDialog open={pending !== null} onOpenChange={(o) => !o && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{L("Сменить режим?", "Switch mode?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {modes.find((m) => m.mode === pending)?.text}{" "}
              {L(
                "Активное соединение будет переподключено при применении.",
                "An active connection reconnects when applied.",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{L("Отмена", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={confirm}>{L("Подтвердить", "Confirm")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Screen>
  );
}
