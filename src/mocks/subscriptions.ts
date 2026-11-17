import type { Subscription } from "@/types";

export function createDemoSubscriptions(now = Date.now()): Subscription[] {
  const ago = (min: number) => new Date(now - min * 60_000).toISOString();
  return [
    {
      id: "sub_demo_main",
      name: "Основная подписка",
      url: "https://sub.demo-swit4.example/api/v1/client/subscribe?token=DEMO0123456789abcdefTOKEN",
      addedAt: ago(60 * 24 * 12),
      lastUpdatedAt: ago(14),
      refreshIntervalMin: 30,
      configCount: 15,
      availableCount: 11,
      status: "ok",
      enabled: true,
      errors: [],
      history: [
        { at: ago(14), added: 1, removed: 0, total: 15, isDemo: true },
        { at: ago(44), added: 0, removed: 2, total: 14, isDemo: true },
        { at: ago(60 * 5), added: 3, removed: 1, total: 16, isDemo: true },
      ],
      etag: 'W/"demo-etag-7f3a"',
      isDemo: true,
    },
    {
      id: "sub_demo_alt",
      name: "Резервный провайдер",
      url: "https://alt.demo-swit4.example/s/7Hq2kLmN9pQrStUvWxYz",
      addedAt: ago(60 * 24 * 3),
      lastUpdatedAt: ago(60 * 3),
      refreshIntervalMin: 30,
      configCount: 10,
      availableCount: 4,
      status: "error",
      enabled: true,
      lastError: "HTTP 429 — источник ограничил частоту запросов",
      errors: [
        { line: 7, preview: "vmess://•••[скрыто]", reason: "invalid_base64" },
        { line: 12, preview: "socks://10.0.0.1:1080", reason: "unsupported_scheme" },
      ],
      history: [{ at: ago(60 * 3), added: 0, removed: 1, total: 10, isDemo: true }],
      isDemo: true,
    },
    {
      id: "sub_demo_off",
      name: "Тестовая (отключена)",
      url: "https://test.demo-swit4.example/list.txt",
      addedAt: ago(60 * 24 * 30),
      lastUpdatedAt: null,
      refreshIntervalMin: 60,
      configCount: 0,
      availableCount: 0,
      status: "disabled",
      enabled: false,
      errors: [],
      history: [],
      isDemo: true,
    },
  ];
}
