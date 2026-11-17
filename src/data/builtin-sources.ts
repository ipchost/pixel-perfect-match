/**
 * Встроенный каталог источников SWIT4 (manifest пользователя, schema 1.0).
 * Только URL и метаданные — загружаемые конфигурации в исходный код не помещаются.
 * Полный исходный manifest: src/data/builtin-subscriptions.json.
 * Все источники выключены по умолчанию; формат определяется по содержимому, а не по имени.
 */
export interface BuiltinSource {
  id: string;
  name: string;
  /** Основной URL и зеркала (fallback по порядку). */
  urls: string[];
  roleHint: string | null;
  description: string;
}

export const BUILTIN_SOURCES: BuiltinSource[] = [
  {
    "id": "src-01",
    "name": "RKP — WHITELIST https://hub.mos.ru/rkp/sub-roskompozor/raw/main/wl",
    "urls": [
      "https://hub.mos.ru/rkp/sub-roskompozor/raw/main/wl",
      "https://raw.githubusercontent.com/rkp-community/sub/main/wl"
    ],
    "roleHint": "unclassified_pending_content_inspection",
    "description": "Имя источника не является доказательством формата. Загрузить содержимое, определить фактический формат и классифицировать как серверную подписку, список маршрутизации (domain/IP/CIDR) или неподдерживаемый формат."
  },
  {
    "id": "src-02",
    "name": "RKP — BLACKLIST https://hub.mos.ru/rkp/sub-roskompozor/raw/main/bl",
    "urls": [
      "https://hub.mos.ru/rkp/sub-roskompozor/raw/main/bl",
      "https://raw.githubusercontent.com/rkp-community/sub/main/bl"
    ],
    "roleHint": "unclassified_pending_content_inspection",
    "description": "Имя источника не является доказательством формата. Загрузить содержимое, определить фактический формат и классифицировать как серверную подписку, список маршрутизации (domain/IP/CIDR) или неподдерживаемый формат."
  },
  {
    "id": "src-03",
    "name": "AetrisVPN",
    "urls": [
      "https://raw.githubusercontent.com/flaafix/AetrisVPN/main/AetrisVPN.txt",
      "https://fastly.jsdelivr.net/gh/flaafix/AetrisVPN@main/AetrisVPN.txt",
      "https://cdn.jsdelivr.net/gh/flaafix/AetrisVPN@main/AetrisVPN.txt"
    ],
    "roleHint": "unclassified_pending_content_inspection",
    "description": "Имя источника не является доказательством формата. Загрузить содержимое, определить фактический формат и классифицировать как серверную подписку, список маршрутизации (domain/IP/CIDR) или неподдерживаемый формат."
  },
  {
    "id": "src-04",
    "name": "CYBERPORTAL — WHITE KEYS #42",
    "urls": [
      "https://raw.githubusercontent.com/NullCoreDeveloper/cyberportal-mirror/master/cp-042.txt",
      "https://warp-gen.cyb-portal.org/CP-042"
    ],
    "roleHint": "unclassified_pending_content_inspection",
    "description": "Имя источника не является доказательством формата. Загрузить содержимое, определить фактический формат и классифицировать как серверную подписку, список маршрутизации (domain/IP/CIDR) или неподдерживаемый формат."
  },
  {
    "id": "src-05",
    "name": "CYBERPORTAL — BLACK MIX",
    "urls": [
      "https://raw.githubusercontent.com/NullCoreDeveloper/cyberportal-mirror/master/cp-001.txt",
      "https://warp-gen.cyb-portal.org/CP-001"
    ],
    "roleHint": "unclassified_pending_content_inspection",
    "description": "Имя источника не является доказательством формата. Загрузить содержимое, определить фактический формат и классифицировать как серверную подписку, список маршрутизации (domain/IP/CIDR) или неподдерживаемый формат."
  },
  {
    "id": "src-06",
    "name": "igareck — BLACKLIST",
    "urls": [
      "https://gitlab.com/igareck/vpn-configs-for-russia/raw/main/BLACK_VLESS_RUS_mobile.txt",
      "https://codeberg.org/igareck/vpn-configs-for-russia/raw/branch/main/BLACK_VLESS_RUS_mobile.txt",
      "https://raw.githubusercontent.com/igareck/vpn-configs-for-russia/main/BLACK_VLESS_RUS_mobile.txt"
    ],
    "roleHint": "unclassified_pending_content_inspection",
    "description": "Имя источника не является доказательством формата. Загрузить содержимое, определить фактический формат и классифицировать как серверную подписку, список маршрутизации (domain/IP/CIDR) или неподдерживаемый формат."
  },
  {
    "id": "src-07",
    "name": "WHITE-CIDR-RU",
    "urls": [
      "https://bitbucket.org/igareck/vpn-configs-for-russia/raw/main/WHITE-CIDR-RU-all.txt",
      "https://raw.githubusercontent.com/igareck/vpn-configs-for-russia/main/WHITE-CIDR-RU-all.txt"
    ],
    "roleHint": "unclassified_pending_content_inspection",
    "description": "Имя источника не является доказательством формата. Загрузить содержимое, определить фактический формат и классифицировать как серверную подписку, список маршрутизации (domain/IP/CIDR) или неподдерживаемый формат."
  },
  {
    "id": "src-08",
    "name": "ЭтоНеЯ — WHITELIST https://etoneya.su/whitelist",
    "urls": [
      "https://etoneya.su/whitelist",
      "https://etoneya.best/whitelist",
      "https://alley.serv00.net/whitelist",
      "https://etoskam.ru/whitelist"
    ],
    "roleHint": "unclassified_pending_content_inspection",
    "description": "Имя источника не является доказательством формата. Загрузить содержимое, определить фактический формат и классифицировать как серверную подписку, список маршрутизации (domain/IP/CIDR) или неподдерживаемый формат."
  },
  {
    "id": "src-09",
    "name": "ЭтоНеЯ — YOUTUBE https://alley.serv00.net/youtube",
    "urls": [
      "https://alley.serv00.net/youtube",
      "https://etoneya.su/youtube",
      "https://etoneya.best/youtube",
      "https://etoskam.ru/youtube"
    ],
    "roleHint": "unclassified_pending_content_inspection",
    "description": "Имя источника не является доказательством формата. Загрузить содержимое, определить фактический формат и классифицировать как серверную подписку, список маршрутизации (domain/IP/CIDR) или неподдерживаемый формат."
  },
  {
    "id": "src-10",
    "name": "rjsxrd — BYPASS ALL",
    "urls": [
      "https://raw.githubusercontent.com/whoahaow/rjsxrd/main/githubmirror/bypass/bypass-all.txt",
      "https://fastly.jsdelivr.net/gh/whoahaow/rjsxrd@main/githubmirror/bypass/bypass-all.txt",
      "https://cdn.jsdelivr.net/gh/whoahaow/rjsxrd@main/githubmirror/bypass/bypass-all.txt"
    ],
    "roleHint": "unclassified_pending_content_inspection",
    "description": "Имя источника не является доказательством формата. Загрузить содержимое, определить фактический формат и классифицировать как серверную подписку, список маршрутизации (domain/IP/CIDR) или неподдерживаемый формат."
  },
  {
    "id": "src-11",
    "name": "VLESSFORU https://sub.vlessfo.ru/vlessforu/working_configs.txt",
    "urls": [
      "https://sub.vlessfo.ru/vlessforu/working_configs.txt"
    ],
    "roleHint": "unclassified_pending_content_inspection",
    "description": "Имя источника не является доказательством формата. Загрузить содержимое, определить фактический формат и классифицировать как серверную подписку, список маршрутизации (domain/IP/CIDR) или неподдерживаемый формат."
  },
  {
    "id": "src-12",
    "name": "Бункер",
    "urls": [
      "https://hub.mos.ru/akelladejavu/bunker/-/raw/main/BLACK_LIST.txt"
    ],
    "roleHint": "unclassified_pending_content_inspection",
    "description": "Имя источника не является доказательством формата. Загрузить содержимое, определить фактический формат и классифицировать как серверную подписку, список маршрутизации (domain/IP/CIDR) или неподдерживаемый формат."
  },
  {
    "id": "src-13",
    "name": "Generation-Liberty",
    "urls": [
      "https://raw.githubusercontent.com/gergew452/Generation-Liberty/main/githubmirror/best.txt",
      "https://fastly.jsdelivr.net/gh/gergew452/Generation-Liberty@main/githubmirror/best.txt"
    ],
    "roleHint": "unclassified_pending_content_inspection",
    "description": "Имя источника не является доказательством формата. Загрузить содержимое, определить фактический формат и классифицировать как серверную подписку, список маршрутизации (domain/IP/CIDR) или неподдерживаемый формат."
  },
  {
    "id": "src-14",
    "name": "PizdukVPN — MAIN",
    "urls": [
      "https://raw.githubusercontent.com/PizdukMod/PizdukVPN/main/sub",
      "https://fastly.jsdelivr.net/gh/PizdukMod/PizdukVPN@main/sub"
    ],
    "roleHint": "unclassified_pending_content_inspection",
    "description": "Имя источника не является доказательством формата. Загрузить содержимое, определить фактический формат и классифицировать как серверную подписку, список маршрутизации (domain/IP/CIDR) или неподдерживаемый формат."
  },
  {
    "id": "src-15",
    "name": "PizdukVPN — WHITELIST",
    "urls": [
      "https://raw.githubusercontent.com/PizdukMod/PizdukVPN/main/wl",
      "https://fastly.jsdelivr.net/gh/PizdukMod/PizdukVPN@main/wl"
    ],
    "roleHint": "unclassified_pending_content_inspection",
    "description": "Имя источника не является доказательством формата. Загрузить содержимое, определить фактический формат и классифицировать как серверную подписку, список маршрутизации (domain/IP/CIDR) или неподдерживаемый формат."
  },
  {
    "id": "src-16",
    "name": "kort0881 — RU BEST WHITE",
    "urls": [
      "https://raw.githubusercontent.com/kort0881/vpn-checker-backend/main/checked/RU_Best/ru_white_all_WHITE.txt",
      "https://fastly.jsdelivr.net/gh/kort0881/vpn-checker-backend@main/checked/RU_Best/ru_white_all_WHITE.txt"
    ],
    "roleHint": "unclassified_pending_content_inspection",
    "description": "Имя источника не является доказательством формата. Загрузить содержимое, определить фактический формат и классифицировать как серверную подписку, список маршрутизации (domain/IP/CIDR) или неподдерживаемый формат."
  },
  {
    "id": "src-17",
    "name": "FreeCFGHub",
    "urls": [
      "https://raw.githubusercontent.com/Ilyacom4ik/free-v2ray-2026/main/subscriptions/FreeCFGHub1.txt",
      "https://fastly.jsdelivr.net/gh/Ilyacom4ik/free-v2ray-2026@main/subscriptions/FreeCFGHub1.txt"
    ],
    "roleHint": "unclassified_pending_content_inspection",
    "description": "Имя источника не является доказательством формата. Загрузить содержимое, определить фактический формат и классифицировать как серверную подписку, список маршрутизации (domain/IP/CIDR) или неподдерживаемый формат."
  },
  {
    "id": "src-18",
    "name": "Luxxuria — NON-RU",
    "urls": [
      "https://raw.githubusercontent.com/luxxuria/harvester/main/non_ru.txt",
      "https://fastly.jsdelivr.net/gh/luxxuria/harvester@main/non_ru.txt"
    ],
    "roleHint": "unclassified_pending_content_inspection",
    "description": "Имя источника не является доказательством формата. Загрузить содержимое, определить фактический формат и классифицировать как серверную подписку, список маршрутизации (domain/IP/CIDR) или неподдерживаемый формат."
  },
  {
    "id": "src-19",
    "name": "AkresVPN — ALL",
    "urls": [
      "https://raw.githubusercontent.com/theakres/VPN/refs/heads/main/all"
    ],
    "roleHint": "unclassified_pending_content_inspection",
    "description": "Имя источника не является доказательством формата. Загрузить содержимое, определить фактический формат и классифицировать как серверную подписку, список маршрутизации (domain/IP/CIDR) или неподдерживаемый формат."
  },
  {
    "id": "src-20",
    "name": "Scarlet Devil — WHITELIST https://scarlet-devil.vercel.app/sub1",
    "urls": [
      "https://scarlet-devil.vercel.app/sub1",
      "https://raw.githubusercontent.com/Areral/ScarletDevil/main/sub_bs.txt"
    ],
    "roleHint": "unclassified_pending_content_inspection",
    "description": "Имя источника не является доказательством формата. Загрузить содержимое, определить фактический формат и классифицировать как серверную подписку, список маршрутизации (domain/IP/CIDR) или неподдерживаемый формат."
  },
  {
    "id": "src-21",
    "name": "Scarlet Devil — BLACKLIST https://scarlet-devil.vercel.app/sub2",
    "urls": [
      "https://scarlet-devil.vercel.app/sub2",
      "https://raw.githubusercontent.com/Areral/ScarletDevil/main/sub_chs.txt"
    ],
    "roleHint": "unclassified_pending_content_inspection",
    "description": "Имя источника не является доказательством формата. Загрузить содержимое, определить фактический формат и классифицировать как серверную подписку, список маршрутизации (domain/IP/CIDR) или неподдерживаемый формат."
  },
  {
    "id": "src-22",
    "name": "zieng2 — UNIVERSAL WHITELIST",
    "urls": [
      "https://gitverse.ru/api/repos/zieng2/wl/raw/branch/master/list_universal.txt",
      "https://raw.githubusercontent.com/zieng2/wl/main/vless_universal.txt",
      "https://fastly.jsdelivr.net/gh/zieng2/wl@main/vless_universal.txt",
      "https://hub.mos.ru/zieng2/wl/raw/main/list_universal.txt",
      "https://codeberg.org/zieng2/wl/raw/branch/main/vless_universal.txt",
      "https://gitlab.com/zieng2/wl/raw/main/vless_universal.txt"
    ],
    "roleHint": "unclassified_pending_content_inspection",
    "description": "Имя источника не является доказательством формата. Загрузить содержимое, определить фактический формат и классифицировать как серверную подписку, список маршрутизации (domain/IP/CIDR) или неподдерживаемый формат."
  },
  {
    "id": "src-23",
    "name": "КIЗЯК VPN — v7",
    "urls": [
      "https://raw.githubusercontent.com/Maskkost93/kizyak-vpn-4.0/main/kizyakbeta7.txt",
      "https://fastly.jsdelivr.net/gh/Maskkost93/kizyak-vpn-4.0@main/kizyakbeta7.txt",
      "https://cdn.jsdelivr.net/gh/Maskkost93/kizyak-vpn-4.0@main/kizyakbeta7.txt",
      "https://raw.githubusercontent.com/Maskkost93/kizyak-vpn-4.0/refs/heads/main/kizyakbeta7.txt"
    ],
    "roleHint": "unclassified_pending_content_inspection",
    "description": "Имя источника не является доказательством формата. Загрузить содержимое, определить фактический формат и классифицировать как серверную подписку, список маршрутизации (domain/IP/CIDR) или неподдерживаемый формат."
  },
  {
    "id": "src-24",
    "name": "КIЗЯК VPN — v6",
    "urls": [
      "https://raw.githubusercontent.com/Maskkost93/kizyak-vpn-4.0/main/kizyakbeta6.txt",
      "https://fastly.jsdelivr.net/gh/Maskkost93/kizyak-vpn-4.0@main/kizyakbeta6.txt",
      "https://cdn.jsdelivr.net/gh/Maskkost93/kizyak-vpn-4.0@main/kizyakbeta6.txt",
      "https://raw.githubusercontent.com/Maskkost93/kizyak-vpn-4.0/refs/heads/main/kizyakbeta6.txt"
    ],
    "roleHint": "unclassified_pending_content_inspection",
    "description": "Имя источника не является доказательством формата. Загрузить содержимое, определить фактический формат и классифицировать как серверную подписку, список маршрутизации (domain/IP/CIDR) или неподдерживаемый формат."
  },
  {
    "id": "src-25",
    "name": "КIЗЯК VPN — v6 BLACKLIST",
    "urls": [
      "https://raw.githubusercontent.com/Maskkost93/kizyak-vpn-4.0/main/kizyakbeta6BL.txt",
      "https://fastly.jsdelivr.net/gh/Maskkost93/kizyak-vpn-4.0@main/kizyakbeta6BL.txt",
      "https://raw.githubusercontent.com/Maskkost93/kizyak-vpn-4.0/refs/heads/main/kizyakbeta6BL.txt"
    ],
    "roleHint": "unclassified_pending_content_inspection",
    "description": "Имя источника не является доказательством формата. Загрузить содержимое, определить фактический формат и классифицировать как серверную подписку, список маршрутизации (domain/IP/CIDR) или неподдерживаемый формат."
  },
  {
    "id": "src-26",
    "name": "КIЗЯК VPN — v8",
    "urls": [
      "https://raw.githubusercontent.com/Maskkost93/kizyak-vpn-4.0/main/kizyakbeta8.txt",
      "https://fastly.jsdelivr.net/gh/Maskkost93/kizyak-vpn-4.0@main/kizyakbeta8.txt",
      "https://raw.githubusercontent.com/Maskkost93/kizyak-vpn-4.0/refs/heads/main/kizyakbeta8.txt"
    ],
    "roleHint": "unclassified_pending_content_inspection",
    "description": "Имя источника не является доказательством формата. Загрузить содержимое, определить фактический формат и классифицировать как серверную подписку, список маршрутизации (domain/IP/CIDR) или неподдерживаемый формат."
  }
];
