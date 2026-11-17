import { describe, expect, it } from "vitest";
import { BUILTIN_SOURCES } from "@/data/builtin-sources";
import { classifyContent, fetchWithMirrors } from "./classify";
import { filterServers, sortServers } from "@/features/servers/filters";
import type { Server } from "@/types";

describe("built-in catalogue", () => {
  it("keeps all 66 URLs in 26 groups", () => {
    expect(BUILTIN_SOURCES).toHaveLength(26);
    expect(BUILTIN_SOURCES.reduce((n, s) => n + s.urls.length, 0)).toBe(66);
  });
});

describe("classifyContent", () => {
  it("detects server subscriptions", () => {
    const r = classifyContent("trojan://secretpass@1.2.3.4:443#Node\n");
    expect(r.kind).toBe("servers");
  });
  it("detects routing lists and does not treat them as servers", () => {
    const r = classifyContent("# list\nyoutube.com\n10.0.0.0/8\nDOMAIN-SUFFIX,google.com\n1.1.1.1\n");
    expect(r.kind).toBe("routing");
    expect(r.serverCount).toBe(0);
    expect(r.routing.map((e) => e.match)).toEqual(["domain_suffix", "cidr", "domain_suffix", "ip"]);
  });
  it("marks HTML as unsupported", () => {
    expect(classifyContent("<!DOCTYPE html><p>404</p>").kind).toBe("unsupported");
  });
});

describe("mirror fallback", () => {
  it("tries the next mirror only after a failure", async () => {
    const calls: string[] = [];
    const res = await fetchWithMirrors(["a", "b", "c"], async (u) => {
      calls.push(u);
      if (u === "a") throw new Error("HTTP 404");
      return "ok";
    });
    expect(res).toEqual({ text: "ok", index: 1 });
    expect(calls).toEqual(["a", "b"]);
  });
});

function srv(id: string, latency: number | null, down: number | null, ageMin: number): Server {
  return {
    id,
    name: id,
    countryCode: "XX",
    city: "",
    config: { protocol: "vless", address: "1.1.1.1", port: 443, secret: "x" },
    subscriptionId: null,
    status: "available",
    lastProbe: {
      latencyMs: latency,
      method: "proxy_handshake",
      downloadMbps: down,
      uploadMbps: null,
      checkedAt: new Date(Date.now() - ageMin * 60_000).toISOString(),
      success: true,
    },
    probeHistory: [],
    excludedFromAuto: false,
    isDemo: false,
  } as unknown as Server;
}

describe("server list rules", () => {
  it("hides results older than 30 minutes from working list", () => {
    const list = [srv("fresh", 50, null, 5), srv("old", 40, null, 45)];
    expect(filterServers(list, "", "working", "all", 30).map((s) => s.id)).toEqual(["fresh"]);
  });
  it("puts missing ping and speed last", () => {
    const list = [srv("a", null, null, 1), srv("b", 90, 10, 1), srv("c", 30, 50, 1)];
    expect(sortServers(list, "latency").map((s) => s.id)).toEqual(["c", "b", "a"]);
    expect(sortServers(list, "download").map((s) => s.id)).toEqual(["c", "b", "a"]);
  });
});
