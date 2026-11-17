import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useL } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 rounded-xl bg-surface pl-10"
      />
    </div>
  );
}

export function Chips<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none md:mx-0 md:px-0"
    >
      {options.map((o) => (
        <button
          key={o.value}
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "h-9 shrink-0 rounded-full border px-3.5 text-[13px] font-medium transition-colors",
            value === o.value
              ? "border-primary/40 bg-primary-soft text-primary"
              : "border-border bg-surface text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function useStatusOptions() {
  const L = useL();
  return [
    { value: "all" as const, label: L("Все", "All") },
    { value: "working" as const, label: L("Рабочие", "Working") },
    { value: "unchecked" as const, label: L("Не проверены", "Unchecked") },
    { value: "problem" as const, label: L("Проблемные", "Problems") },
  ];
}
