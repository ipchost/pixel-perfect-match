import type { Swit4Api } from "./contracts";
import { COUNTRIES } from "@/mocks/countries";
import { createDemoServers } from "@/mocks/servers";
import { createDemoSubscriptions } from "@/mocks/subscriptions";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** DEMO mock provider. Возвращает демо-данные с задержкой; ничего не отправляет в сеть. */
export function createMockApi(): Swit4Api {
  return {
    isDemo: true,
    async listServers() {
      await wait(400);
      return { ok: true, data: { items: createDemoServers(), nextCursor: null } };
    },
    async listCountries() {
      await wait(150);
      return { ok: true, data: COUNTRIES };
    },
    async listSubscriptions() {
      await wait(300);
      return { ok: true, data: createDemoSubscriptions() };
    },
    async createSubscription(input) {
      await wait(600);
      const now = new Date().toISOString();
      return {
        ok: true,
        data: { id: `sub_${Date.now().toString(36)}`, name: input.name, url: input.url, addedAt: now, lastUpdatedAt: null, refreshIntervalMin: input.refreshIntervalMin ?? 30, configCount: 0, availableCount: 0, status: "never_updated", enabled: true, errors: [], history: [], isDemo: true },
      };
    },
    async updateSubscription(id, patch) {
      await wait(250);
      const s = createDemoSubscriptions().find((x) => x.id === id);
      if (!s) return { ok: false, error: { code: "NOT_FOUND", message: "Subscription not found" } };
      return { ok: true, data: { ...s, ...patch } };
    },
    async deleteSubscription(id) {
      await wait(250);
      return { ok: true, data: { id } };
    },
    async refreshSubscription(id) {
      await wait(900 + Math.random() * 600);
      if (id === "sub_demo_alt" && Math.random() < 0.5) return { ok: false, error: { code: "RATE_LIMITED", message: "HTTP 429", retryAfterSec: 1800 } };
      const added = Math.random() < 0.4 ? Math.round(Math.random() * 2) : 0;
      const removed = Math.random() < 0.3 ? 1 : 0;
      return { ok: true, data: { added, removed, total: 0 } };
    },
    async createScan() {
      await wait(200);
      return { ok: false, error: { code: "UNAVAILABLE", message: "Server-side scans require a backend (see API_SPEC.md)" } };
    },
    async getScan() {
      return { ok: false, error: { code: "UNAVAILABLE", message: "Server-side scans require a backend" } };
    },
    async getAppVersion() {
      await wait(300);
      return {
        ok: true,
        data: {
          latest: "0.9.1",
          minSupported: "0.8.0",
          downloadUrl: null,
          changelog: [
            { version: "0.9.1", date: "2026-11-10", notes: ["DEMO: улучшен рейтинг серверов", "DEMO: экспорт выбранной подписки"] },
            { version: "0.9.0", date: "2026-10-28", notes: ["DEMO: режим ограниченной связи", "DEMO: сравнение серверов"] },
          ],
        },
      };
    },
    async health() {
      await wait(200);
      return { ok: false, error: { code: "UNAVAILABLE", message: "Backend not configured (demo)" } };
    },
  };
}
