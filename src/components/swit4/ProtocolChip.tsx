import type { Protocol } from "@/types";
import { cn } from "@/lib/utils";
import { useT } from "@/localization";

export function ProtocolChip({ protocol, className }: { protocol: Protocol; className?: string }) {
  const t = useT();
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center rounded-md border border-border bg-surface-2 px-1.5 font-mono text-[10.5px] font-medium tracking-wide text-muted-foreground",
        className,
      )}
    >
      {t.common.protocol[protocol]}
    </span>
  );
}
