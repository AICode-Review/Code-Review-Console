import { useEffect, useState } from "react";

/**
 * True once `loading` has stayed true for longer than `delayMs`. The backend runs on a
 * Render tier that hibernates after ~15 minutes idle (confirmed via its own internal
 * hostname, which literally contains "hibernate") — the first request after that can take
 * 30-60+ seconds to wake it. A bare spinner for that long reads as broken; this lets the UI
 * switch to an explicit "waking up the server" message instead, once it's clearly not a
 * normal fast load.
 */
export function useSlowLoad(loading: boolean, delayMs = 4000): boolean {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!loading) {
      setSlow(false);
      return;
    }
    const timer = window.setTimeout(() => setSlow(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [loading, delayMs]);

  return slow;
}
