import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle2,
  CircleDashed,
  CircleSlash,
  FileDown,
  Loader2,
  Play,
  TriangleAlert,
} from "lucide-react";
import { toast } from "sonner";
import { Card, Notice, Screen, Section } from "@/components/swit4/Screen";
import { DemoBadge } from "@/components/swit4/DemoBadge";
import { Button } from "@/components/ui/button";
import { getBridge } from "@/services/native/demo-bridge";
import type { ComponentHealth, DiagnosticsSnapshot } from "@/services/native/contracts";
import { buildDiagnosticReport } from "@/features/stats/report";
import { useOnline } from "@/hooks/use-online";
import { useL } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/diagnostics")({
  head: () => ({
    meta: [
      { title: "Диагностика — SWIT4" },
      {
        name: "description",
        content: "Проверка сети, DNS, IPv4/IPv6 и компонентов SWIT4 с отчётом без секретов.",
      },
      { property: "og:title", content: "Диагностика — SWIT4" },
      {
        property: "og:description",
        content: "Проверка сети, DNS, IPv4/IPv6 и компонентов SWIT4 с отчётом без секретов.",
      },
    ],
  }),
  component: Diagnostics,
});

type CheckState = "idle" | "running" | "ok" | "fail";
interface Check {
  state: CheckState;
  detail: string;
  ms: number | null;
}

async function timed(
  url: string,
  init?: RequestInit,
): Promise<{ ok: boolean; ms: number; body: string }> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 6000);
  const start = performance.now();
  try {
    const r = await fetch(url, { ...init, signal: ctrl.signal, cache: "no-store" });
    const body = await r.text();
    return { ok: r.ok, ms: Math.round(performance.now() - start), body };
  } finally {
    clearTimeout(t);
  }
}

const maskIp = (ip: string) =>
  ip.includes(":")
    ? `${ip.split(":").slice(0, 2).join(":")}:••••`
    : ip.replace(/\.\d+\.\d+$/, ".•••.•••");

