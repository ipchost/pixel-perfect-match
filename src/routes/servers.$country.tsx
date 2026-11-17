import { useMemo } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useAppStore } from "@/app/store";
import { Screen, Section } from "@/components/swit4/Screen";
import { Flag } from "@/components/swit4/Flag";
import { EmptyState } from "@/components/swit4/EmptyState";
import { getCountry } from "@/mocks/countries";
import { ServerRow, ListCard } from "@/features/servers/ServerRow";
import { sortServers } from "@/features/servers/filters";
import { useLocale } from "@/localization";
import { useL } from "@/lib/i18n";

export const Route = createFileRoute("/servers/$country")({
  head: ({ params }) => ({
    meta: [
      { title: `${getCountry(params.country.toUpperCase()).nameRu} — серверы SWIT4` },
      {
        name: "description",
        content: `Серверы SWIT4 в стране ${getCountry(params.country.toUpperCase()).nameRu}, сгруппированные по городам.`,
      },
      {
        property: "og:title",
        content: `${getCountry(params.country.toUpperCase()).nameRu} — серверы SWIT4`,
      },
      {
        property: "og:description",
        content: "Серверы страны, сгруппированные по городам, с задержкой и статусом.",
      },
    ],
  }),
  component: CountryPage,
});

function CountryPage() {
  const { country } = Route.useParams();
  const code = country.toUpperCase();
  const L = useL();
  const locale = useLocale();
  const all = useAppStore((s) => s.servers);
  const stale = useAppStore((s) => s.settings.scan.staleAfterMin);
  const list = useMemo(
    () =>
      sortServers(
        all.filter((s) => s.countryCode === code),
        "rating",
        stale,
      ),
    [all, code, stale],
  );
  const cities = useMemo(() => {
    const m = new Map<string, typeof list>();
    list.forEach((s) =>
      m.set(s.city || L("Без города", "No city"), [
        ...(m.get(s.city || L("Без города", "No city")) ?? []),
        s,
      ]),
    );
    return [...m.entries()];
  }, [list, L]);
  const c = getCountry(code);
  return (
    <Screen
      back="/servers"
      title={
        <span className="flex items-center gap-2.5">
          <Flag code={code} /> {locale === "en" ? c.nameEn : c.nameRu}
        </span>
      }
      subtitle={L(
        `${list.length} серверов, сортировка по рейтингу`,
        `${list.length} servers, sorted by rating`,
      )}
    >
      {list.length === 0 ? (
        <EmptyState
          kind="servers"
          title={L("Нет серверов в этой стране", "No servers in this country")}
        />
      ) : (
        cities.map(([city, servers]) => (
          <Section key={city} title={city}>
            <ListCard>
              {servers.map((s) => (
                <ServerRow key={s.id} server={s} />
              ))}
            </ListCard>
          </Section>
        ))
      )}
    </Screen>
  );
}
