import { useId } from "react";
import { cn } from "@/lib/utils";

/**
 * Знак SWIT4: S-образный «туннель» — путь трафика между двумя узлами.
 * Верхний узел — клиент (акцент), нижний — сервер (дополнительный акцент).
 */
export function LogoMark({ className, title = "SWIT4" }: { className?: string; title?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} role="img" aria-label={title}>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--primary)" />
          <stop offset="1" stopColor="var(--signal)" />
        </linearGradient>
      </defs>
      <rect
        x="1"
        y="1"
        width="30"
        height="30"
        rx="9"
        fill="var(--surface-2)"
        stroke="var(--border)"
      />
      <path
        d="M22.5 8H13.75a4 4 0 0 0 0 8h4.5a4 4 0 0 1 0 8H9.5"
        fill="none"
        stroke={`url(#g${id})`}
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="23" cy="8" r="2.2" fill="var(--primary)" />
      <circle cx="9" cy="24" r="2.2" fill="var(--signal)" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-display text-[17px] font-semibold tracking-[0.06em] text-foreground",
        className,
      )}
    >
      SWIT<span className="text-primary">4</span>
    </span>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className="size-8" />
      {!compact && <Wordmark />}
    </span>
  );
}
