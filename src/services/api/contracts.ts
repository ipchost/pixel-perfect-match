/** API-контракты SWIT4 backend. Полная спецификация — API_SPEC.md. */
import type { Country, Server, Subscription, ScanOptions, ScanProgress } from "@/types";

export interface Paginated<T> {
  items: T[];
  nextCursor: string | null;
}

export interface ApiError {
  code: "NETWORK" | "TIMEOUT" | "RATE_LIMITED" | "NOT_FOUND" | "VALIDATION" | "SSRF_BLOCKED" | "TOO_LARGE" | "SERVER" | "UNAVAILABLE";
  message: string;
  retryAfterSec?: number | undefined;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export interface CreateSubscriptionInput {
  name: string;
  url: string;
  refreshIntervalMin?: number | undefined;
}

export interface AppVersionInfo {
  latest: string;
  minSupported: string;
  changelog: { version: string; date: string; notes: string[] }[];
  downloadUrl: string | null;
}

export interface HealthInfo {
  status: "ok" | "degraded" | "down";
  time: string;
  workers: { subscriptions: "ok" | "lagging" | "down" };
}

export interface Swit4Api {
  readonly isDemo: boolean;
  listServers(params?: { country?: string | undefined; protocol?: string | undefined; cursor?: string }): Promise<ApiResult<Paginated<Server>>> | undefined;
  listCountries(): Promise<ApiResult<Country[]>>;
  listSubscriptions(): Promise<ApiResult<Subscription[]>>;
  createSubscription(input: CreateSubscriptionInput): Promise<ApiResult<Subscription>>;
  updateSubscription(id: string, patch: Partial<Pick<Subscription, "name" | "url" | "enabled" | "refreshIntervalMin">>): Promise<ApiResult<Subscription>>;
  deleteSubscription(id: string): Promise<ApiResult<{ id: string }>>;
  refreshSubscription(id: string): Promise<ApiResult<{ added: number; removed: number; total: number }>>;
  createScan(input: { serverIds: string[]; options: ScanOptions }): Promise<ApiResult<{ id: string }>>;
  getScan(id: string): Promise<ApiResult<ScanProgress>>;
  getAppVersion(): Promise<ApiResult<AppVersionInfo>>;
  health(): Promise<ApiResult<HealthInfo>>;
}
