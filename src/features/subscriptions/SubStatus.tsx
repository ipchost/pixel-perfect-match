import { AlertCircle, CheckCircle2, CircleDashed, Loader2, PauseCircle } from "lucide-react";
import { useL } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { SubscriptionStatus } from "@/types";

export function SubStatus({ status }: { status: SubscriptionStatus }) {
  const L = useL();
  const m = {
    ok: { i: CheckCircle2, c: "text-status-ok bg-status-ok/12", l: L("Актуальна", "Up to date") },
    updating: {
      i: Loader2,
      c: "text-status-checking bg-status-checking/12",
      l: L("Обновляется", "Updating"),
    },
    error: { i: AlertCircle, c: "text-status-down bg-status-down/12", l: L("Ошибка", "Error") },
    disabled: {
      i: PauseCircle,
      c: "text-status-unknown bg-status-unknown/12",
      l: L("Выключена", "Disabled"),
    },
    never_updated: {
      i: CircleDashed,
      c: "text-status-unknown bg-status-unknown/12",
      l: L("Не обновлялась", "Never updated"),
    },
  }[status];
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-medium",
        m.c,
      )}
    >
      <m.i className={cn("size-3.5", status === "updating" && "animate-spin")} aria-hidden /> {m.l}
    </span>
  );
}
