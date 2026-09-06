import { useEffect, useState } from "react";
import { captureError } from "../observability/sentry";

interface Toast {
  id: number;
  message: string;
}

const AUTO_DISMISS_MS = 10000;
const MAX_TOASTS = 3;

/**
 * React's ErrorBoundary explicitly does NOT catch two classes of error: exceptions thrown
 * from event handlers, and unhandled promise rejections (async code) — this is documented
 * React behavior, not something a component-tree boundary can ever intercept. Neither one
 * unmounts the tree, so without this they fail completely silently (console-only, easy to
 * miss). This mounts once at the root, independent of <App/>'s own lifecycle, so it keeps
 * working even while an ErrorBoundary elsewhere is showing its fallback UI. It only ever
 * shows a small dismissible, auto-expiring notice — it never blocks interaction the way a
 * fallback screen does, because nothing here actually crashed.
 */
export function GlobalErrorWatcher() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    let nextId = 0;
    function push(message: string) {
      const id = nextId++;
      setToasts((prev) => [...prev.slice(-(MAX_TOASTS - 1)), { id, message }]);
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, AUTO_DISMISS_MS);
    }

    function onError(event: ErrorEvent) {
      console.error("[GlobalErrorWatcher] uncaught error:", event.error ?? event.message);
      captureError(event.error ?? new Error(String(event.message)), { kind: "window.error" });
      push("Something went wrong. Some part of the console may not have updated.");
    }
    function onRejection(event: PromiseRejectionEvent) {
      console.error("[GlobalErrorWatcher] unhandled promise rejection:", event.reason);
      captureError(event.reason, { kind: "unhandledrejection" });
      push("A background request failed unexpectedly. Some part of the console may not have updated.");
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  function dismiss(id: number) {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }

  if (toasts.length === 0) return null;

  return (
    <div
      style={{ position: "fixed", bottom: "1rem", right: "1rem", zIndex: 9999 }}
      className="flex flex-col gap-2"
      role="region"
      aria-label="Background error notifications"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className="flex max-w-sm items-start gap-3 rounded-xl border border-zinc-800 p-3 text-sm text-zinc-50 shadow-lg"
          style={{ background: "var(--console-sidebar,#18181b)" }}
        >
          <span className="flex-1">{t.message}</span>
          <button
            type="button"
            onClick={() => dismiss(t.id)}
            aria-label="Dismiss"
            className="shrink-0 text-lg leading-none text-zinc-500 hover:text-zinc-200"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
