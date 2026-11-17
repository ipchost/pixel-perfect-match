import { useAppStore } from "@/app/store";
import { maskSecrets, maskUrl } from "@/services/parsers/mask";
import type { DiagnosticsSnapshot } from "@/services/native/contracts";

/** Диагностический отчёт без секретов: URL подписок маскируются, конфигурации не включаются. */
export function buildDiagnosticReport(
  snapshot: DiagnosticsSnapshot | null,
  checks: Record<string, string>,
) {
  const s = useAppStore.getState();
  const report = {
    generatedAt: new Date().toISOString(),
    app: {
      name: "SWIT4",
      build: "web-prototype",
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    },
    isDemo: true,
    snapshot,
    checks,
    connection: { phase: s.connection.phase, errorCode: s.connection.errorCode ?? null },
    settings: { ...s.settings, dns: { ...s.settings.dns } },
    counts: {
      servers: s.servers.length,
      subscriptions: s.subscriptions.length,
      favorites: s.favorites.length,
      domainRules: s.domainRules.length,
      routingMode: s.routing.mode,
    },
    subscriptions: s.subscriptions.map((x) => ({
      name: x.name,
      url: maskUrl(x.url),
      status: x.status,
      configCount: x.configCount,
      lastError: x.lastError ? maskSecrets(x.lastError) : null,
    })),
    recentEvents: s.events
      .slice(0, 50)
      .map((e) => ({
        at: e.at,
        level: e.level,
        category: e.category,
        message: maskSecrets(e.message),
      })),
  };
  return JSON.stringify(report, null, 2);
}
