import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { EMPTY_CATALOG_STATE, type CatalogSourceState } from "@/types/catalog";
import type {
  AppEvent,
  AppRoutingConfig,
  AppSettings,
  ConnectionState,
  DailyTraffic,
  DomainRule,
  InstalledApp,
  LimitedModeProfile,
  RuleProfileId,
  ScanProgress,
  ScanResultItem,
  Server,
  SessionRecord,
  Subscription,
} from "@/types";
import { DEFAULT_ROUTING, DEFAULT_SETTINGS, INITIAL_CONNECTION } from "./defaults";
import {
  createDemoDaily,
  createDemoEvents,
  createDemoLimitedProfile,
  createDemoRules,
  createDemoServers,
  createDemoSessions,
  createDemoSubscriptions,
} from "@/mocks";
import { maskSecrets } from "@/services/parsers/mask";
import { uid } from "@/lib/random";

/**
 * Единое клиентское хранилище SWIT4 (zustand + localStorage).
 * Локальные правила, списки приложений и приватные конфигурации хранятся ТОЛЬКО на устройстве.
 * Фичи могут добавлять собственные мутации через useAppStore.setState в src/features/<x>/actions.ts.
 */
export interface AppState {
  hydrated: boolean;
  seeded: boolean;

  settings: AppSettings;
  servers: Server[];
  subscriptions: Subscription[];
  /** Состояние встроенного каталога источников (по id источника). */
  catalog: Record<string, CatalogSourceState>;
  favorites: string[];
  /** id последнего сервера, к которому удалось подключиться (резервный профиль). */
  lastWorkingServerId: string | null;

  routing: AppRoutingConfig;
  domainRules: DomainRule[];
  limited: LimitedModeProfile;
  activeProfile: RuleProfileId;

  events: AppEvent[];
  sessions: SessionRecord[];
  daily: DailyTraffic[];
  connectionsCount: number;
  autoSwitchLog: number[];

  /** Не сохраняется: живое состояние соединения. */
  connection: ConnectionState;
  /** Не сохраняется: список приложений приходит из bridge. */
  installedApps: InstalledApp[] | null;
  scan: ScanProgress | null;
  permissionPromptOpen: boolean;

  // actions
  patchSettings: <K extends keyof AppSettings>(
    section: K,
    patch: AppSettings[K] extends object ? Partial<AppSettings[K]> : AppSettings[K],
  ) => void;
  setConnection: (patch: Partial<ConnectionState>) => void;

  upsertServers: (servers: Server[]) => void;
  updateServer: (id: string, patch: Partial<Server>) => void;
  removeServers: (ids: string[]) => void;
  toggleFavorite: (id: string) => void;
  setExcludedFromAuto: (id: string, excluded: boolean) => void;
  applyScanResult: (item: ScanResultItem) => void;
  setScan: (scan: ScanProgress | null) => void;

  addSubscription: (sub: Subscription) => void;
  updateSubscription: (id: string, patch: Partial<Subscription>) => void;
  removeSubscription: (id: string) => void;
  patchCatalog: (id: string, patch: Partial<CatalogSourceState>) => void;

  setRouting: (patch: Partial<AppRoutingConfig>) => void;
  setDomainRules: (rules: DomainRule[]) => void;
  setLimited: (patch: Partial<LimitedModeProfile>) => void;
  setActiveProfile: (p: RuleProfileId) => void;
  setInstalledApps: (apps: InstalledApp[]) => void;

  addEvent: (e: Omit<AppEvent, "id" | "at" | "read" | "isDemo"> & { isDemo?: boolean }) => void;
  markEventsRead: () => void;
  clearEvents: () => void;
  addSession: (s: SessionRecord) => void;
  clearHistory: () => void;

  seedDemo: () => void;
  clearAllLocalData: () => void;
}

