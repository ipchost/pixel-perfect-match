import { useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Download,
  FileJson,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { useAppStore } from "@/app/store";
import { Notice, Screen } from "@/components/swit4/Screen";
import { DemoBadge } from "@/components/swit4/DemoBadge";
import { EmptyState } from "@/components/swit4/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SearchInput } from "@/features/servers/Toolbar";
import {
  findConflicts,
  normalizeValue,
  parseRulesTxt,
  renumber,
  rulesToTxt,
  validateRuleValue,
} from "@/features/rules/logic";
import { getBridge } from "@/services/native/demo-bridge";
import { uid } from "@/lib/random";
import { useL } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { DomainRule, RuleAction, RuleMatchType } from "@/types";

export const Route = createFileRoute("/rules/domains")({
  head: () => ({
    meta: [
      { title: "Домены и IP — SWIT4" },
      {
        name: "description",
        content: "Правила для доменов, суффиксов и IP/CIDR: через VPN, напрямую или блокировать.",
      },
      { property: "og:title", content: "Домены и IP — SWIT4" },
      {
        property: "og:description",
        content: "Правила для доменов, суффиксов и IP/CIDR: через VPN, напрямую или блокировать.",
      },
    ],
  }),
  component: DomainRules,
});

const ACTION_CLS: Record<RuleAction, string> = {
  proxy: "bg-primary-soft text-primary",
  direct: "bg-signal-soft text-signal",
  block: "bg-destructive/12 text-destructive",
};

function DomainRules() {
  const L = useL();
  const rules = useAppStore((s) => s.domainRules);
  const setRules = useAppStore((s) => s.setDomainRules);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<DomainRule | "new" | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const sorted = useMemo(() => [...rules].sort((a, b) => a.priority - b.priority), [rules]);
  const conflicts = useMemo(() => findConflicts(rules), [rules]);
  const conflictIds = new Set(conflicts.flatMap((c) => c.ruleIds));
  const visible = sorted.filter(
    (r) => !q.trim() || `${r.value} ${r.note ?? ""}`.toLowerCase().includes(q.trim().toLowerCase()),
  );
  const actionLabel: Record<RuleAction, string> = {
    proxy: L("Через VPN", "Via VPN"),
    direct: L("Напрямую", "Direct"),
    block: L("Блокировать", "Block"),
  };
  const matchLabel: Record<RuleMatchType, string> = {
    domain: L("Домен", "Domain"),
    domain_suffix: L("Суффикс", "Suffix"),
    domain_keyword: L("Ключевое слово", "Keyword"),
    ip: "IP",
    cidr: "CIDR",
  };

  const move = (id: string, dir: -1 | 1) => {
    const arr = [...sorted];
    const i = arr.findIndex((r) => r.id === id);
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    setRules(renumber(arr));
  };
  const save = (r: DomainRule) => {
    const exists = rules.some((x) => x.id === r.id);
    setRules(exists ? rules.map((x) => (x.id === r.id ? r : x)) : [...rules, r]);
    setEditing(null);
    toast.success(L("Правило сохранено", "Rule saved"));
  };
  const importFile = async (f: File | undefined) => {
    if (!f) return;
    const text = await f.text();
    let incoming: Omit<DomainRule, "id" | "priority">[] = [];
    let errors = 0;
    if (f.name.endsWith(".json")) {
      try {
        const data = JSON.parse(text) as { rules?: unknown };
        const arr = Array.isArray(data) ? data : Array.isArray(data.rules) ? data.rules : [];
        for (const raw of arr as Partial<DomainRule>[]) {
          if (
            raw.match &&
            raw.value &&
            raw.action &&
            !validateRuleValue(raw.match, raw.value) &&
            ["proxy", "direct", "block"].includes(raw.action)
          )
            incoming.push({
              match: raw.match,
              value: normalizeValue(raw.match, raw.value),
              action: raw.action,
              enabled: raw.enabled ?? true,
              note: raw.note,
              isDemo: false,
            });
          else errors++;
        }
      } catch {
        toast.error(L("Некорректный JSON", "Invalid JSON"));
        return;
      }
    } else ({ rules: incoming, errors } = parseRulesTxt(text));
    const base = sorted.at(-1)?.priority ?? 0;
    setRules([
      ...rules,
      ...incoming.map((r, i) => ({ ...r, id: uid("rule"), priority: base + (i + 1) * 10 })),
    ]);
    toast(L(`Импортировано правил: ${incoming.length}`, `Imported rules: ${incoming.length}`), {
      description: errors
        ? L(`Пропущено с ошибками: ${errors}`, `Skipped invalid: ${errors}`)
        : undefined,
    });
  };

  return (
    <Screen
      back="/rules"
      title={L("Домены и IP", "Domains & IP")}
      subtitle={L(
        "Применяются сверху вниз — первое совпадение побеждает",
        "Applied top to bottom — first match wins",
      )}
      actions={
        <Button size="sm" onClick={() => setEditing("new")}>
          <Plus /> {L("Правило", "Rule")}
        </Button>
      }
    >
      {conflicts.length > 0 && (
        <Notice
          tone="warning"
          icon={<AlertTriangle />}
          className="mb-4"
          title={L(`Конфликтов: ${conflicts.length}`, `Conflicts: ${conflicts.length}`)}
        >
          <ul className="space-y-0.5">
            {conflicts.map((c, i) => (
              <li key={i} className="font-mono text-xs">
                {c.value}:{" "}
                {c.reason === "duplicate"
                  ? L("дубликат", "duplicate")
                  : c.reason === "same_value_different_action"
                    ? L("разные действия для одного значения", "different actions for one value")
                    : L("перекрыто более ранним суффиксом", "shadowed by an earlier suffix")}
              </li>
            ))}
          </ul>
        </Notice>
      )}
      <div className="mb-4 space-y-3">
        <SearchInput
          value={q}
          onChange={setQ}
          placeholder={L("Поиск по значению", "Search value")}
        />
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="surface" onClick={() => fileRef.current?.click()}>
            <Upload /> {L("Импорт TXT/JSON", "Import TXT/JSON")}
          </Button>
          <Button
            size="sm"
            variant="surface"
            onClick={() =>
              void getBridge().exporter.saveFile("swit4-rules.txt", rulesToTxt(rules), "text/plain")
            }
          >
            <Download /> TXT
          </Button>
          <Button
            size="sm"
            variant="surface"
            onClick={() =>
              void getBridge().exporter.saveFile(
                "swit4-rules.json",
                JSON.stringify(
                  {
                    version: 1,
                    rules: sorted.map(({ match, value, action, enabled, note, priority }) => ({
                      match,
                      value,
                      action,
                      enabled,
                      note,
                      priority,
                    })),
                  },
                  null,
                  2,
                ),
                "application/json",
              )
            }
          >
            <FileJson /> JSON
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.json,text/plain,application/json"
            className="hidden"
            onChange={(e) => void importFile(e.target.files?.[0])}
          />
        </div>
      </div>
      {visible.length === 0 ? (
        <EmptyState
          kind="rules"
          title={L("Правил нет", "No rules")}
          action={
            <Button onClick={() => setEditing("new")}>
              <Plus /> {L("Добавить", "Add")}
            </Button>
          }
        />
      ) : (
        <div className="surface-card divide-y divide-border overflow-hidden">
          {visible.map((r, idx) => (
            <div
              key={r.id}
              className={cn(
                "flex items-center gap-3 p-3",
                !r.enabled && "opacity-50",
                conflictIds.has(r.id) && "bg-warning/8",
              )}
            >
              <span className="w-6 text-center font-mono text-[11px] text-muted-foreground">
                {idx + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-mono text-sm">{r.value}</span>
                  {r.isDemo && <DemoBadge withIcon={false} />}
                  {conflictIds.has(r.id) && (
                    <AlertTriangle
                      className="size-3.5 text-warning"
                      aria-label={L("Конфликт", "Conflict")}
                    />
                  )}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span
                    className={cn("rounded-md px-1.5 py-0.5 font-medium", ACTION_CLS[r.action])}
                  >
                    {actionLabel[r.action]}
                  </span>
                  <span className="text-muted-foreground">
                    {matchLabel[r.match]}
                    {r.note ? ` · ${r.note}` : ""}
                  </span>
                </div>
              </div>
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => move(r.id, -1)}
                  aria-label={L("Выше", "Up")}
                  disabled={!!q}
                >
                  <ArrowUp />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => move(r.id, 1)}
                  aria-label={L("Ниже", "Down")}
                  disabled={!!q}
                >
                  <ArrowDown />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  onClick={() => setEditing(r)}
                  aria-label={L("Изменить", "Edit")}
                >
                  <Pencil />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-destructive"
                  onClick={() => setRules(rules.filter((x) => x.id !== r.id))}
                  aria-label={L("Удалить", "Delete")}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {editing && (
        <RuleDialog
          rule={editing === "new" ? null : editing}
          nextPriority={(sorted.at(-1)?.priority ?? 0) + 10}
          onSave={save}
          onClose={() => setEditing(null)}
          actionLabel={actionLabel}
          matchLabel={matchLabel}
        />
      )}
    </Screen>
  );
}

function RuleDialog({
  rule,
  nextPriority,
  onSave,
  onClose,
  actionLabel,
  matchLabel,
}: {
  rule: DomainRule | null;
  nextPriority: number;
  onSave: (r: DomainRule) => void;
  onClose: () => void;
  actionLabel: Record<RuleAction, string>;
  matchLabel: Record<RuleMatchType, string>;
}) {
  const L = useL();
  const [match, setMatch] = useState<RuleMatchType>(rule?.match ?? "domain_suffix");
  const [value, setValue] = useState(rule?.value ?? "");
  const [action, setAction] = useState<RuleAction>(rule?.action ?? "proxy");
  const [note, setNote] = useState(rule?.note ?? "");
  const [enabled, setEnabled] = useState(rule?.enabled ?? true);
  const [err, setErr] = useState<string | null>(null);
  const submit = () => {
    const e = validateRuleValue(match, value);
    if (e)
      return setErr(L("Некорректное значение для выбранного типа", "Invalid value for this type"));
    onSave({
      id: rule?.id ?? uid("rule"),
      match,
      value: normalizeValue(match, value),
      action,
      priority: rule?.priority ?? nextPriority,
      enabled,
      note: note.trim() || undefined,
      isDemo: rule?.isDemo ?? false,
    });
  };
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {rule ? L("Изменить правило", "Edit rule") : L("Новое правило", "New rule")}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>{L("Тип", "Type")}</Label>
              <Select value={match} onValueChange={(v) => setMatch(v as RuleMatchType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(matchLabel) as RuleMatchType[]).map((m) => (
                    <SelectItem key={m} value={m}>
                      {matchLabel[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{L("Действие", "Action")}</Label>
              <Select value={action} onValueChange={(v) => setAction(v as RuleAction)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(actionLabel) as RuleAction[]).map((a) => (
                    <SelectItem key={a} value={a}>
                      {actionLabel[a]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rv">{L("Значение", "Value")}</Label>
            <Input
              id="rv"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setErr(null);
              }}
              placeholder={
                match === "cidr" ? "10.0.0.0/8" : match === "ip" ? "1.1.1.1" : "example.com"
              }
              className="font-mono"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rn">{L("Заметка", "Note")}</Label>
            <Input id="rn" value={note} onChange={(e) => setNote(e.target.value)} maxLength={80} />
          </div>
          <label className="flex items-center justify-between text-sm">
            {L("Включено", "Enabled")}
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </label>
          {err && (
            <p role="alert" className="text-sm text-destructive">
              {err}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="surface" onClick={onClose}>
            {L("Отмена", "Cancel")}
          </Button>
          <Button onClick={submit}>{L("Сохранить", "Save")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
