import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { Card, Notice, Screen, Section } from "@/components/swit4/Screen";
import { LogoMark, Wordmark } from "@/components/swit4/Logo";
import { DemoBadge } from "@/components/swit4/DemoBadge";
import { getApi } from "@/services/api";
import { useL } from "@/lib/i18n";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "О приложении — SWIT4" },
      {
        name: "description",
        content: "Версия SWIT4, журнал изменений и лицензии сторонних компонентов.",
      },
      { property: "og:title", content: "О приложении — SWIT4" },
      {
        property: "og:description",
        content: "Версия SWIT4, журнал изменений и лицензии сторонних компонентов.",
      },
    ],
  }),
  component: About,
});

const LICENSES: [string, string, string][] = [
  ["React", "MIT", "https://github.com/facebook/react"],
  ["TanStack Router / Start / Query", "MIT", "https://github.com/TanStack"],
  ["Zustand", "MIT", "https://github.com/pmndrs/zustand"],
  ["Framer Motion", "MIT", "https://github.com/motiondivision/motion"],
  ["Lucide", "ISC", "https://github.com/lucide-icons/lucide"],
  ["qrcode.react", "ISC", "https://github.com/zpao/qrcode.react"],
  ["country-flag-icons", "MIT", "https://gitlab.com/catamphetamine/country-flag-icons"],
  ["Radix UI", "MIT", "https://github.com/radix-ui/primitives"],
  ["Tailwind CSS", "MIT", "https://github.com/tailwindlabs/tailwindcss"],
  ["Xray-core (Android, план)", "MPL-2.0", "https://github.com/XTLS/Xray-core"],
];

function About() {
  const L = useL();
  const version = useQuery({
    queryKey: ["app-version"],
    queryFn: async () => {
      const r = await getApi().getAppVersion();
      if (!r.ok) throw new Error(r.error.message);
      return r.data;
    },
  });
  return (
    <Screen back="/settings" title={L("О приложении", "About")}>
      <div className="mb-6 flex flex-col items-center rounded-3xl bg-hero p-8 text-center">
        <LogoMark className="size-16" />
        <Wordmark className="mt-3 text-2xl" />
        <p className="mt-1 text-sm text-muted-foreground">
          {L(
            "Веб-прототип 0.9 · основа для Android-клиента",
            "Web prototype 0.9 · basis for the Android client",
          )}
        </p>
      </div>
      <Section title={L("Журнал изменений", "Changelog")} aside={<DemoBadge />}>
        <Card className="divide-y divide-border">
          {version.isPending ? (
            <p className="p-4 text-sm text-muted-foreground">{L("Загрузка…", "Loading…")}</p>
          ) : version.isError ? (
            <p className="p-4 text-sm text-destructive">
              {L("Не удалось получить версию", "Couldn't load version")}
            </p>
          ) : (
            version.data.changelog.map((c) => (
              <div key={c.version} className="p-4">
                <div className="flex justify-between text-sm font-medium">
                  <span>{c.version}</span>
                  <span className="font-mono text-xs text-muted-foreground">{c.date}</span>
                </div>
                <ul className="mt-1.5 list-disc space-y-0.5 pl-5 text-xs text-muted-foreground">
                  {c.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
              </div>
            ))
          )}
        </Card>
      </Section>
      <Section title={L("Лицензии", "Licenses")}>
        <Card className="divide-y divide-border">
          {LICENSES.map(([name, lic, url]) => (
            <a
              key={name}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-3 p-4 text-sm hover:bg-surface-2"
            >
              <span>{name}</span>
              <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                {lic}
                <ExternalLink className="size-3.5" />
              </span>
            </a>
          ))}
        </Card>
      </Section>
      <Notice tone="info">
        {L(
          "SWIT4 не содержит исходного кода v2rayNG (GPL-3.0). Использование Xray-core в Android-версии требует соблюдения MPL-2.0. Полный список — THIRD_PARTY_LICENSES.md.",
          "SWIT4 contains no v2rayNG (GPL-3.0) source. Using Xray-core in Android requires MPL-2.0 compliance. Full list: THIRD_PARTY_LICENSES.md.",
        )}
      </Notice>
    </Screen>
  );
}
