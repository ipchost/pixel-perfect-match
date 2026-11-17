import type { InstalledApp } from "@/types";

/** DEMO: браузер не видит приложения устройства. В нативной версии — PackageManager. */
const RAW: Array<[string, string, boolean, string]> = [
  ["org.telegram.messenger", "Telegram", false, "message"],
  ["com.whatsapp", "WhatsApp", false, "phone"],
  ["com.google.android.youtube", "YouTube", false, "play"],
  ["com.android.chrome", "Chrome", false, "globe"],
  ["org.mozilla.firefox", "Firefox", false, "globe"],
  ["com.instagram.android", "Instagram", false, "camera"],
  ["com.spotify.music", "Spotify", false, "music"],
  ["com.discord", "Discord", false, "message"],
  ["com.twitter.android", "X", false, "feed"],
  ["ru.sberbankmobile", "СберБанк", false, "bank"],
  ["com.yandex.browser", "Яндекс Браузер", false, "globe"],
  ["ru.yandex.taxi", "Яндекс Go", false, "car"],
  ["com.netflix.mediaclient", "Netflix", false, "play"],
  ["com.google.android.gm", "Gmail", false, "mail"],
  ["com.google.android.apps.maps", "Google Maps", false, "map"],
  ["com.valvesoftware.android.steam.community", "Steam", false, "game"],
  ["com.github.android", "GitHub", false, "code"],
  ["com.android.vending", "Google Play", true, "store"],
  ["com.google.android.gms", "Сервисы Google Play", true, "cog"],
  ["com.android.settings", "Настройки", true, "cog"],
  ["com.android.systemui", "Системный интерфейс", true, "cog"],
  ["com.google.android.webview", "Android System WebView", true, "globe"],
  ["com.android.providers.downloads", "Диспетчер загрузок", true, "download"],
  ["app.swit4.android", "SWIT4", false, "swit4"],
];

export const SWIT4_PACKAGE = "app.swit4.android";

export function createDemoApps(): InstalledApp[] {
  return RAW.map(([packageName, label, isSystem, iconKey]) => ({
    packageName,
    label,
    isSystem,
    iconKey,
    isDemo: true,
  }));
}
