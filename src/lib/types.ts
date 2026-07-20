/** Shapes mirrored from backend/src/db/adminRepositories.ts — backend is the source of truth. */

export interface PlatformOverview {
  totalOrgs: number;
  totalUsers: number;
  subscriptionsByTier: { tier: string; count: number }[];
  mrrUsd: number;
  reviewsThisMonth: number;
  llmSpendThisMonthUsd: number;
  anthropicSpendThisMonthUsd: number;
  openaiSpendThisMonthUsd: number;
  periodStart: string;
  periodEnd: string;
}

export interface AdminOrgSummary {
  id: string;
  name: string;
  kind: "individual" | "team";
  platform: "github" | "bitbucket";
  plan: "free" | "pro" | "team";
  seats: number;
  createdAt: string;
  subscriptionStatus: string | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
}

export interface OrgUsage {
  plan: "free" | "pro" | "team";
  seats: number;
  used: number;
  quota: number | null;
  remaining: number | null;
  periodStart: string;
  periodEnd: string;
  blocked: boolean;
}

export interface AdminRunSummary {
  id: string;
  status: string;
  startedAt: string;
  finishedAt: string | null;
  candidates: number;
  verified: number;
  posted: number;
  digest: number;
  llmCostUsd: number;
  anthropicCostUsd: number;
  openaiCostUsd: number;
  latencyMs: number | null;
  error: string | null;
  prNumber?: number;
  repoName?: string;
  orgName?: string;
}

export interface AdminOrgDetail extends AdminOrgSummary {
  members: { userId: string; email: string | null; handle: string | null; role: string }[];
  repos: { id: string; name: string; indexStatus: string }[];
  usage: OrgUsage;
  recentRuns: AdminRunSummary[];
}

export interface AdminUserSummary {
  id: string;
  email: string | null;
  handle: string | null;
  seatActive: boolean;
  isPlatformAdmin: boolean;
  createdAt: string;
  orgs: { id: string; name: string; role: string }[];
}

export interface AdminSubscriptionSummary {
  orgId: string;
  orgName: string;
  tier: string;
  status: string;
  seats: number;
  razorpayCustomerId: string | null;
  razorpaySubId: string | null;
}

export interface AdminAuditLogEntry {
  id: string;
  orgId: string | null;
  orgName?: string;
  actor: string;
  action: string;
  target: string | null;
  meta: Record<string, unknown>;
  createdAt: string;
}

export interface AdminMe {
  id: string;
  email: string | null;
  isPlatformAdmin: boolean;
}
