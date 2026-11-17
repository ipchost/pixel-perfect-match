import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Download, Gauge } from "lucide-react";
import { useAppStore } from "@/app/store";
import { Screen } from "@/components/swit4/Screen";
import { EmptyState } from "@/components/swit4/EmptyState";
import { Button } from "@/components/ui/button";
import { ServerRow, ListCard } from "@/features/servers/ServerRow";
import { ExportDialog } from "@/features/export/ExportDialog";
import { useL } from "@/lib/i18n";

export const Route = createFileRoute("/favorites")({
  head: () => ({
    meta: [
      { title: "Избранное — SWIT4" },
      {
        name: "description",
        content: "Избранные серверы SWIT4. Не исчезают бесшумно при удалении источника.",
      },
      { property: "og:title", content: "Избранное — SWIT4" },
      {
        property: "og:description",
        content: "Избранные серверы SWIT4. Не исчезают бесшумно при удалении источника.",
      },
    ],
  }),
  component: Favorites,
});

function Favorites() {
  const L = useL();
  const favs = useAppStore((s) => s.favorites);
  const servers = useAppStore((s) => s.servers);
  const list = favs
    .map((id) => servers.find((s) => s.id === id))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));
  const [open, setOpen] = useState(false);
  return (
    <Screen
      title={L("Избранное", "Favorites")}
      subtitle={L(`${list.length} серверов`, `${list.length} servers`)}
      actions={
        list.length > 0 ? (
          <>
            <Button variant="ghost" size="icon" asChild aria-label={L("Сравнить", "Compare")}>
              <Link to="/compare">
                <Gauge />
              </Link>
            </Button>
            <Button size="sm" variant="surface" onClick={() => setOpen(true)}>
              <Download /> {L("Экспорт", "Export")}
            </Button>
          </>
        ) : undefined
      }
    >
      {list.length === 0 ? (
        <EmptyState
          kind="favorites"
          title={L("Пока пусто", "Nothing yet")}
          text={L(
            "Нажмите на звезду у сервера, чтобы добавить его сюда.",
            "Tap the star on a server to add it here.",
          )}
          action={
            <Button asChild>
              <Link to="/servers">{L("К серверам", "To servers")}</Link>
            </Button>
          }
        />
      ) : (
        <ListCard>
          {list.map((s) => (
            <ServerRow key={s.id} server={s} showCountry />
          ))}
        </ListCard>
      )}
      <p className="mt-4 px-1 text-xs text-muted-foreground">
        {L(
          "Если источник удалит сервер, он останется здесь с пометкой «нет в источнике».",
          "If a source drops a server, it stays here marked “removed from source”.",
        )}
      </p>
      <ExportDialog
        open={open}
        onOpenChange={setOpen}
        servers={list}
        title={L("Избранное", "Favorites")}
      />
    </Screen>
  );
}
