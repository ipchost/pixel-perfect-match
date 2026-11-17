import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/localization";

/** Обязательная маркировка демо-данных. Показывать рядом с любыми DEMO-значениями. */
export function DemoBadge({
  className,
  withIcon = true,
}: {
  className?: string;
  withIcon?: boolean;
}) {
  const t = useT();
  return (
    <span
      title={t.common.demoHint}
      className={cn(
        "inline-flex h-5 shrink-0 items-center gap-1 rounded-md bg-demo px-1.5 font-mono text-[10px] font-semibold tracking-wider text-demo-foreground",
        className,
      )}
    >
      {withIcon && <FlaskConical className="size-3" aria-hidden />}
      {t.common.demo}
    </span>
  );
}
