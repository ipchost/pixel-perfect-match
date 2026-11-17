# Интеграция с Android

Нативное приложение (Kotlin) реализует интерфейсы из `src/services/native/contracts.ts` и либо внедряет их в WebView как `window.SWIT4Native`, либо использует как спецификацию для Compose-UI.

| Контракт | Android-реализация |
|---|---|
| ConnectionManager | `VpnService` + foreground notification; `VpnService.prepare()` для разрешения |
| XrayEngine | Xray-core (libXray / AndroidLibXrayLite), валидация JSON-конфига |
| ServerScanner | TCP connect / TLS handshake / proxy handshake / контрольный endpoint с лимитом трафика |
| InstalledAppsRepository | `PackageManager.getInstalledApplications` (список не уходит на backend) |
| RoutingManager | `VpnService.Builder.addAllowedApplication()` / `addDisallowedApplication()` — режимы не смешиваются, применяются до `establish()` |
| ExportManager | Android Sharesheet, SAF, ClipboardManager (с `EXTRA_IS_SENSITIVE`) |
| DiagnosticsManager | ConnectivityManager, DNS/IPv6 проверки |
| SubscriptionRepository / ServerRepository / StatisticsRepository | Room + WorkManager (обновления не гарантированно каждые 30 мин) |

## Особенности
- Удалённые/отсутствующие пакеты пропускаются с предупреждением; собственный пакет `app.swit4.android` не может попасть в списки.
- Применение новых правил требует подтверждения и переподключения.
- Kill switch — только через системные «Постоянная VPN» + «Блокировать без VPN», с явным согласием.
- Будущие функции: Quick Settings Tile, home-screen widget, deep links импорта с подтверждением.
