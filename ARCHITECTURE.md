# Архитектура SWIT4 (веб-прототип)

```text
src/
  app/            store.ts (единый Zustand-store, persist), defaults.ts
  types/          доменные типы: server, subscription, connection, routing, scan, events, settings
  mocks/          DEMO-данные (.example домены, сгенерированные ключи)
  services/
    api/          contracts.ts, http-client.ts, mock-client.ts, getApi()
    native/       contracts.ts (NativeBridge), demo-bridge.ts, getBridge()
    scanner/      scanner.ts (пул воркеров, тайм-ауты, отмена), controller.ts
    connection/   controller.ts (фазы соединения, разрешение VPN, сессии)
    parsers/      uri.ts (VLESS/VMess/Trojan/SS, base64, дедупликация), mask.ts
    export/       exporters.ts (URI, Xray JSON, совместимость клиентов)
    servers/      grouping.ts, rating.ts (рейтинг, устаревание, защита от циклов)
  features/       экранная логика по фичам: shell, home, servers, subscriptions, export, rules, stats
  components/swit4  бренд-компоненты (Logo, Screen, StatusBadge, LatencyValue, DemoBadge…)
  localization/   ru/en сообщения; lib/i18n.ts — короткий хелпер L(ru, en)
  routes/         файловые маршруты TanStack Router
```

## Принципы
- **Один store.** Фичи вызывают мутации store или пишут через `useAppStore.setState` в своих `features/*/actions.ts`.
- **Bridge-first.** Всё, что требует устройства (VPN, приложения, Xray, share sheet), идёт через `getBridge()`. Если Android внедрил `window.SWIT4Native`, используется он, иначе DEMO.
- **Честные метрики.** Каждая задержка хранит метод (`ProbeMethod`); скорость `null`, если тест не выполнялся.
- **Секреты локально.** URL подписок маскируются (`maskUrl`), журнал проходит `maskSecrets`, экспорт требует подтверждения.
- **Гидратация.** Store не гидратируется на сервере (`skipHydration`), `AppShell` показывает заставку до `hydrateStore()`.
