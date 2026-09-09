import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { AdminMe } from "../lib/types";

/** Current platform-admin identity (users.id) — used to label "you" on the Admins page. */
export function useAdminMe() {
  return useQuery({
    queryKey: ["admin", "me"],
    queryFn: () => api<AdminMe>("/api/admin/me"),
    staleTime: 60_000,
  });
}
