import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Kind = "servers" | "search" | "subscriptions" | "favorites" | "events" | "apps" | "rules" | "stats";

/** Линейные иллюстрации пустых состояний в стиле знака SWIT4 (без детских картинок). */
function Illustration({ kind }: { kind: Kind }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 120 88" className="h-[88px] w-[120px]" aria-hidden>
      <rect x="10" y="10" width="100" height="68" rx="18" className="text-border" {...common} strokeDasharray="3 5" />
      <g className="text-muted-foreground" {...common}>
        {kind === "servers" && (
          <>
            <rect x="38" y="28" width="44" height="12" rx="4" />
            <rect x="38" y="46" width="44" height="12" rx="4" />
            <circle cx="46" cy="34" r="1.6" />
            <circle cx="46" cy="52" r="1.6" />
          </>
        )}
        {kind === "search" && (
          <>
            <circle cx="56" cy="42" r="12" />
            <path d="M65 51l9 9" />
          </>
        )}
        {kind === "subscriptions" && (
          <>
            <path d="M44 54a12 12 0 0 1 12-12" />
            <path d="M44 42a24 24 0 0 1 24-24" opacity=".6" />
            <circle cx="46" cy="54" r="2" />
            <path d="M70 46v14M63 53h14" />
          </>
        )}
        {kind === "favorites" && <path d="M60 28l5 10 11 1.6-8 7.8 2 11-10-5.3-10 5.3 2-11-8-7.8 11-1.6z" />}
        {kind === "events" && (
          <>
            <path d="M50 54V42a10 10 0 0 1 20 0v12l3 4H47z" />
            <path d="M57 62a3 3 0 0 0 6 0" />
          </>
        )}
        {kind === "apps" && (
          <>
            <rect x="40" y="26" width="16" height="16" rx="5" />
            <rect x="64" y="26" width="16" height="16" rx="5" />
            <rect x="40" y="48" width="16" height="16" rx="5" />
            <rect x="64" y="48" width="16" height="16" rx="5" strokeDasharray="2 3" />
          </>
        )}
        {kind === "rules" && (
          <>
            <path d="M40 34h40M40 44h28M40 54h34" />
            <circle cx="80" cy="44" r="3" />
          </>
        )}
        {kind === "stats" && <path d="M38 60V48M50 60V38M62 60V44M74 60V30M86 60" />}
      </g>
      <circle cx="96" cy="18" r="3" className="fill-primary" />
      <circle cx="24" cy="70" r="3" className="fill-signal" />
    </svg>
  );
}

export function EmptyState({ kind, title, text, action, className }: { kind: Kind; title: string; text?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-10 text-center animate-fade-up", className)}>
      <Illustration kind={kind} />
      <h3 className="mt-4 text-base font-semibold text-foreground">{title}</h3>
      {text && <p className="mt-1.5 max-w-xs text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
