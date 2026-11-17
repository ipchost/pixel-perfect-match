import { createFileRoute } from "@tanstack/react-router";
import { Screen } from "@/components/swit4/Screen";
import { AppListEditor } from "@/features/rules/AppListEditor";
import { useL } from "@/lib/i18n";

export const Route = createFileRoute("/rules/whitelist")({
  head: () => ({
    meta: [
      { title: "Белый список — SWIT4" },
      {
        name: "description",
        content:
          "Только выбранные приложения идут через VPN. Выбор демо-приложений, поиск, импорт и экспорт package names.",
      },
      { property: "og:title", content: "Белый список — SWIT4" },
      { property: "og:description", content: "Только выбранные приложения идут через VPN." },
    ],
  }),
  component: Page,
});

function Page() {
  const L = useL();
  return (
    <Screen back="/rules" title={L("Белый список", "Allowlist")}>
      <AppListEditor list="whitelist" />
    </Screen>
  );
}
