import { motion } from "framer-motion";
import { Loader2, Power } from "lucide-react";
import { useAppStore } from "@/app/store";
import { connect, disconnect, isBusy } from "@/services/connection/controller";
import { useT } from "@/localization";
import { cn } from "@/lib/utils";

/** Большая кнопка подключения. В вебе соединение — DEMO (туннель не создаётся). */
export function ConnectButton() {
  const t = useT();
  const phase = useAppStore((s) => s.connection.phase);
  const connected = phase === "connected" || phase === "reconnecting";
  const busy = isBusy(phase);
  const onClick = () => {
    if (connected || busy) void disconnect();
    else void connect();
  };
  const hint = connected ? t.home.tapToDisconnect : busy ? t.home.tapToCancel : t.home.tapToConnect;
  return (
    <div className="flex flex-col items-center">
      <div className="relative flex size-60 items-center justify-center sm:size-64">
        {connected && (
          <>
            <span className="absolute inset-6 rounded-full bg-primary/20 animate-pulse-ring" aria-hidden />
            <span className="absolute inset-6 rounded-full bg-primary/10 animate-pulse-ring [animation-delay:1.1s]" aria-hidden />
          </>
        )}
        {busy && <span className="absolute inset-3 rounded-full bg-ring opacity-70 animate-orbit [mask:radial-gradient(circle,transparent_62%,black_63%)]" aria-hidden />}
        {!busy && <span className={cn("absolute inset-3 rounded-full border transition-colors", connected ? "border-primary/50" : "border-border")} aria-hidden />}
        <motion.button
          type="button"
          onClick={onClick}
          whileTap={{ scale: 0.95 }}
          aria-label={connected ? t.home.disconnectAria : t.home.connectAria}
          aria-pressed={connected}
          className={cn(
            "relative flex size-40 flex-col items-center justify-center rounded-full bg-core shadow-float outline-none ring-offset-4 ring-offset-background transition-shadow focus-visible:ring-2 focus-visible:ring-ring sm:size-44",
            connected && "shadow-glow",
          )}
        >
          {busy ? <Loader2 className="size-12 animate-spin text-signal" /> : <Power className={cn("size-12 transition-colors", connected ? "text-primary" : "text-muted-foreground")} strokeWidth={2.2} />}
        </motion.button>
      </div>
      <p className="mt-1 text-center text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
