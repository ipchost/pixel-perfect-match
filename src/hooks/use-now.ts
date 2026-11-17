import { useEffect, useState } from "react";

/** Текущее время, обновляемое с интервалом (для «N минут назад», таймера сессии). */
export function useNow(intervalMs = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
