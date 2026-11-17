export type ConnectionPhase =
  | "disconnected"
  | "fetching_servers"
  | "searching"
  | "probing"
  | "selecting_best"
  | "requesting_permission"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnecting"
  | "error";

export type ConnectionMode = "auto" | "manual";

export interface TrafficSample {
  t: number; // epoch ms
  downBps: number;
  upBps: number;
}

export interface ConnectionStats {
  startedAt: number | null;
  bytesDown: number;
  bytesUp: number;
  downBps: number;
  upBps: number;
  samples: TrafficSample[];
  /** true — данные сгенерированы демо-движком, а не нативным Xray. */
  isDemo: boolean;
}

export interface ConnectionState {
  phase: ConnectionPhase;
  serverId: string | null;
  errorCode?: string | undefined;
  errorMessage?: string | undefined;
  stats: ConnectionStats;
}
