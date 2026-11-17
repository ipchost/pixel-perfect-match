import { messages, type Messages } from "./messages";
import { useAppStore } from "@/app/store";
import type { Locale } from "@/types";

export type { Messages };
export { pluralRu, pluralEn } from "./plural";

export function getMessages(locale: Locale): Messages {
  return messages[locale] ?? messages.ru;
}

/** Хук локализации: `const t = useT(); t.home.findWorking` */
export function useT(): Messages {
  const locale = useAppStore((s) => s.settings.ui.locale);
  return getMessages(locale);
}

export function useLocale(): Locale {
  return useAppStore((s) => s.settings.ui.locale);
}
