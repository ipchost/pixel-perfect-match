import { useLocale } from "@/localization";

/** Краткий двуязычный хелпер для экранных строк: L("Русский", "English"). */
export function useL() {
  const locale = useLocale();
  return (ru: string, en: string) => (locale === "en" ? en : ru);
}
