import { useEffect, useState, type ReactNode } from "react";
import { Link, Navigate, useRouterState } from "@tanstack/react-router";
import { MotionConfig } from "framer-motion";
import { ShieldCheck } from "lucide-react";
import { hydrateStore, selectUnreadEvents, useAppStore } from "@/app/store";
import { Logo, LogoMark } from "@/components/swit4/Logo";
import { DemoBadge } from "@/components/swit4/DemoBadge";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { resolvePermissionPrompt } from "@/services/connection/controller";
import { useT } from "@/localization";
import { useL } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { EXTRA_NAV, MAIN_NAV } from "./nav";
import { runAutoUpdateTick } from "@/features/subscriptions/actions";

function useSystemDark() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setDark(mq.matches);
    const fn = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", fn);
    return () => mq.removeEventListener("change", fn);
  }, []);
  return dark;
}

function isActive(pathname: string, to: string) {
  return to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);
}

function PermissionDialog() {
  const t = useT();
  const open = useAppStore((s) => s.permissionPromptOpen);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && resolvePermissionPrompt(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-primary" /> {t.home.permissionTitle}
          </DialogTitle>
          <DialogDescription>{t.home.permissionText}</DialogDescription>
        </DialogHeader>
        <p className="rounded-xl bg-demo p-3 text-xs text-demo-foreground">
          {t.home.permissionWebNote}
        </p>
        <DialogFooter>
          <Button variant="surface" onClick={() => resolvePermissionPrompt(false)}>
            {t.common.cancel}
          </Button>
          <Button onClick={() => resolvePermissionPrompt(true)}>{t.home.permissionAllow}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const hydrated = useAppStore((s) => s.hydrated);
  const onboardingDone = useAppStore((s) => s.settings.onboardingDone);
  const theme = useAppStore((s) => s.settings.ui.theme);
  const motion = useAppStore((s) => s.settings.ui.motion);
  const locale = useAppStore((s) => s.settings.ui.locale);
  const unread = useAppStore(selectUnreadEvents);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const systemDark = useSystemDark();
  const t = useT();
  const L = useL();

  useEffect(() => {
    void hydrateStore();
  }, []);

  const dark = theme === "dark" || (theme === "system" && systemDark);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  }, [dark]);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (!hydrated) return;
    runAutoUpdateTick();
    const id = window.setInterval(runAutoUpdateTick, 60_000);
    return () => window.clearInterval(id);
  }, [hydrated]);

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <LogoMark className="size-14 animate-breathe" />
      </div>
    );
  }

  if (!onboardingDone && pathname !== "/onboarding") return <Navigate to="/onboarding" />;

  const reduced = motion === "reduced" ? "always" : motion === "full" ? "never" : "user";

  if (pathname === "/onboarding") {
    return (
      <MotionConfig reducedMotion={reduced}>
        {children}
        <Toaster position="top-center" theme={dark ? "dark" : "light"} />
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion={reduced}>
      <div className="min-h-screen bg-background text-foreground md:flex">
        <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-surface/60 px-4 py-6 md:flex lg:w-72">
          <Link to="/" className="mb-8 px-2">
            <Logo />
          </Link>
          <nav
            aria-label={t.nav.mainNav}
            className="flex flex-1 flex-col gap-1 overflow-y-auto scrollbar-none"
          >
            {MAIN_NAV.map((n) => (
              <SideLink
                key={n.to}
                item={n}
                active={isActive(pathname, n.to)}
                label={L(n.ru, n.en)}
              />
            ))}
            <div className="my-3 h-px bg-border" />
            {EXTRA_NAV.map((n) => (
              <SideLink
                key={n.to}
                item={n}
                active={isActive(pathname, n.to)}
                label={L(n.ru, n.en)}
                badge={n.to === "/events" && unread > 0 ? unread : undefined}
              />
            ))}
          </nav>
          <div className="mt-4 flex items-start gap-2 rounded-2xl bg-demo p-3 text-[11px] leading-snug text-demo-foreground">
            <DemoBadge />
            <span>{t.common.demoBanner}</span>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-center gap-2 border-b border-border bg-demo px-3 py-1.5 text-[11px] text-demo-foreground md:hidden">
            <DemoBadge />
            <span className="truncate">{t.common.demoBanner}</span>
          </div>
          <main id="main">{children}</main>
        </div>

        <nav
          aria-label={t.nav.mainNav}
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 pb-safe backdrop-blur-xl md:hidden"
        >
          <ul className="mx-auto grid max-w-lg grid-cols-5">
            {MAIN_NAV.map((n) => {
              const active = isActive(pathname, n.to);
              const Icon = n.icon;
              return (
                <li key={n.to}>
                  <Link
                    to={n.to}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-16 flex-col items-center justify-center gap-1 text-[10.5px] font-medium transition-colors",
                      active ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                        active && "bg-primary-soft",
                      )}
                    >
                      <Icon className="size-5" aria-hidden />
                    </span>
                    {L(n.ru, n.en)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
      <PermissionDialog />
      <Toaster position="top-center" theme={dark ? "dark" : "light"} />
    </MotionConfig>
  );
}

function SideLink({
  item,
  active,
  label,
  badge,
}: {
  item: (typeof MAIN_NAV)[number];
  active: boolean;
  label: string;
  badge?: number | undefined;
}) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
        active
          ? "bg-primary-soft text-primary"
          : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
      )}
    >
      <Icon className="size-[18px]" aria-hidden />
      <span className="flex-1 truncate">{label}</span>
      {badge !== undefined && (
        <span className="rounded-full bg-signal px-1.5 text-[10px] font-semibold text-signal-foreground">
          {badge}
        </span>
      )}
    </Link>
  );
}
