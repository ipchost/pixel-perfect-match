export type SubscriptionStatus = "ok" | "updating" | "error" | "disabled" | "never_updated";

export interface SubscriptionLineError {
  line: number;
  /** Обезличенный фрагмент строки (секреты замаскированы). */
  preview: string;
  reason: string;
}

export interface SubscriptionHistoryEntry {
  at: string;
  added: number;
  removed: number;
  total: number;
  isDemo: boolean;
}

export interface Subscription {
  id: string;
  name: string;
  /** Полный URL. СЕКРЕТ: в UI показывать только maskUrl(url). */
  url: string;
  addedAt: string;
  lastUpdatedAt: string | null;
  /** Интервал обновления в минутах (по умолчанию 30). */
  refreshIntervalMin: number;
  configCount: number;
  availableCount: number;
  status: SubscriptionStatus;
  enabled: boolean;
  errors: SubscriptionLineError[];
  lastError?: string | undefined;
  history: SubscriptionHistoryEntry[];
  etag?: string | undefined;
  lastModified?: string | undefined;
  isDemo: boolean;
}

export type NetworkPolicy = "wifi_only" | "any" | "no_roaming";
