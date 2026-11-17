export type EventLevel = "info" | "success" | "warning" | "error";
export type EventCategory =
  | "connection"
  | "subscription"
  | "scan"
  | "routing"
  | "system"
  | "update";

export interface AppEvent {
  id: string;
  at: string;
  level: EventLevel;
  category: EventCategory;
  /** Сообщение уже прошло через maskSecrets(). */
  message: string;
  read: boolean;
  isDemo: boolean;
}

export interface SessionRecord {
  id: string;
  serverId: string;
  serverName: string;
  countryCode: string;
  startedAt: string;
  endedAt: string;
  bytesDown: number;
  bytesUp: number;
  endReason: "user" | "network_lost" | "error" | "switched";
  isDemo: boolean;
}

export interface DailyTraffic {
  date: string; // YYYY-MM-DD
  bytesDown: number;
  bytesUp: number;
  sessions: number;
  isDemo: boolean;
}
