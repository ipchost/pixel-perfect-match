/** Режим раздельного туннелирования. Режимы взаимоисключающие (ограничение Android VpnService.Builder). */
export type AppRoutingMode = "all" | "whitelist" | "blacklist";

export interface InstalledApp {
  packageName: string;
  label: string;
  isSystem: boolean;
  /** Ключ иконки из набора демо-иконок; в нативной версии — bitmap из PackageManager. */
  iconKey: string;
  installedAt?: string | undefined;
  isDemo: boolean;
}

export interface AppRoutingConfig {
  mode: AppRoutingMode;
  /** package names для белого списка (VPN только для них). */
  whitelist: string[];
  /** package names для чёрного списка (обходят VPN). */
  blacklist: string[];
  /** Режим, фактически применённый к последнему туннелю (сообщается нативным слоем). */
  appliedMode: AppRoutingMode | null;
  appliedAt: string | null;
}

export type RuleAction = "proxy" | "direct" | "block";
export type RuleMatchType = "domain" | "domain_suffix" | "domain_keyword" | "ip" | "cidr";

export interface DomainRule {
  id: string;
  match: RuleMatchType;
  value: string;
  action: RuleAction;
  /** Порядок применения: меньший = раньше. */
  priority: number;
  enabled: boolean;
  note?: string | undefined;
  isDemo: boolean;
}

export interface RuleConflict {
  ruleIds: [string, string];
  value: string;
  reason: "same_value_different_action" | "shadowed_by_suffix" | "duplicate";
}

export type RuleProfileId = "normal" | "selected_apps" | "bypass_selected" | "limited";

export interface LimitedModeProfile {
  enabled: boolean;
  allowedDomains: string[];
  allowedIps: string[];
  /** Приложения, которым разрешён туннель в этом режиме. */
  apps: string[];
  savedAt: string | null;
  lastBackupAt: string | null;
}
