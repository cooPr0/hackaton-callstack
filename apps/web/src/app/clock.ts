import { useEffect, useState } from "react";

/** Whole seconds until an epoch-ms deadline. Null when the server is not running a clock. */
export function remainingSeconds(deadline: number | null, now: number): number | null {
  if (deadline === null) return null;
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

/** `90` → `1:30`. The clock is the same in every language. */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

/** Re-renders while `deadline` is set so a 90s clue and a 60s stone count down. */
export function useRemaining(deadline: number | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (deadline === null) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [deadline]);
  return remainingSeconds(deadline, now);
}
