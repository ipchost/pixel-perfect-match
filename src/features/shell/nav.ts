import type { LinkProps } from "@tanstack/react-router";
import {
  BarChart3,
  Gauge,
  Heart,
  Home,
  Info,
  ListTree,
  Radar,
  Rss,
  ScrollText,
  Server,
  Settings,
  Stethoscope,
} from "lucide-react";

export interface NavItem {
  to: NonNullable<LinkProps["to"]>;
  ru: string;
  en: string;
  icon: typeof Home;
}

/** Пять основных разделов — нижняя навигация на телефоне. */
export const MAIN_NAV: NavItem[] = [
  { to: "/", ru: "Главная", en: "Home", icon: Home },
  { to: "/servers", ru: "Серверы", en: "Servers", icon: Server },
  { to: "/subscriptions", ru: "Подписки", en: "Sources", icon: Rss },
  { to: "/rules", ru: "Правила", en: "Rules", icon: ListTree },
  { to: "/settings", ru: "Настройки", en: "Settings", icon: Settings },
];

/** Дополнительные разделы — в боковой панели на планшете и в меню «Ещё». */
export const EXTRA_NAV: NavItem[] = [
  { to: "/scan", ru: "Сканирование", en: "Scan", icon: Radar },
  { to: "/favorites", ru: "Избранное", en: "Favorites", icon: Heart },
  { to: "/statistics", ru: "Статистика", en: "Statistics", icon: BarChart3 },
  { to: "/diagnostics", ru: "Диагностика", en: "Diagnostics", icon: Stethoscope },
  { to: "/events", ru: "Журнал событий", en: "Event log", icon: ScrollText },
  { to: "/compare", ru: "Сравнение", en: "Compare", icon: Gauge },
  { to: "/about", ru: "О приложении", en: "About", icon: Info },
];
