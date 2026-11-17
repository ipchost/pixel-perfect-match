import { useRef, useState } from "react";
import { ClipboardPaste, FileUp, Link2, ListPlus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useL } from "@/lib/i18n";
import {
  addUrlSubscription,
  importAsLocalSource,
  validateSubscriptionUrl,
  type ImportOutcome,
} from "./actions";

const REASONS: Record<string, [string, string]> = {
  empty: ["Введите URL", "Enter a URL"],
  invalid: ["Некорректный URL", "Invalid URL"],
  scheme: ["Поддерживаются только http(s)", "Only http(s) is supported"],
  private: [
    "Локальные и частные адреса запрещены (защита от SSRF)",
    "Local/private addresses are blocked (SSRF protection)",
  ],
  too_long: ["URL слишком длинный", "URL is too long"],
};

export function AddSourceDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const L = useL();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [interval, setInterval] = useState(30);
  const [text, setText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<ImportOutcome | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setName("");
    setUrl("");
    setText("");
    setErr(null);
    setResult(null);
    setInterval(30);
  };
  const close = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  const submitUrl = async () => {
    const v = validateSubscriptionUrl(url);
    if (!v.ok) {
      setErr(L(...(REASONS[v.reason] ?? REASONS["invalid"]!)));
      return;
    }
    if (interval < 5 || interval > 1440) {
      setErr(L("Интервал: от 5 до 1440 минут", "Interval: 5–1440 minutes"));
      return;
    }
    setBusy(true);
    const sub = await addUrlSubscription(name, v.url, interval);
    setBusy(false);
    toast.success(L("Подписка добавлена", "Source added"), { description: sub.name });
    close(false);
  };

  const submitText = (source: string, body: string) => {
    if (!body.trim()) {
      setErr(L("Нет данных для импорта", "Nothing to import"));
      return;
    }
    const { sub, outcome } = importAsLocalSource(source, body);
    setResult(outcome);
    if (!sub) {
      setErr(
        L(
          "Не найдено поддерживаемых конфигураций (VLESS, VMess, Trojan, Shadowsocks)",
          "No supported configs found (VLESS, VMess, Trojan, Shadowsocks)",
        ),
      );
      return;
    }
    setErr(null);
    toast.success(L(`Импортировано: ${outcome.total}`, `Imported: ${outcome.total}`), {
      description: L(
        `новых ${outcome.added}, дубликатов ${outcome.duplicates}, ошибок ${outcome.errors.length}`,
        `new ${outcome.added}, duplicates ${outcome.duplicates}, errors ${outcome.errors.length}`,
      ),
    });
  };

  const paste = async () => {
    try {
      const v = await navigator.clipboard.readText();
      setText(v);
    } catch {
      setErr(
        L(
          "Браузер не дал доступ к буферу. Вставьте вручную (Ctrl/Cmd+V).",
          "Clipboard access denied. Paste manually (Ctrl/Cmd+V).",
        ),
      );
    }
  };

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      setErr(L("Файл больше 5 МБ", "File exceeds 5 MB"));
      return;
    }
    submitText(f.name, await f.text());
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{L("Добавить источник", "Add source")}</DialogTitle>
          <DialogDescription>
            {L(
              "Ссылка на подписку, URI-строки или TXT-файл. Секреты хранятся только на устройстве.",
              "Subscription URL, URI lines or a TXT file. Secrets stay on device.",
            )}
          </DialogDescription>
        </DialogHeader>
        <Tabs
          defaultValue="url"
          onValueChange={() => {
            setErr(null);
            setResult(null);
          }}
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="url">
              <Link2 className="mr-1 size-4" />
              URL
            </TabsTrigger>
            <TabsTrigger value="text">
              <ListPlus className="mr-1 size-4" />
              URI
            </TabsTrigger>
            <TabsTrigger value="file">
              <FileUp className="mr-1 size-4" />
              TXT
            </TabsTrigger>
          </TabsList>
          <TabsContent value="url" className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="sub-name">{L("Название", "Name")}</Label>
              <Input
                id="sub-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={L("Например, «Рабочая»", "e.g. “Work”")}
                maxLength={60}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sub-url">URL</Label>
              <Input
                id="sub-url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setErr(null);
                }}
                placeholder="https://…"
                inputMode="url"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sub-int">
                {L("Интервал обновления, мин", "Refresh interval, min")}
              </Label>
              <Input
                id="sub-int"
                type="number"
                min={5}
                max={1440}
                value={interval}
                onChange={(e) => setInterval(Number(e.target.value))}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {L(
                "В браузере загрузка часто блокируется CORS — тогда используйте импорт URI/TXT. В Android-версии и через backend этого ограничения нет.",
                "Browsers often block loading via CORS — use URI/TXT import then. The Android app and backend have no such limit.",
              )}
            </p>
            <Button className="w-full" size="touch" onClick={submitUrl} disabled={busy}>
              {busy ? L("Загрузка…", "Loading…") : L("Добавить и обновить", "Add and refresh")}
            </Button>
          </TabsContent>
          <TabsContent value="text" className="space-y-3 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="imp-name">{L("Название источника", "Source name")}</Label>
              <Input
                id="imp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={L("Вставка", "Pasted")}
              />
            </div>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={7}
              placeholder={
                "vless://…\nvmess://…\ntrojan://…\nss://…\n" +
                L("или base64-подписка", "or base64 subscription")
              }
              className="font-mono text-xs"
              aria-label={L("Конфигурации", "Configs")}
            />
            <div className="flex gap-2">
              <Button variant="surface" onClick={paste}>
                <ClipboardPaste /> {L("Из буфера", "Paste")}
              </Button>
              <Button
                className="flex-1"
                onClick={() => submitText(name || L("Вставка", "Pasted"), text)}
              >
                {L("Импортировать", "Import")}
              </Button>
            </div>
          </TabsContent>
          <TabsContent value="file" className="space-y-3 pt-2">
            <input
              ref={fileRef}
              type="file"
              accept=".txt,text/plain"
              className="hidden"
              onChange={(e) => void onFile(e.target.files?.[0])}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface-2 p-8 text-sm text-muted-foreground hover:text-foreground"
            >
              <FileUp className="size-7" />
              {L("Выберите TXT-файл (до 5 МБ)", "Choose a TXT file (up to 5 MB)")}
            </button>
          </TabsContent>
        </Tabs>
        {err && (
          <p role="alert" className="text-sm text-destructive">
            {err}
          </p>
        )}
        {result && result.errors.length > 0 && (
          <div className="rounded-xl bg-surface-2 p-3 text-xs">
            <div className="mb-1 font-medium">
              {L(
                `Строки с ошибками: ${result.errors.length}`,
                `Lines with errors: ${result.errors.length}`,
              )}
            </div>
            <ul className="max-h-28 space-y-0.5 overflow-y-auto font-mono text-muted-foreground">
              {result.errors.slice(0, 20).map((e) => (
                <li key={e.line}>
                  #{e.line} · {e.reason} · {e.preview}
                </li>
              ))}
            </ul>
          </div>
        )}
        {result && result.total > 0 && (
          <Button variant="surface" onClick={() => close(false)}>
            {L("Готово", "Done")}
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
