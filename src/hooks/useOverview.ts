import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { PlatformOverview } from "../lib/types";

export type { PlatformOverview };

/** Also doubles as the admin-access gate (App.tsx) — a 403 here means "signed in, not a platform admin." */
export function useOverview(enabled = true) {
  return useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => api<PlatformOverview>("/api/admin/overview"),
    retry: false,
    enabled,
  });
}
