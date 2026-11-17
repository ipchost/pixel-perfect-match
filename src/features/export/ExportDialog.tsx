import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { AlertTriangle, Copy, FileJson, FileText, QrCode, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DemoBadge } from "@/components/swit4/DemoBadge";
import { getBridge } from "@/services/native/demo-bridge";
import { incompatibleClients } from "@/services/export/exporters";
import { useAppStore } from "@/app/store";
import { useT } from "@/localization";
import { useL } from "@/lib/i18n";
import type { Server } from "@/types";
import { safeFileName, serverUri, serversJson, serversTxt } from "./serialize";

/** Экспорт одного или нескольких серверов: URI, TXT, JSON, QR, системный share. Перед показом — предупреждение о секретах. */
export function ExportDialog({ servers, title, open, onOpenChange }: { servers: Server[]; title: string; open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useT();
  const L = useL();
  const [ack, setAck] = useState(false);
  const [qr, setQr] = useState(false);
  const clearAfter = useAppStore((s) => s.settings.privacy.clearClipboardAfterSec);
  const addEvent = useAppStore((s) => s.addEvent);
  const single = servers.length === 1 ? servers[0] : undefined;
  const isDemo = servers.some((s) => s.isDemo);
  const bridge = getBridge();
  const base = safeFileName(single ? single.name : title);
  const protocols = [...new Set(servers.map((s) => s.config.protocol))];
  const incompatible = [...new Set(protocols.flatMap((p) => incompatibleClients(p)))];

  const log = (what: string) => addEvent({ level: "info", category: "system", message: `Экспорт (${what}): ${servers.length} конф.`, isDemo });

  const close = (o: boolean) => {
    if (!o) {
      setAck(false);
      setQr(false);
    }
    onOpenChange(o);
  };

  const copy = async () => {
    const ok = await bridge.exporter.copy(serversTxt(servers).trim(), { sensitive: true, clearAfterSec: clearAfter });
    if (ok) {
      toast.success(t.common.copied, { description: clearAfter ? L(`Буфер будет очищен через ${clearAfter} с (best-effort в браузере)`, `Clipboard clears in ${clearAfter}s (best-effort in browser)`) : undefined });
      log("copy");
    } else toast.error(t.common.copyFailed);
  };
  const save = async (kind: "txt" | "json") => {
    const ok = kind === "txt" ? await bridge.exporter.saveFile(`${base}.txt`, serversTxt(servers, `SWIT4 export · ${title}`), "text/plain") : await bridge.exporter.saveFile(`${base}.json`, serversJson(servers), "application/json");
    if (ok) {
      toast.success(L("Файл сохранён", "File saved"));
      log(kind);
    }
  };
  const share = async () => {
    const ok = await bridge.exporter.share({ title: `SWIT4 · ${title}`, text: serversTxt(servers), fileName: `${base}.txt`, mime: "text/plain" });
    if (ok) log("share");
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {L("Экспорт", "Export")} {isDemo && <DemoBadge />}
          </DialogTitle>
          <DialogDescription>
            {title} · {servers.length} {L("конф.", "configs")}
          </DialogDescription>
        </DialogHeader>
        {!ack ? (
          <div className="space-y-4">
            <div className="flex gap-3 rounded-2xl border border-warning/30 bg-warning/10 p-3.5 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning" />
              <div>
                <div className="font-medium">{t.common.secretWarningTitle}</div>
                <p className="mt-1 text-muted-foreground">{t.common.secretWarning}</p>
              </div>
            </div>
            {isDemo && <p className="text-xs text-muted-foreground">{L("DEMO-конфигурации используют зарезервированный домен .example и не работают в других клиентах.", "DEMO configs use the reserved .example domain and won't work in other clients.")}</p>}
            <label className="flex cursor-pointer items-center gap-3 text-sm">
              <Checkbox onCheckedChange={(v) => setAck(v === true)} aria-label={L("Понимаю", "I understand")} />
              {L("Понимаю, что передаю ключ доступа", "I understand I'm sharing an access key")}
            </label>
          </div>
        ) : (
          <div className="space-y-3">
            {qr && single ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl bg-surface-2 p-4">
                <div className="rounded-xl bg-popover p-3">
                  <QRCodeSVG value={serverUri(single)} size={220} level="M" bgColor="transparent" fgColor="currentColor" className="text-popover-foreground" />
                </div>
                <p className="text-center text-xs text-muted-foreground">{L("Отсканируйте в совместимом клиенте", "Scan with a compatible client")}</p>
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              <Button variant="surface" size="touch" onClick={copy}><Copy /> {single ? L("Копировать URI", "Copy URI") : L("Копировать", "Copy")}</Button>
              <Button variant="surface" size="touch" onClick={share}><Share2 /> {t.common.share}</Button>
              <Button variant="surface" size="touch" onClick={() => save("txt")}><FileText /> TXT</Button>
              <Button variant="surface" size="touch" onClick={() => save("json")}><FileJson /> JSON (Xray)</Button>
              {single && (
                <Button variant="surface" size="touch" className="col-span-2" onClick={() => setQr((q) => !q)}>
                  <QrCode /> {qr ? L("Скрыть QR", "Hide QR") : L("Показать QR", "Show QR")}
                </Button>
              )}
            </div>
            {incompatible.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {L("Может не поддерживаться в: ", "May be unsupported by: ")}
                {incompatible.join(", ")}
              </p>
            )}
            <p className="text-xs text-muted-foreground">{L("Системный share sheet доступен в Android-версии; в браузере — Web Share или скачивание файла.", "System share sheet is native-only; the browser uses Web Share or a file download.")}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
