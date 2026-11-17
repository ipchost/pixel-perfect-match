/** Русские формы множественного числа: [1, 2-4, 5+] → «сервер», «сервера», «серверов». */
export function pluralRu(n: number, forms: [string, string, string]): string {
  const a = Math.abs(n) % 100;
  const b = a % 10;
  if (a > 10 && a < 20) return forms[2];
  if (b > 1 && b < 5) return forms[1];
  if (b === 1) return forms[0];
  return forms[2];
}

export function pluralEn(n: number, one: string, many: string): string {
  return Math.abs(n) === 1 ? one : many;
}
