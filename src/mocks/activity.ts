import type { AppEvent, DailyTraffic, SessionRecord } from "@/types";
import { seeded } from "@/lib/random";

export function createDemoEvents(now = Date.now()): AppEvent[] {
  const ago = (min: number) => new Date(now - min * 60_000).toISOString();
  const e = (
    id: string,
    min: number,
    level: AppEvent["level"],
    category: AppEvent["category"],
    message: string,
    read = true,
  ): AppEvent => ({ id, at: ago(min), level, category, message, read, isDemo: true });
  return [
    e(
      "ev_demo_1",
      14,
      "success",
      "subscription",
      "Подписка «Основная подписка» обновлена: +1 сервер",
      false,
    ),
    e("ev_demo_2", 52, "info", "scan", "Сканирование завершено: 14 рабочих из 22", false),
    e(
      "ev_demo_3",
      60 * 3,
      "error",
      "subscription",
      "«Резервный провайдер»: HTTP 429, следующая попытка через 30 мин",
    ),
    e(
      "ev_demo_4",
      60 * 5,
      "warning",
      "connection",
      "Потеря соединения с Frankfurt 02, переподключение",
    ),
    e("ev_demo_5", 60 * 5 + 1, "success", "connection", "Подключено: Amsterdam 01"),
    e("ev_demo_6", 60 * 26, "info", "update", "Доступна версия SWIT4 0.9.1 — см. журнал изменений"),
  ];
}

export function createDemoSessions(now = Date.now()): SessionRecord[] {
  const rand = seeded(777);
  const list: Array<[string, string, string]> = [
    ["srv_demo_05", "Amsterdam 01", "NL"],
    ["srv_demo_01", "Frankfurt 01", "DE"],
    ["srv_demo_08", "Helsinki 01", "FI"],
    ["srv_demo_02", "Frankfurt 02", "DE"],
    ["srv_demo_14", "London 01", "GB"],
    ["srv_demo_05", "Amsterdam 01", "NL"],
    ["srv_demo_19", "Tokyo 01", "JP"],
  ];
  const reasons: SessionRecord["endReason"][] = [
    "user",
    "user",
    "network_lost",
    "switched",
    "user",
    "error",
    "user",
  ];
  let cursor = now - 40 * 60_000;
  return list.map(([serverId, serverName, countryCode], i) => {
    const dur = (20 + rand() * 160) * 60_000;
    const endedAt = cursor;
    const startedAt = endedAt - dur;
    cursor = startedAt - (60 + rand() * 600) * 60_000;
    return {
      id: `ses_demo_${i}`,
      serverId,
      serverName,
      countryCode,
      startedAt: new Date(startedAt).toISOString(),
      endedAt: new Date(endedAt).toISOString(),
      bytesDown: Math.round((50 + rand() * 900) * 1024 * 1024),
      bytesUp: Math.round((5 + rand() * 90) * 1024 * 1024),
      endReason: reasons[i] ?? "user",
      isDemo: true,
    };
  });
}

export function createDemoDaily(now = Date.now()): DailyTraffic[] {
  const rand = seeded(1312);
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date(now - (29 - i) * 86_400_000);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    return {
      date: d.toISOString().slice(0, 10),
      bytesDown: Math.round((weekend ? 900 : 450) * (0.4 + rand()) * 1024 * 1024),
      bytesUp: Math.round((weekend ? 120 : 70) * (0.4 + rand()) * 1024 * 1024),
      sessions: Math.round(1 + rand() * 5),
      isDemo: true,
    };
  });
}
