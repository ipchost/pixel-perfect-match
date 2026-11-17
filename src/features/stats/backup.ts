import { useAppStore } from "@/app/store";

const BACKUP_VERSION = 1;

/** Резервная копия настроек и правил (без серверов и подписок — в них секреты). */
export function buildBackup() {
  const s = useAppStore.getState();
  return JSON.stringify(
    {
      app: "swit4",
      version: BACKUP_VERSION,
      createdAt: new Date().toISOString(),
      settings: s.settings,
      routing: s.routing,
      domainRules: s.domainRules,
      limited: s.limited,
      activeProfile: s.activeProfile,
    },
    null,
    2,
  );
}

export function restoreBackup(text: string): { ok: true } | { ok: false; reason: string } {
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { ok: false, reason: "invalid_json" };
  }
  if (data["app"] !== "swit4" || data["version"] !== BACKUP_VERSION)
    return { ok: false, reason: "wrong_format" };
  const cur = useAppStore.getState();
  useAppStore.setState({
    settings: { ...cur.settings, ...(data["settings"] as object), onboardingDone: true },
    routing: { ...cur.routing, ...(data["routing"] as object) },
    domainRules: Array.isArray(data["domainRules"])
      ? (data["domainRules"] as typeof cur.domainRules)
      : cur.domainRules,
    limited: { ...cur.limited, ...(data["limited"] as object) },
  });
  return { ok: true };
}
