import { Bank, Camera, Car, Code2, Cog, Download, Gamepad2, Globe, Mail, Map, MessageCircle, Music, Newspaper, Phone, Play, ShoppingBag, type LucideIcon } from "lucide-react";
import { LogoMark } from "@/components/swit4/Logo";

const ICONS: Record<string, LucideIcon> = { message: MessageCircle, phone: Phone, play: Play, globe: Globe, camera: Camera, music: Music, feed: Newspaper, bank: Bank, car: Car, mail: Mail, map: Map, game: Gamepad2, code: Code2, store: ShoppingBag, cog: Cog, download: Download };

export function AppIcon({ iconKey }: { iconKey: string }) {
  if (iconKey === "swit4") return <LogoMark className="size-9" />;
  const I = ICONS[iconKey] ?? Globe;
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-muted-foreground">
      <I className="size-4.5" aria-hidden />
    </span>
  );
}
