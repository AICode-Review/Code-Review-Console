import { Component, type ErrorInfo, type ReactNode } from "react";
import { captureError } from "../observability/sentry";

interface Props {
  children: ReactNode;
  /** Noun used in the fallback copy, e.g. "page" or "console". Defaults to "page". */
  scope?: string;
}

interface State {
  error: Error | null;
}

/**
 * Class component is required here — React has no hook equivalent for componentDidCatch /
 * getDerivedStateFromError. Uses the `.console-shell`-scoped `--console-*` tokens with an
 * explicit dark-mode fallback in each var() call, so the fallback still renders correctly
 * even in the (extreme edge case) scenario of a crash above ThemeProvider's `.console-shell`
 * wrapper — this is meant to sit at the very top of the tree (main.tsx), so it can't assume
 * anything else has mounted successfully.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
    captureError(error, { componentStack: info.componentStack, scope: this.props.scope });
  }

  reset = (): void => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="flex min-h-screen flex-1 flex-col items-center justify-center gap-4 bg-[var(--console-bg,#09090b)] px-6 text-center text-[var(--console-fg,#fafafa)]">
        <div className="max-w-md rounded-2xl border border-zinc-800 bg-[var(--console-sidebar,#18181b)] p-8">
          <p className="text-lg font-semibold">Something went wrong</p>
          <p className="mt-2 text-sm text-zinc-500">
            This {this.props.scope ?? "page"} hit an unexpected error. Nothing else was affected —
            try again, or reload the console.
          </p>
          {import.meta.env.DEV && (
            <pre className="mt-4 max-h-32 overflow-auto rounded-lg bg-black/20 p-3 text-left text-xs text-red-400">
              {error.message}
            </pre>
          )}
          <div className="mt-5 flex justify-center gap-2">
            <button
              type="button"
              onClick={this.reset}
              className="rounded-lg bg-zinc-50 px-4 py-2 text-sm font-medium text-zinc-900"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-200"
            >
              Reload console
            </button>
          </div>
        </div>
      </div>
    );
  }
}
