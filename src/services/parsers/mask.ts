/**
 * Маскирование секретов перед выводом в UI, журнал или диагностический отчёт.
 * Применять ко ВСЕМ строкам, которые могут содержать URI, токены или пароли.
 */
const UUID_RE = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const URI_RE = /\b(vless|vmess|trojan|ss):\/\/[^\s"'<>]+/gi;
const QUERY_SECRET_RE =
  /([?&](?:token|key|password|pass|secret|uuid|auth|sig|signature|access_token)=)[^&\s#]+/gi;
const LONG_TOKEN_RE = /\b[A-Za-z0-9_-]{24,}\b/g;

export function maskMiddle(value: string, keep = 3): string {
  if (value.length <= keep * 2) return "•".repeat(Math.max(4, value.length));
  return `${value.slice(0, keep)}•••${value.slice(-keep)}`;
}

/** Маскирует URL подписки: оставляет схему и хост, путь и параметры заменяются. */
export function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.split("/").filter(Boolean);
    const maskedPath = path.map((seg) => (seg.length > 8 ? maskMiddle(seg, 2) : seg)).join("/");
    const hasQuery = u.search.length > 1;
    return `${u.protocol}//${u.host}${maskedPath ? `/${maskedPath}` : ""}${hasQuery ? "?•••" : ""}`;
  } catch {
    return maskMiddle(url, 6);
  }
}

export function maskSecrets(text: string): string {
  return text
    .replace(URI_RE, (_m, scheme: string) => `${scheme}://•••[скрыто]`)
    .replace(UUID_RE, (m) => maskMiddle(m, 4))
    .replace(QUERY_SECRET_RE, "$1•••")
    .replace(LONG_TOKEN_RE, (m) => maskMiddle(m, 3));
}
