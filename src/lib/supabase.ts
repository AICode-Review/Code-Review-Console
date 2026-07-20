import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Null when Supabase env vars are absent — the console then shows a "not configured" state instead of a sign-in form. */
export const supabase: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null;
