import type { ProbeMethod, ServerStatus } from "./server";

export type ScanStage =
  | "idle"
  | "fetching"
  | "normalizing"
  | "validating"
  | "probing"
  | "measuring"
  | "throughput"
  | "done"
  | "cancelled"
  | "error";

export interface ScanOptions {
  concurrency: number; // одновременных проверок
  timeoutMs: number;
  /** Лимит трафика на один тест скорости, байты. */
  throughputBytesLimit: number;
  method: ProbeMethod;
  onlyActiveSources: boolean;
  includeFavorites: boolean;
  runThroughput: boolean;
}

export interface ScanResultItem {
  serverId: string;
  status: ServerStatus;
  latencyMs: number | null;
  method: ProbeMethod;
  downloadMbps: number | null;
  uploadMbps: number | null;
  checkedAt: string;
  sourceName: string;
  errorCode?: string | undefined;
  isDemo: boolean;
}

export interface ScanProgress {
  id: string;
  stage: ScanStage;
  total: number;
  done: number;
  duplicatesRemoved: number;
  invalidConfigs: number;
  startedAt: string;
  finishedAt: string | null;
  results: ScanResultItem[];
  isDemo: boolean;
}

export type ScanFilter = "all" | "working" | "fast" | "unstable" | "unchecked";
export type ScanSort = "latency" | "speed" | "country" | "stability";
