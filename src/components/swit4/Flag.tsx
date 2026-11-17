import {
  AM,
  CH,
  DE,
  FI,
  FR,
  GB,
  JP,
  KZ,
  NL,
  PL,
  SE,
  SG,
  TR,
  US,
} from "country-flag-icons/react/3x2";
import { Globe2 } from "lucide-react";
import { cn } from "@/lib/utils";

const FLAGS: Record<string, typeof DE> = { AM, CH, DE, FI, FR, GB, JP, KZ, NL, PL, SE, SG, TR, US };

function emojiFlag(code: string) {
  if (!/^[A-Z]{2}$/.test(code)) return null;
  return String.fromCodePoint(...[...code].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

/** SVG-флаг (country-flag-icons, MIT); emoji — запасной вариант для стран вне набора. */
export function Flag({
  code,
  className,
  title,
}: {
  code: string;
  className?: string;
  title?: string;
}) {
  const C = FLAGS[code.toUpperCase()];
  const box = cn(
    "inline-flex h-[18px] w-[27px] shrink-0 overflow-hidden rounded-[4px] ring-1 ring-border",
    className,
  );
  if (C) return <C title={title ?? code} className={box} />;
  const emoji = emojiFlag(code.toUpperCase());
  return (
    <span
      className={cn(box, "items-center justify-center bg-surface-2 text-[13px] leading-none")}
      role="img"
      aria-label={title ?? code}
    >
      {emoji ?? <Globe2 className="size-3.5 text-muted-foreground" />}
    </span>
  );
}
