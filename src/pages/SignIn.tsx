import { useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";

type Mode = "signin" | "signup";

export default function SignIn() {
  const { authenticated, loading, configured, signInWithGitHub, signInWithBitbucket, signInWithPassword, signUpWithPassword } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmationSent, setConfirmationSent] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setConfirmationSent(false);
    setSubmitting(true);
    try {
      const result = mode === "signin" ? await signInWithPassword(email, password) : await signUpWithPassword(email, password);
      if (result.error) setError(result.error.message);
      else if (result.needsEmailConfirmation) setConfirmationSent(true);
    } finally {
      setSubmitting(false);
    }
  }

  // A successful signInWithPassword/OAuth updates the session (useAuth's onAuthStateChange
  // listener) but doesn't navigate anywhere on its own — this is what actually leaves /signin
  // once authenticated. ProtectedShell (App.tsx) then does the real admin-access check.
  if (!loading && authenticated) return <Navigate to="/" replace />;

  return (
    <div className="relative flex min-h-screen items-center justify-center px-6">
      <button
        type="button"
        onClick={toggleTheme}
        className="absolute right-4 top-4 rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
        aria-label={theme === "light" ? "Switch to dark theme" : "Switch to light theme"}
      >
        {theme === "light" ? "Dark mode" : "Light mode"}
      </button>

      <div className="w-full max-w-sm">
        <p className="text-lg font-semibold tracking-tight text-zinc-50">CodeFerret Admin</p>
        <p className="mt-1.5 text-sm text-zinc-400">Sign in with your platform admin account.</p>

        {!configured ? (
          <p className="mt-6 rounded-lg border border-amber-900 bg-amber-950/50 px-3 py-2 text-sm text-amber-400">
            Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in console/.env to enable sign-in.
          </p>
        ) : (
          <>
            <form onSubmit={(e) => void handleSubmit(e)} className="mt-8 flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm text-zinc-300">
                Email
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-zinc-300">
                Password
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                />
              </label>

              {error && <p className="text-sm text-red-400">{error}</p>}
              {confirmationSent && (
                <p className="text-sm text-emerald-400">Account created — check your email to confirm it, then sign in.</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-1 flex items-center justify-center gap-2.5 rounded-lg bg-zinc-50 px-5 py-2.5 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-60"
              >
                {submitting ? "…" : mode === "signin" ? "Sign in" : "Create account"}
              </button>
            </form>

            <button
              type="button"
              onClick={() => {
                setMode((m) => (m === "signin" ? "signup" : "signin"));
                setError(null);
                setConfirmationSent(false);
              }}
              className="mt-3 text-xs text-zinc-500 hover:text-zinc-300"
            >
              {mode === "signin" ? "Need an account? Create one" : "Already have an account? Sign in"}
            </button>

            <div className="mt-6 flex items-center gap-3 text-xs text-zinc-600">
              <span className="h-px flex-1 bg-zinc-800" />
              or
              <span className="h-px flex-1 bg-zinc-800" />
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => void signInWithGitHub()}
                className="flex items-center justify-center gap-2.5 rounded-lg border border-zinc-700 bg-zinc-900 px-5 py-2.5 text-sm font-medium text-zinc-300 hover:border-zinc-600"
              >
                Continue with GitHub
              </button>
              <button
                type="button"
                onClick={() => void signInWithBitbucket()}
                className="flex items-center justify-center gap-2.5 rounded-lg border border-zinc-700 bg-zinc-900 px-5 py-2.5 text-sm font-medium text-zinc-300 hover:border-zinc-600"
              >
                Continue with Bitbucket
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
