import type { DomainRule, LimitedModeProfile } from "@/types";

export function createDemoRules(): DomainRule[] {
  const r = (id: string, match: DomainRule["match"], value: string, action: DomainRule["action"], priority: number, note?: string): DomainRule => ({ id, match, value, action, priority, enabled: true, note, isDemo: true });
  return [
    r("rule_demo_1", "domain_suffix", "local", "direct", 10, "Локальная сеть"),
    r("rule_demo_2", "cidr", "192.168.0.0/16", "direct", 20, "Домашняя сеть"),
    r("rule_demo_3", "cidr", "10.0.0.0/8", "direct", 21),
    r("rule_demo_4", "domain_suffix", "gosuslugi.ru", "direct", 30),
    r("rule_demo_5", "domain_suffix", "youtube.com", "proxy", 40),
    r("rule_demo_6", "domain", "ads.example.com", "block", 50, "Реклама"),
    r("rule_demo_7", "domain", "youtube.com", "direct", 60, "Конфликт: см. правило выше"),
  ];
}

export function createDemoLimitedProfile(): LimitedModeProfile {
  return {
    enabled: false,
    allowedDomains: ["telegram.org", "t.me", "wikipedia.org", "github.com"],
    allowedIps: ["149.154.160.0/20"],
    apps: ["org.telegram.messenger", "com.android.chrome"],
    savedAt: null,
    lastBackupAt: null,
  };
}
