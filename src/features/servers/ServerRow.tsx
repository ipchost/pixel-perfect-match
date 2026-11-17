import { Link } from "@tanstack/react-router";
import { AlertTriangle, ChevronRight, Star } from "lucide-react";
import { useAppStore } from "@/app/store";
import { Flag } from "@/components/swit4/Flag";
import { StatusBadge } from "@/components/swit4/StatusBadge";
import { LatencyValue } from "@/components/swit4/LatencyValue";
import { ProtocolChip } from "@/components/swit4/ProtocolChip";
import { DemoBadge } from "@/components/swit4/DemoBadge";
import { Checkbox } from "@/components/ui/checkbox";
import { formatAge } from "@/lib/format";
import { useT } from "@/localization";
import { useL } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { Server } from "@/types";

export function ServerRow({ server, selectable, selected, onSelect, showCountry = false }: { server: Server; selectable?: boolean; selected?: boolean; onSelect?: (v: boolean) => void; showCountry?: boolean }) {
  const t = useT();
  const L = useL();
  const fav = useAppStore((s) => s.favorites.includes(server.id));
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  return (
    <div className={cn("flex items-center gap-3 px-3 py-3 transition-colors", selected && "bg-primary-soft")}>
      {selectable && <Checkbox checked={selected} onCheckedChange={(v) => onSelect?.(v === true)} aria-label={L(`Выбрать ${server.name}`, `Select ${server.name}`)} />}
      {showCountry && <Flag code={server.countryCode} />}
      <Link to="/server/$id" params={{ id: server.id }} className="flex min-w-0 flex-1 items-center gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{server.name}</span>
            {server.isDemo && <DemoBadge withIcon={false} />}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <ProtocolChip protocol={server.config.protocol} />
            <StatusBadge status={server.status} />
            {server.missingFromSource && (
              <span className="inline-flex items-center gap-1 text-[11px] text-warning" title={t.common.missingFromSource}>
                <AlertTriangle className="size-3" /> {L("нет в источнике", "removed from source")}
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-0.5 text-right">
          <LatencyValue probe={server.lastProbe} />
          {server.lastProbe && <span className="text-[10.5px] text-muted-foreground">{formatAge(server.lastProbe.checkedAt, t)}</span>}
        </div>
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
      </Link>
      <button
        type="button"
        onClick={() => toggleFavorite(server.id)}
        aria-pressed={fav}
        aria-label={fav ? L("Убрать из избранного", "Remove from favorites") : L("В избранное", "Add to favorites")}
        className="-mr-1 inline-flex size-9 items-center justify-center rounded-full hover:bg-surface-2"
      >
        <Star className={cn("size-4", fav ? "fill-warning text-warning" : "text-muted-foreground")} />
      </button>
    </div>
  );
}

export function ListCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("surface-card divide-y divide-border overflow-hidden", className)}>{children}</div>;
}