export const STORAGE_KEY = "swit4-state-v1";

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      seeded: false,
      settings: DEFAULT_SETTINGS,
      servers: [],
      subscriptions: [],
      catalog: {},
      favorites: [],
      lastWorkingServerId: null,
      routing: DEFAULT_ROUTING,
      domainRules: [],
      limited: createDemoLimitedProfile(),
      activeProfile: "normal",
      events: [],
      sessions: [],
      daily: [],
      connectionsCount: 0,
      autoSwitchLog: [],
      connection: INITIAL_CONNECTION,
      installedApps: null,
      scan: null,
      permissionPromptOpen: false,

      patchSettings: (section, patch) =>
        set((s) => ({
          settings: {
            ...s.settings,
            [section]:
              typeof patch === "object" && patch !== null
                ? { ...(s.settings[section] as object), ...(patch as object) }
                : patch,
          },
        })),
      setConnection: (patch) => set((s) => ({ connection: { ...s.connection, ...patch } })),

      upsertServers: (servers) =>
        set((s) => {
          const map = new Map(s.servers.map((x) => [x.id, x]));
          servers.forEach((x) => map.set(x.id, { ...map.get(x.id), ...x }));
          return { servers: [...map.values()] };
        }),
      patchCatalog: (id, patch) =>
        set((s) => ({
          catalog: {
            ...s.catalog,
            [id]: { ...EMPTY_CATALOG_STATE, ...s.catalog[id], ...patch },
          },
        })),
      updateServer: (id, patch) =>
        set((s) => ({ servers: s.servers.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      removeServers: (ids) => {
        const del = new Set(ids);
        set((s) => ({
          servers: s.servers.filter((x) => !del.has(x.id)),
          favorites: s.favorites.filter((f) => !del.has(f)),
        }));
      },
      toggleFavorite: (id) =>
        set((s) => ({
          favorites: s.favorites.includes(id)
            ? s.favorites.filter((f) => f !== id)
            : [id, ...s.favorites],
        })),
      setExcludedFromAuto: (id, excluded) => get().updateServer(id, { excludedFromAuto: excluded }),
      applyScanResult: (item) =>
        set((s) => ({
          servers: s.servers.map((x) => {
            if (x.id !== item.serverId) return x;
            const probe = {
              latencyMs: item.latencyMs,
              method: item.method,
              downloadMbps: item.downloadMbps,
              uploadMbps: item.uploadMbps,
              checkedAt: item.checkedAt,
              success: item.status !== "unavailable" && item.status !== "config_error",
              errorCode: item.errorCode,
            };
            return {
              ...x,
              status: item.status,
              lastProbe: probe,
              probeHistory: [probe, ...x.probeHistory].slice(0, 12),
            };
          }),
        })),
      setScan: (scan) => set({ scan }),

      addSubscription: (sub) => set((s) => ({ subscriptions: [sub, ...s.subscriptions] })),
      updateSubscription: (id, patch) =>
        set((s) => ({
          subscriptions: s.subscriptions.map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),
      removeSubscription: (id) =>
        set((s) => {
          const fav = new Set(s.favorites);
          return {
            subscriptions: s.subscriptions.filter((x) => x.id !== id),
            // Избранное переживает удаление источника: помечаем, а не удаляем молча.
            servers: s.servers
              .filter((x) => x.subscriptionId !== id || fav.has(x.id))
              .map((x) => (x.subscriptionId === id ? { ...x, missingFromSource: true } : x)),
          };
        }),

      setRouting: (patch) => set((s) => ({ routing: { ...s.routing, ...patch } })),
      setDomainRules: (domainRules) => set({ domainRules }),
      setLimited: (patch) => set((s) => ({ limited: { ...s.limited, ...patch } })),
      setActiveProfile: (activeProfile) => set({ activeProfile }),
      setInstalledApps: (installedApps) => set({ installedApps }),

      addEvent: (e) =>
        set((s) => ({
          events: [
            {
              id: uid("ev"),
              at: new Date().toISOString(),
              read: false,
              isDemo: e.isDemo ?? true,
              level: e.level,
              category: e.category,
              message: maskSecrets(e.message),
            },
            ...s.events,
          ].slice(0, 300),
        })),
      markEventsRead: () => set((s) => ({ events: s.events.map((e) => ({ ...e, read: true })) })),
      clearEvents: () => set({ events: [] }),
      addSession: (rec) =>
        set((s) => ({
          sessions: [rec, ...s.sessions].slice(0, 200),
          connectionsCount: s.connectionsCount + 1,
        })),
      clearHistory: () => set({ sessions: [], daily: [], events: [], connectionsCount: 0 }),

      seedDemo: () => {
        const now = Date.now();
        set({
          seeded: true,
          servers: createDemoServers(now),
          subscriptions: createDemoSubscriptions(now),
          favorites: ["srv_demo_05", "srv_demo_01", "srv_demo_25"],
          lastWorkingServerId: "srv_demo_05",
          domainRules: createDemoRules(),
          limited: createDemoLimitedProfile(),
          events: createDemoEvents(now),
          sessions: createDemoSessions(now),
          daily: createDemoDaily(now),
          connectionsCount: 37,
        });
      },
      clearAllLocalData: () => {
        set({
          seeded: true,
          settings: { ...DEFAULT_SETTINGS, onboardingDone: true },
          servers: [],
          subscriptions: [],
          favorites: [],
          lastWorkingServerId: null,
          routing: DEFAULT_ROUTING,
          domainRules: [],
          limited: { ...createDemoLimitedProfile(), allowedDomains: [], allowedIps: [], apps: [] },
          activeProfile: "normal",
          events: [],
          sessions: [],
          daily: [],
          connectionsCount: 0,
          scan: null,
          connection: INITIAL_CONNECTION,
        });
      },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
      partialize: (s) => ({
        seeded: s.seeded,
        settings: s.settings,
        servers: s.servers,
        subscriptions: s.subscriptions,
        catalog: s.catalog,
        favorites: s.favorites,
        lastWorkingServerId: s.lastWorkingServerId,
        routing: s.routing,
        domainRules: s.domainRules,
        limited: s.limited,
        activeProfile: s.activeProfile,
        events: s.events,
        sessions: s.sessions,
        daily: s.daily,
        connectionsCount: s.connectionsCount,
        scan: s.scan && (s.scan.stage === "done" || s.scan.stage === "cancelled") ? s.scan : null,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>;
        return {
          ...current,
          ...p,
          settings: {
            ...DEFAULT_SETTINGS,
            ...p.settings,
            connection: { ...DEFAULT_SETTINGS.connection, ...p.settings?.connection },
            scan: { ...DEFAULT_SETTINGS.scan, ...p.settings?.scan },
            subscriptions: { ...DEFAULT_SETTINGS.subscriptions, ...p.settings?.subscriptions },
            dns: { ...DEFAULT_SETTINGS.dns, ...p.settings?.dns },
            ui: { ...DEFAULT_SETTINGS.ui, ...p.settings?.ui },
            privacy: { ...DEFAULT_SETTINGS.privacy, ...p.settings?.privacy },
          },
        };
      },
    },
  ),
);

/** Вызывается один раз на клиенте (AppProviders). */
export async function hydrateStore() {
  await useAppStore.persist.rehydrate();
  const s = useAppStore.getState();
  if (!s.seeded) s.seedDemo();
  useAppStore.setState({ hydrated: true });
}

// Selectors
export const selectServerById = (id: string | null) => (s: AppState) =>
  id ? (s.servers.find((x) => x.id === id) ?? null) : null;
export const selectIsFavorite = (id: string) => (s: AppState) => s.favorites.includes(id);
export const selectUnreadEvents = (s: AppState) => s.events.filter((e) => !e.read).length;
