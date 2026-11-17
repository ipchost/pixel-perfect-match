/** UTF-8-safe base64 helpers (browser + workerd + node). Accepts url-safe alphabet and missing padding. */
export function b64encode(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function b64decode(input: string): string {
  let s = input.trim().replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  const pad = s.length % 4;
  if (pad === 1) throw new Error("invalid base64 length");
  if (pad) s += "=".repeat(4 - pad);
  const bin = atob(s);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export function looksLikeBase64(input: string): boolean {
  const s = input.trim().replace(/\s+/g, "");
  return s.length >= 16 && /^[A-Za-z0-9+/_-]+=*$/.test(s);
}
