import { createFileRoute } from "@tanstack/react-router";
import { Screen } from "@/components/swit4/Screen";
import { AppListEditor } from "@/features/rules/AppListEditor";
import { useL } from "@/lib/i18n";

export const Route = createFileRoute("/rules/blacklist")({
  head: () => ({
    meta: [
      { title: "Чёрный список — SWIT4" },
      { name: "description", content: "Выбранные приложения идут напрямую, в обход VPN. Выбор демо-приложений, поиск, импорт и экспорт package names." },
      { property: "og:title", content: "Чёрный список — SWIT4" },
      { property: "og:description", content: "Выбранные приложения идут напрямую, в обход VPN." },
    ],
  }),
  component: Page,
});

function Page() {
  const L = useL();
  return (
    <Screen back="/rules" title={L("Чёрный список", "Blocklist")}>
      <AppListEditor list="blacklist" />
    </Screen>
  );
}
