import type { Country } from "@/types";

export const COUNTRIES: Country[] = [
  { code: "DE", nameRu: "Германия", nameEn: "Germany" },
  { code: "NL", nameRu: "Нидерланды", nameEn: "Netherlands" },
  { code: "FI", nameRu: "Финляндия", nameEn: "Finland" },
  { code: "SE", nameRu: "Швеция", nameEn: "Sweden" },
  { code: "PL", nameRu: "Польша", nameEn: "Poland" },
  { code: "FR", nameRu: "Франция", nameEn: "France" },
  { code: "GB", nameRu: "Великобритания", nameEn: "United Kingdom" },
  { code: "US", nameRu: "США", nameEn: "United States" },
  { code: "JP", nameRu: "Япония", nameEn: "Japan" },
  { code: "SG", nameRu: "Сингапур", nameEn: "Singapore" },
  { code: "TR", nameRu: "Турция", nameEn: "Türkiye" },
  { code: "KZ", nameRu: "Казахстан", nameEn: "Kazakhstan" },
  { code: "AM", nameRu: "Армения", nameEn: "Armenia" },
  { code: "CH", nameRu: "Швейцария", nameEn: "Switzerland" },
];

const byCode = new Map(COUNTRIES.map((c) => [c.code, c]));

export function getCountry(code: string): Country {
  if (code.toUpperCase() === "XX")
    return { code: "XX", nameRu: "Неизвестная страна", nameEn: "Unknown country" } as Country;
  return (
    byCode.get(code.toUpperCase()) ?? {
      code: code.toUpperCase(),
      nameRu: code.toUpperCase(),
      nameEn: code.toUpperCase(),
    }
  );
}

/** Эвристика определения страны по имени сервера/флагу-эмодзи. Возвращает "XX" если не найдено. */
export function guessCountry(name: string): string {
  const flag = [...name].filter((ch) => {
    const cp = ch.codePointAt(0) ?? 0;
    return cp >= 0x1f1e6 && cp <= 0x1f1ff;
  });
  if (flag.length >= 2) {
    return flag
      .slice(0, 2)
      .map((ch) => String.fromCharCode((ch.codePointAt(0) ?? 0) - 0x1f1e6 + 65))
      .join("");
  }
  const lower = name.toLowerCase();
  for (const c of COUNTRIES) {
    if (lower.includes(c.nameEn.toLowerCase()) || lower.includes(c.nameRu.toLowerCase()))
      return c.code;
  }
  const m = name.match(/\b([A-Z]{2})\b/);
  const code = m?.[1];
  if (code && byCode.has(code)) return code;
  return "XX";
}
