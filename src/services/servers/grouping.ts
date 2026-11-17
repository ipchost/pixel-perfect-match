import type { CountryGroup, Server } from "@/types";
import { getCountry } from "@/mocks/countries";

const AVAILABLE = new Set(["available", "slow"]);

export function groupByCountry(servers: Server[], locale: "ru" | "en" = "ru"): CountryGroup[] {
  const map = new Map<string, Server[]>();
  for (const s of servers) {
    const list = map.get(s.countryCode) ?? [];
    list.push(s);
    map.set(s.countryCode, list);
  }
  const groups: CountryGroup[] = [];
  for (const [code, list] of map) {
    const cities = new Map<string, Server[]>();
    for (const s of list) {
      const c = cities.get(s.city) ?? [];
      c.push(s);
      cities.set(s.city, c);
    }
    const latencies = list.map((s) => (s.lastProbe?.success ? s.lastProbe.latencyMs : null)).filter((v): v is number => v !== null);
    groups.push({
      country: getCountry(code),
      cities: [...cities.entries()].map(([city, servers]) => ({ city, servers: servers.sort((a, b) => a.name.localeCompare(b.name)) })),
      total: list.length,
      available: list.filter((s) => AVAILABLE.has(s.status)).length,
      bestLatencyMs: latencies.length ? Math.min(...latencies) : null,
    });
  }
  return groups.sort((a, b) => (locale === "ru" ? a.country.nameRu : a.country.nameEn).localeCompare(locale === "ru" ? b.country.nameRu : b.country.nameEn, locale));
}

export function isWorking(s: Server) {
  return AVAILABLE.has(s.status);
}
