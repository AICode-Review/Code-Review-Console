import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export interface VisitorStats {
  siteVisitors: number;
  loggedInMembers: number;
}

export type VisitorRange = "today" | "7d" | "30d";

/** Start of the current UTC day — matches the rest of the console's UTC-based period
 * conventions (Overview's billing period, getOrgUsage's monthly cycle). */
function startOfTodayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function sinceForRange(range: VisitorRange): Date {
  if (range === "today") return startOfTodayUtc();
  const days = range === "7d" ? 7 : 30;
  return new Date(Date.now() - days * 86_400_000);
}

export function useVisitorStats(range: VisitorRange) {
  const since = sinceForRange(range).toISOString();
  return useQuery({
    queryKey: ["admin", "visitors", range],
    queryFn: () => api<VisitorStats>(`/api/admin/visitors?since=${encodeURIComponent(since)}`),
  });
}
