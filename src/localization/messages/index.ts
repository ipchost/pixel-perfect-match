import * as common from "./common";
import * as nav from "./nav";
import * as home from "./home";
import * as servers from "./servers";
import * as scan from "./scan";
import * as subscriptions from "./subscriptions";
import * as exportNs from "./export";
import * as rules from "./rules";
import * as favorites from "./favorites";
import * as statistics from "./statistics";
import * as diagnostics from "./diagnostics";
import * as settings from "./settings";
import * as onboarding from "./onboarding";
import * as events from "./events";

export const messages = {
  ru: {
    common: common.ru,
    nav: nav.ru,
    home: home.ru,
    servers: servers.ru,
    scan: scan.ru,
    subscriptions: subscriptions.ru,
    export: exportNs.ru,
    rules: rules.ru,
    favorites: favorites.ru,
    statistics: statistics.ru,
    diagnostics: diagnostics.ru,
    settings: settings.ru,
    onboarding: onboarding.ru,
    events: events.ru,
  },
  en: {
    common: common.en,
    nav: nav.en,
    home: home.en,
    servers: servers.en,
    scan: scan.en,
    subscriptions: subscriptions.en,
    export: exportNs.en,
    rules: rules.en,
    favorites: favorites.en,
    statistics: statistics.en,
    diagnostics: diagnostics.en,
    settings: settings.en,
    onboarding: onboarding.en,
    events: events.en,
  },
};

export type Messages = (typeof messages)["ru"];
