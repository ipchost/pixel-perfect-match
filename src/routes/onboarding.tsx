import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { FlaskConical, ListTree, Radar, ShieldCheck } from "lucide-react";
import { useAppStore } from "@/app/store";
import { Logo } from "@/components/swit4/Logo";
import { Button } from "@/components/ui/button";
import { useL } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Добро пожаловать в SWIT4" },
      {
        name: "description",
        content: "Первый запуск SWIT4: подписки, поиск рабочих серверов и правила маршрутизации.",
      },
      { property: "og:title", content: "Добро пожаловать в SWIT4" },
      {
        property: "og:description",
        content: "Первый запуск SWIT4: подписки, поиск рабочих серверов и правила маршрутизации.",
      },
    ],
  }),
  component: Onboarding,
});

function Onboarding() {
  const L = useL();
  const navigate = useNavigate();
  const patch = useAppStore((s) => s.patchSettings);
  const locale = useAppStore((s) => s.settings.ui.locale);
  const [step, setStep] = useState(0);
  const steps = [
    {
      icon: ShieldCheck,
      title: L("Ваш трафик — под вашим контролем", "Your traffic, your control"),
      text: L(
        "SWIT4 подключается к серверам из ваших подписок по VLESS, VMess, Trojan и Shadowsocks.",
        "SWIT4 connects to servers from your own sources over VLESS, VMess, Trojan and Shadowsocks.",
      ),
    },
    {
      icon: Radar,
      title: L("Поиск рабочих серверов", "Find working servers"),
      text: L(
        "Контролируемая проверка с ограниченной параллельностью. Для каждой задержки указан метод — TCP connect не выдаётся за ping.",
        "Controlled checks with limited concurrency. Every latency shows its method — TCP connect is never called ping.",
      ),
    },
    {
      icon: ListTree,
      title: L("Белый и чёрный списки", "Allowlist and blocklist"),
      text: L(
        "Выберите, какие приложения идут через VPN. Список приложений хранится только на устройстве.",
        "Choose which apps use the VPN. The app list never leaves your device.",
      ),
    },
    {
      icon: FlaskConical,
      title: L("Это веб-прототип", "This is a web prototype"),
      text: L(
        "В браузере VPN-туннель не создаётся. Все измерения и приложения — демонстрационные и помечены DEMO.",
        "No VPN tunnel is created in the browser. All measurements and apps are demo data, marked DEMO.",
      ),
    },
  ];
  const cur = steps[step]!;
  const Icon = cur.icon;
  const finish = () => {
    patch("onboardingDone", true);
    void navigate({ to: "/" });
  };
  return (
    <div className="flex min-h-screen flex-col bg-background bg-hero px-6 pb-safe pt-safe">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <div className="flex h-16 items-center justify-between">
          <Logo />
          <div className="flex gap-1 rounded-full bg-surface-2 p-1 text-xs">
            {(["ru", "en"] as const).map((l) => (
              <button
                key={l}
                onClick={() => patch("ui", { locale: l })}
                aria-pressed={locale === l}
                className={cn(
                  "rounded-full px-2.5 py-1 font-medium uppercase",
                  locale === l ? "bg-surface text-foreground" : "text-muted-foreground",
                )}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-1 flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-8 flex size-20 items-center justify-center rounded-3xl bg-primary-soft">
                <Icon className="size-9 text-primary" />
              </div>
              <h1 className="font-display text-2xl font-semibold leading-tight sm:text-3xl">
                {cur.title}
              </h1>
              <p className="mt-3 text-base text-muted-foreground">{cur.text}</p>
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="pb-8">
          <div
            className="mb-6 flex gap-1.5"
            aria-label={L(
              `Шаг ${step + 1} из ${steps.length}`,
              `Step ${step + 1} of ${steps.length}`,
            )}
          >
            {steps.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  i <= step ? "bg-primary" : "bg-surface-3",
                )}
              />
            ))}
          </div>
          <div className="flex gap-3">
            <Button variant="ghost" size="xl" onClick={finish}>
              {L("Пропустить", "Skip")}
            </Button>
            <Button
              size="xl"
              className="flex-1"
              onClick={() => (step < steps.length - 1 ? setStep(step + 1) : finish())}
            >
              {step < steps.length - 1 ? L("Далее", "Next") : L("Начать", "Get started")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
