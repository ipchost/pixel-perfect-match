import { describe, expect, it } from "vitest";
import { findConflicts, parsePackageList, parseRulesTxt, validateRuleValue } from "./logic";
import type { DomainRule } from "@/types";

const rule = (id: string, p: Partial<DomainRule>): DomainRule => ({ id, match: "domain", value: "a.com", action: "proxy", priority: 10, enabled: true, isDemo: false, ...p });

describe("domain/IP rules", () => {
  it("validates CIDR and IPs", () => {
    expect(validateRuleValue("cidr", "10.0.0.0/8")).toBeNull();
    expect(validateRuleValue("cidr", "10.0.0.0/33")).toBe("invalid_cidr");
    expect(validateRuleValue("ip", "300.1.1.1")).toBe("invalid_ip");
    expect(validateRuleValue("domain_suffix", "youtube.com")).toBeNull();
  });
  it("detects same value with different actions", () => {
    const c = findConflicts([rule("1", { action: "proxy" }), rule("2", { action: "direct", priority: 20 })]);
    expect(c[0]?.reason).toBe("same_value_different_action");
  });
  it("detects a domain shadowed by an earlier suffix rule", () => {
    const c = findConflicts([rule("1", { match: "domain_suffix", value: "google.com", action: "direct" }), rule("2", { value: "mail.google.com", priority: 20 })]);
    expect(c[0]?.reason).toBe("shadowed_by_suffix");
  });
  it("ignores disabled rules", () => {
    expect(findConflicts([rule("1", {}), rule("2", { enabled: false, action: "block" })])).toHaveLength(0);
  });
  it("parses TXT rules", () => {
    const r = parseRulesTxt("# c\nblock domain ads.example.com\nexample.org\nbad value here\n");
    expect(r.rules).toHaveLength(2);
    expect(r.rules[0]?.action).toBe("block");
    expect(r.errors).toBe(1);
  });
});

describe("package list import", () => {
  it("keeps valid unique package names", () => {
    const r = parsePackageList("org.telegram.messenger\norg.telegram.messenger\nnot a package\ncom.whatsapp");
    expect(r.packages).toEqual(["org.telegram.messenger", "com.whatsapp"]);
    expect(r.invalid).toBe(1);
  });
});
