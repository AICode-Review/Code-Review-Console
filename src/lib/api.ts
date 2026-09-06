import { supabase } from "./supabase";

/** Undefined (not a silent localhost fallback) when VITE_API_URL is missing at build time —
 * a misconfigured Vercel env var used to bake in `http://localhost:4000` and fail every
 * request with an opaque network error, with nothing pointing at the actual cause. api()
 * now throws a clear, specific error immediately instead. */
const API_URL = import.meta.env.VITE_API_URL as string | undefined;

export function apiConfigured(): boolean {
  return Boolean(API_URL);
}

export function apiUrl(path: string): string {
  if (!API_URL) throw new Error("VITE_API_URL is not configured for this deployment");
  return `${API_URL.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Thrown by api() on a non-2xx response — a 403 here means "signed in, but not a platform admin." */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: { error?: string; message?: string } | undefined,
  ) {
    super(body?.message ?? body?.error ?? `API ${status}`);
    this.name = "ApiError";
  }
}

export function isForbiddenError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 403;
}

/** Fetch from the backend's /api/admin/* routes with the Supabase session JWT attached. */
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  const token = session?.access_token;
  const res = await fetch(apiUrl(path), {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => undefined)) as { error?: string; message?: string } | undefined;
    throw new ApiError(res.status, body);
  }
  return (await res.json()) as T;
}
