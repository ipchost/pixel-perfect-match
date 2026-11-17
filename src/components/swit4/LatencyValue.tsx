import type { ProbeResult } from "@/types";
import { cn } from "@/lib/utils";
import { useT } from "@/localization";
import { LATENCY_FAST_MS, LATENCY_SLOW_MS } from "@/services/servers/rating";

/** Задержка + метод измерения. Никогда не выдаёт TCP connect за ping. */
export function LatencyValue({
  probe,
  className,
  showMethod = true,
}: {
  probe: ProbeResult | null;
  className?: string;
  showMethod?: boolean;
}) {
  const t = useT();
  if (!probe || probe.latencyMs === null) {
    return (
      <span className={cn("text-sm text-muted-foreground", className)}>{t.common.notMeasured}</span>
    );
  }
  const tone =
    probe.latencyMs <= LATENCY_FAST_MS
      ? "text-status-ok"
      : probe.latencyMs <= LATENCY_SLOW_MS
        ? "text-foreground"
        : "text-status-slow";
  return (
    <span className={cn("inline-flex items-baseline gap-1.5", className)}>
      <span className={cn("font-mono text-sm font-semibold tabular", tone)}>
        {probe.latencyMs}
        <span className="ml-0.5 text-[11px] font-normal text-muted-foreground">{t.common.ms}</span>
      </span>
      {showMethod && (
        <span className="text-[11px] text-muted-foreground">
          {t.common.methodShort[probe.method]}
        </span>
      )}
    </span>
  );
}

export function SpeedValue({
  probe,
  className,
}: {
  probe: ProbeResult | null;
  className?: string;
}) {
  const t = useT();
  if (!probe || probe.downloadMbps === null)
    return (
      <span className={cn("text-xs text-muted-foreground", className)}>{t.common.notMeasured}</span>
    );
  return (
    <span className={cn("font-mono text-xs tabular text-foreground", className)}>
      ↓{probe.downloadMbps} ↑{probe.uploadMbps ?? "—"}{" "}
      <span className="text-muted-foreground">{t.common.mbps}</span>
    </span>
  );
}
