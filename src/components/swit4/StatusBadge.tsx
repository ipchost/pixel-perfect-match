import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  CircleSlash,
  FileWarning,
  Loader2,
  Snail,
  Waves,
} from "lucide-react";
import type { ServerStatus } from "@/types";
import { cn } from "@/lib/utils";
import { useT } from "@/localization";

const META: Record<ServerStatus, { icon: typeof CheckCircle2; cls: string; dot: string }> = {
  available: { icon: CheckCircle2, cls: "text-status-ok bg-status-ok/12", dot: "bg-status-ok" },
  slow: { icon: Snail, cls: "text-status-slow bg-status-slow/12", dot: "bg-status-slow" },
  unstable: {
    icon: Waves,
    cls: "text-status-unstable bg-status-unstable/12",
    dot: "bg-status-unstable",
  },
  unavailable: {
    icon: CircleSlash,
    cls: "text-status-down bg-status-down/12",
    dot: "bg-status-down",
  },
  unchecked: {
    icon: CircleDashed,
    cls: "text-status-unknown bg-status-unknown/12",
    dot: "bg-status-unknown",
  },
  checking: {
    icon: Loader2,
    cls: "text-status-checking bg-status-checking/12",
    dot: "bg-status-checking",
  },
  config_error: {
    icon: FileWarning,
    cls: "text-status-down bg-status-down/12",
    dot: "bg-status-down",
  },
};

export function statusDotClass(status: ServerStatus) {
  return META[status].dot;
}

/** Статус всегда = иконка + текст (не только цвет). */
export function StatusBadge({
  status,
  className,
  compact = false,
}: {
  status: ServerStatus;
  className?: string;
  compact?: boolean;
}) {
  const t = useT();
  const m = META[status];
  const Icon = m.icon;
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-medium",
        m.cls,
        className,
      )}
    >
      <Icon className={cn("size-3.5", status === "checking" && "animate-spin")} aria-hidden />
      {compact ? (
        <span className="sr-only">{t.common.status[status]}</span>
      ) : (
        t.common.status[status]
      )}
    </span>
  );
}

export function StaleBadge({ className }: { className?: string }) {
  const t = useT();
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full bg-warning/12 px-2 text-xs font-medium text-warning",
        className,
      )}
    >
      <AlertTriangle className="size-3.5" aria-hidden />
      {t.common.staleResult}
    </span>
  );
}
