import type { Swit4Api } from "./contracts";
import { createHttpApi } from "./http-client";
import { createMockApi } from "./mock-client";

export * from "./contracts";

let instance: Swit4Api | null = null;

/** Если VITE_API_BASE_URL задан — реальный backend, иначе DEMO mock provider. */
export function getApi(): Swit4Api {
  if (instance) return instance;
  const base = import.meta.env["VITE_API_BASE_URL"] as string | undefined;
  instance = base ? createHttpApi(base) : createMockApi();
  return instance;
}
