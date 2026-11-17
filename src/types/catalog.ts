/** Фактический тип содержимого источника — определяется по загруженному тексту, не по имени. */
export type CatalogContentKind = "servers" | "routing" | "unsupported" | "empty" | "unknown";

export type CatalogSourceStatus = "idle" | "loading" | "ok" | "error";

export interface CatalogSourceState {
  enabled: boolean;
  status: CatalogSourceStatus;
  kind: CatalogContentKind;
  lastFetchedAt: string | null;
  /** Индекс зеркала, с которого удалось загрузить. */
  mirrorIndex: number | null;
  serverCount: number;
  ruleCount: number;
  /** Причина ошибки (без секретов). */
  error: string | null;
}

export const EMPTY_CATALOG_STATE: CatalogSourceState = {
  enabled: false,
  status: "idle",
  kind: "unknown",
  lastFetchedAt: null,
  mirrorIndex: null,
  serverCount: 0,
  ruleCount: 0,
  error: null,
};
