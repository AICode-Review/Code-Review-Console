import { useEffect, useState } from "react";
import type { AuthError, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

/** Shape both signInWithPassword and signUp resolve to — enough for the sign-in form to show an error or a "check your email" state. */
export interface PasswordAuthResult {
  error: AuthError | null;
  /** True once a signUp call succeeds but leaves session null — Supabase's default "confirm your email" flow. */
  needsEmailConfirmation: boolean;
}

export interface AuthUser {
  email: string;
  name: string;
}

function userFromSession(session: Session): AuthUser {
  const email = session.user.email ?? "—";
  const meta = session.user.user_metadata as Record<string, unknown> | undefined;
  const name =
    (meta?.["full_name"] as string | undefined) ||
    (meta?.["name"] as string | undefined) ||
    (meta?.["user_name"] as string | undefined) ||
    email.split("@")[0] ||
    "User";
  return { email, name };
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return {
    configured: supabase !== null,
    authenticated: session !== null,
    loading,
    user: session ? userFromSession(session) : null,
    signInWithGitHub: () =>
      supabase
        ? supabase.auth.signInWithOAuth({ provider: "github", options: { redirectTo: window.location.origin } })
        : Promise.resolve(),
    signInWithBitbucket: () =>
      supabase
        ? supabase.auth.signInWithOAuth({ provider: "bitbucket", options: { redirectTo: window.location.origin } })
        : Promise.resolve(),
    signInWithPassword: async (email: string, password: string): Promise<PasswordAuthResult> => {
      if (!supabase) return { error: null, needsEmailConfirmation: false };
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return { error, needsEmailConfirmation: false };
    },
    /** Self-serve account creation — the intended path is still ADMIN_BOOTSTRAP_EMAILS granting is_platform_admin on first sign-in (see backend/.env.example); this just creates the Supabase Auth identity itself. */
    signUpWithPassword: async (email: string, password: string): Promise<PasswordAuthResult> => {
      if (!supabase) return { error: null, needsEmailConfirmation: false };
      const { data, error } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
      return { error, needsEmailConfirmation: !error && data.session === null };
    },
    signOut: () => (supabase ? supabase.auth.signOut() : Promise.resolve()),
  };
}
