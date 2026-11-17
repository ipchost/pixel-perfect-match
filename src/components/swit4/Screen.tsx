import type { ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/localization";

/**
 * Каркас экрана: заголовок + контент. На телефоне заголовок липкий, на планшете — в общей сетке.
 * `back` — родительский раздел (документирует иерархию); кнопка «Назад» идёт по истории, иначе на главную.
 */
export function Screen({
  title,
  subtitle,
  back,
  actions,
  children,
  className,
  wide = false,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Широкий макет для двухколоночных экранов на планшете. */
  wide?: boolean;
}) {
  const t = useT();
  const router = useRouter();
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 pb-28 md:px-8 md:pb-12",
        wide ? "max-w-6xl" : "max-w-3xl",
        className,
      )}
    >
      <header className="sticky top-0 z-20 -mx-4 mb-4 flex min-h-16 items-center gap-2 bg-background/85 px-4 pt-safe backdrop-blur-xl md:static md:mx-0 md:mb-6 md:min-h-20 md:bg-transparent md:px-0 md:backdrop-blur-none">
        {back && (
          <button
            type="button"
            onClick={() =>
              window.history.length > 1 ? router.history.back() : void router.navigate({ to: "/" })
            }
            aria-label={t.common.back}
            className="-ml-2 inline-flex size-10 items-center justify-center rounded-full text-foreground hover:bg-surface-2"
          >
            <ChevronLeft className="size-5" />
          </button>
        )}
        <div className="min-w-0 flex-1 py-3">
          <h1 className="truncate font-display text-xl font-semibold text-foreground md:text-2xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-0.5 truncate text-[13px] text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
      </header>
      <div className="animate-fade-up">{children}</div>
    </div>
  );
}

/** Секция с подписью над карточкой. */
export function Section({
  title,
  aside,
  children,
  className,
}: {
  title?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("mb-6", className)}>
      {(title || aside) && (
        <div className="mb-2.5 flex items-center justify-between gap-3 px-1">
          {title && (
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {title}
            </h2>
          )}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export function Card({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("surface-card", className)} {...rest}>
      {children}
    </div>
  );
}

/** Информационная плашка (честная граница реализации, предупреждения). */
export function Notice({
  tone = "info",
  icon,
  title,
  children,
  className,
}: {
  tone?: "info" | "warning" | "danger" | "demo";
  icon?: ReactNode;
  title?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  const cls = {
    info: "bg-signal-soft border-signal/20",
    warning: "bg-warning/10 border-warning/25",
    danger: "bg-destructive/10 border-destructive/25",
    demo: "bg-demo border-warning/20",
  }[tone];
  return (
    <div className={cn("flex gap-3 rounded-2xl border p-3.5 text-sm", cls, className)}>
      {icon && <div className="mt-0.5 shrink-0 text-foreground/80 [&_svg]:size-4.5">{icon}</div>}
      <div className="min-w-0">
        {title && <div className="font-medium text-foreground">{title}</div>}
        {children && (
          <div className={cn("text-muted-foreground", title && "mt-0.5")}>{children}</div>
        )}
      </div>
    </div>
  );
}
