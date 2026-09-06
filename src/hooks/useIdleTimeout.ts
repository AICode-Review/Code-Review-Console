import { useEffect, useRef } from "react";

const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"] as const;

/**
 * Auto-signs out an idle admin session. A signed-in platform admin (able to suspend orgs,
 * change billing, grant/revoke other admins) previously stayed authenticated indefinitely
 * on a shared/unattended machine — the only guard on any of those actions was a same-
 * session confirm click, never proof the same person is still at the keyboard. Resets on
 * any real user activity; `enabled: false` (e.g. before sign-in, where there's no session
 * to expire) tears down listeners and does nothing.
 */
export function useIdleTimeout(onIdle: () => void, timeoutMs: number, enabled: boolean): void {
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout>;
    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(() => onIdleRef.current(), timeoutMs);
    };
    reset();
    for (const event of ACTIVITY_EVENTS) window.addEventListener(event, reset, { passive: true });
    return () => {
      clearTimeout(timer);
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, reset);
    };
  }, [enabled, timeoutMs]);
}
