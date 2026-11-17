import type { ApiError, ApiResult, Swit4Api } from "./contracts";

/** HTTP-клиент к собственному backend (VITE_API_BASE_URL). Не содержит секретов. */
export function createHttpApi(baseUrl: string, timeoutMs = 10_000): Swit4Api {
  const base = baseUrl.replace(/\/$/, "");

  async function req<T>(method: string, path: string, body?: unknown): Promise<ApiResult<T>> {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(`${base}/api/v1${path}`, {
        method,
        headers: body ? { "content-type": "application/json" } : {},
        body: body ? JSON.stringify(body) : null,
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const retry = Number(res.headers.get("retry-after")) || undefined;
        const code: ApiError["code"] = res.status === 429 ? "RATE_LIMITED" : res.status === 404 ? "NOT_FOUND" : res.status === 413 ? "TOO_LARGE" : res.status === 422 || res.status === 400 ? "VALIDATION" : "SERVER";
        let message = `HTTP ${res.status}`;
        try {
          const j = (await res.json()) as { error?: { message?: string } };
          message = j.error?.message ?? message;
        } catch {
          /* empty */
        }
        return { ok: false, error: { code, message, retryAfterSec: retry } };
      }
      return { ok: true, data: (await res.json()) as T };
    } catch (e) {
      const aborted = e instanceof DOMException && e.name === "AbortError";
      return { ok: false, error: { code: aborted ? "TIMEOUT" : "NETWORK", message: aborted ? "Request timed out" : "Network error" } };
    } finally {
      clearTimeout(timer);
    }
  }

  return {
    isDemo: false,
    listServers: (p) => req("GET", `/servers${p ? `?${new URLSearchParams(Object.entries(p).filter(([, v]) => v) as [string, string][])}` : ""}`),
    listCountries: () => req("GET", "/countries"),
    listSubscriptions: () => req("GET", "/subscriptions"),
    createSubscription: (input) => req("POST", "/subscriptions", input),
    updateSubscription: (id, patch) => req("PATCH", `/subscriptions/${encodeURIComponent(id)}`, patch),
    deleteSubscription: (id) => req("DELETE", `/subscriptions/${encodeURIComponent(id)}`),
    refreshSubscription: (id) => req("POST", `/subscriptions/${encodeURIComponent(id)}/refresh`),
    createScan: (input) => req("POST", "/scans", input),
    getScan: (id) => req("GET", `/scans/${encodeURIComponent(id)}`),
    getAppVersion: () => req("GET", "/app/version"),
    health: () => req("GET", "/health"),
  };
}
