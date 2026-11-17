import { toUri, toUriList, toXrayJson, toXrayOutbound } from "@/services/export/exporters";
import type { Server } from "@/types";

export function serverUri(server: Server) {
  return server.rawUri ?? toUri(server.config, server.name);
}

export function serversTxt(servers: Server[], header?: string) {
  if (servers.length === 1 && servers[0]) return `${serverUri(servers[0])}\n`;
  return toUriList(servers, header);
}

export function serversJson(servers: Server[]) {
  if (servers.length === 1 && servers[0]) return toXrayJson(servers[0]);
  return JSON.stringify(
    {
      outbounds: servers.map((s, i) => toXrayOutbound(s.config, `proxy-${i + 1}`)),
      _swit4: {
        exportedAt: new Date().toISOString(),
        names: servers.map((s) => s.name),
        isDemo: servers.some((s) => s.isDemo),
      },
    },
    null,
    2,
  );
}

export function safeFileName(name: string) {
  return name.replace(/[^\p{L}\p{N}._-]+/gu, "_").slice(0, 60) || "swit4";
}