function Diagnostics() {
  const L = useL();
  const online = useOnline();
  const [snap, setSnap] = useState<DiagnosticsSnapshot | null>(null);
  const [checks, setChecks] = useState<Record<"dns" | "ipv4" | "ipv6", Check>>({
    dns: { state: "idle", detail: "", ms: null },
    ipv4: { state: "idle", detail: "", ms: null },
    ipv6: { state: "idle", detail: "", ms: null },
  });
  const [running, setRunning] = useState(false);
  const set = (k: "dns" | "ipv4" | "ipv6", v: Check) => setChecks((c) => ({ ...c, [k]: v }));

  const run = async () => {
    setRunning(true);
    (["dns", "ipv4", "ipv6"] as const).forEach((k) =>
      set(k, { state: "running", detail: "", ms: null }),
    );
    const snapP = getBridge().diagnostics.snapshot().then(setSnap);
    const dns = timed("https://cloudflare-dns.com/dns-query?name=example.com&type=A", {
      headers: { accept: "application/dns-json" },
    })
      .then((r) =>
        set("dns", {
          state: r.ok && r.body.includes("Answer") ? "ok" : "fail",
          detail: L("DNS-over-HTTPS (Cloudflare)", "DNS-over-HTTPS (Cloudflare)"),
          ms: r.ms,
        }),
      )
      .catch(() =>
        set("dns", {
          state: "fail",
          detail: L("Запрос DoH не прошёл", "DoH request failed"),
          ms: null,
        }),
      );
    const v4 = timed("https://api.ipify.org?format=json")
      .then((r) => {
        const ip = (JSON.parse(r.body) as { ip: string }).ip;
        set("ipv4", { state: "ok", detail: maskIp(ip), ms: r.ms });
      })
      .catch(() =>
        set("ipv4", { state: "fail", detail: L("Нет IPv4-ответа", "No IPv4 response"), ms: null }),
      );
    const v6 = timed("https://api6.ipify.org?format=json")
      .then((r) => {
        const ip = (JSON.parse(r.body) as { ip: string }).ip;
        set("ipv6", { state: ip.includes(":") ? "ok" : "fail", detail: maskIp(ip), ms: r.ms });
      })
      .catch(() =>
        set("ipv6", {
          state: "fail",
          detail: L("IPv6 недоступен в этой сети", "IPv6 unavailable on this network"),
          ms: null,
        }),
      );
    await Promise.all([snapP, dns, v4, v6]);
    setRunning(false);
  };

  const download = () => {
    const flat = Object.fromEntries(
      Object.entries(checks).map(([k, v]) => [
        k,
        `${v.state}${v.ms ? ` ${v.ms}ms` : ""} ${v.detail}`,
      ]),
    );
    void getBridge().exporter.saveFile(
      "swit4-diagnostics.json",
      buildDiagnosticReport(snap, flat),
      "application/json",
    );
    toast.success(
      L("Отчёт сохранён — ключи и URL замаскированы", "Report saved — keys and URLs masked"),
    );
  };

  const comp: [string, ComponentHealth | undefined][] = [
    [
      L("Разрешение VPN", "VPN permission"),
      snap
        ? snap.vpnPermission === "granted"
          ? "ok"
          : snap.vpnPermission === "unsupported"
            ? "unsupported"
            : "down"
        : undefined,
    ],
    ["VpnService", snap?.vpnService],
    [`Xray-core${snap?.xrayVersion ? ` ${snap.xrayVersion}` : ""}`, snap?.xrayEngine],
    ["Backend API", snap?.backend],
  ];

  return (
    <Screen
      title={L("Диагностика", "Diagnostics")}
      actions={
        <Button size="sm" onClick={run} disabled={running}>
          {running ? <Loader2 className="animate-spin" /> : <Play />} {L("Запустить", "Run")}
        </Button>
      }
    >
      <Notice
        tone={online ? "info" : "danger"}
        className="mb-6"
        title={online ? L("Браузер онлайн", "Browser online") : L("Нет подключения", "Offline")}
      >
        {L(
          "Проверки сети выполняются браузером напрямую (реальные запросы). Состояние VpnService и Xray доступно только в Android-версии.",
          "Network checks are real browser requests. VpnService and Xray state is available only in the Android app.",
        )}
      </Notice>
      <Section title={L("Сеть", "Network")}>
        <Card className="divide-y divide-border">
          {(
            [
              ["dns", "DNS"],
              ["ipv4", "IPv4"],
              ["ipv6", "IPv6"],
            ] as const
          ).map(([k, label]) => (
            <div key={k} className="flex items-center gap-3 p-4">
              <StateIcon state={checks[k].state} />
              <div className="flex-1">
                <div className="text-sm font-medium">{label}</div>
                <div className="text-xs text-muted-foreground">
                  {checks[k].detail ||
                    (checks[k].state === "idle" ? L("Не проверено", "Not checked") : "…")}
                </div>
              </div>
              {checks[k].ms !== null && (
                <span className="font-mono text-xs text-muted-foreground">
                  {checks[k].ms} ms · HTTPS
                </span>
              )}
            </div>
          ))}
        </Card>
      </Section>
      <Section title={L("Компоненты", "Components")} aside={<DemoBadge />}>
        <Card className="divide-y divide-border">
          {comp.map(([label, h]) => (
            <div key={label} className="flex items-center justify-between p-4 text-sm">
              <span>{label}</span>
              <span
                className={cn(
                  "text-xs",
                  h === "ok"
                    ? "text-status-ok"
                    : h === "down"
                      ? "text-destructive"
                      : "text-muted-foreground",
                )}
              >
                {h === undefined
                  ? "—"
                  : h === "unsupported"
                    ? L("только Android", "Android only")
                    : h}
              </span>
            </div>
          ))}
        </Card>
      </Section>
      <Button variant="surface" size="touch" onClick={download}>
        <FileDown /> {L("Скачать отчёт (без секретов)", "Download report (no secrets)")}
      </Button>
    </Screen>
  );
}

function StateIcon({ state }: { state: CheckState }) {
  if (state === "running") return <Loader2 className="size-5 animate-spin text-signal" />;
  if (state === "ok") return <CheckCircle2 className="size-5 text-status-ok" />;
  if (state === "fail") return <CircleSlash className="size-5 text-destructive" />;
  return state === "idle" ? (
    <CircleDashed className="size-5 text-muted-foreground" />
  ) : (
    <TriangleAlert className="size-5 text-warning" />
  );
}
