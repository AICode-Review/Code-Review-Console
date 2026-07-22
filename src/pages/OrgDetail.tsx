import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import type { AdminOrgDetail } from "../lib/types";
import { useClientPagination } from "../hooks/useClientPagination";
import { RunLinkHint, RunsTable } from "../components/RunsTable";
import {
  ActionButton,
  Badge,
  Card,
  ConfirmDialog,
  DataPanel,
  EmptyState,
  ErrorText,
  LoadingText,
  PageHeader,
  PageShell,
  Pagination,
  SearchInput,
  Table,
  Td,
  Th,
  Toolbar,
  fmtDate,
  fmtInr,
  planTone,
  statusTone,
} from "../components/ui";

type DialogKind = "suspend" | "unsuspend" | "cancel" | "change-pro" | "change-team" | null;
type Tab = "summary" | "members" | "repos" | "runs";

const TABS: { id: Tab; label: string }[] = [
  { id: "summary", label: "Summary" },
  { id: "members", label: "Members" },
  { id: "repos", label: "Repos" },
  { id: "runs", label: "Recent runs" },
];

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-zinc-500">{label}</dt>
      <dd className="mt-1 text-sm text-zinc-200">{children}</dd>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950/50 px-3 py-2.5">
      <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums text-zinc-50">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-zinc-500">{sub}</p>}
    </div>
  );
}

export default function OrgDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "org", id],
    queryFn: () => api<AdminOrgDetail>(`/api/admin/orgs/${id}`),
    enabled: !!id,
  });

  const [tab, setTab] = useState<Tab>("summary");
  const [memberQuery, setMemberQuery] = useState("");
  const [repoQuery, setRepoQuery] = useState("");
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const members = useMemo(() => {
    const needle = memberQuery.trim().toLowerCase();
    return (data?.members ?? []).filter((m) => {
      if (!needle) return true;
      return `${m.email ?? ""} ${m.handle ?? ""} ${m.role}`.toLowerCase().includes(needle);
    });
  }, [data?.members, memberQuery]);

  const repos = useMemo(() => {
    const needle = repoQuery.trim().toLowerCase();
    return (data?.repos ?? []).filter((r) => {
      if (!needle) return true;
      return `${r.name} ${r.indexStatus}`.toLowerCase().includes(needle);
    });
  }, [data?.repos, repoQuery]);

  const memberPaging = useClientPagination(members, 25);
  const repoPaging = useClientPagination(repos, 25);

  const runSpend = useMemo(
    () => (data?.recentRuns ?? []).reduce((n, r) => n + r.llmCostUsd, 0),
    [data?.recentRuns],
  );
  const runAnthropic = useMemo(
    () => (data?.recentRuns ?? []).reduce((n, r) => n + r.anthropicCostUsd, 0),
    [data?.recentRuns],
  );
  const runOpenai = useMemo(
    () => (data?.recentRuns ?? []).reduce((n, r) => n + r.openaiCostUsd, 0),
    [data?.recentRuns],
  );

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["admin", "org", id] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "orgs"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "billing"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "audit"] }),
      queryClient.invalidateQueries({ queryKey: ["admin", "overview"] }),
    ]);
  };

  const mutate = useMutation({
    mutationFn: async () => {
      if (!id || !dialog) return;
      if (dialog === "suspend") {
        return api(`/api/admin/orgs/${id}/suspend`, {
          method: "POST",
          body: JSON.stringify({ reason: suspendReason.trim() || undefined }),
        });
      }
      if (dialog === "unsuspend") {
        return api(`/api/admin/orgs/${id}/unsuspend`, { method: "POST" });
      }
      if (dialog === "cancel") {
        return api(`/api/admin/orgs/${id}/billing/cancel`, { method: "POST" });
      }
      if (dialog === "change-pro" || dialog === "change-team") {
        return api(`/api/admin/orgs/${id}/billing/change-plan`, {
          method: "POST",
          body: JSON.stringify({ tier: dialog === "change-pro" ? "pro" : "team" }),
        });
      }
    },
    onSuccess: async () => {
      setDialog(null);
      setSuspendReason("");
      setActionError(null);
      await invalidate();
    },
    onError: (err) => {
      setActionError(err instanceof ApiError ? err.message : (err as Error).message);
    },
  });

  if (isLoading) return <LoadingText>Loading org…</LoadingText>;
  if (error) return <ErrorText>Failed to load org: {(error as Error).message}</ErrorText>;
  if (!data) return null;

  const usagePct =
    data.usage.quota !== null && data.usage.quota > 0
      ? Math.min(100, Math.round((data.usage.used / data.usage.quota) * 100))
      : null;
  const isSuspended = !!data.suspendedAt;
  const hasLiveSub = data.subscriptionStatus === "active" || data.subscriptionStatus === "trialing";

  const dialogCopy: Record<Exclude<DialogKind, null>, { title: string; body: string; confirm: string; tone: "danger" | "primary" }> = {
    suspend: {
      title: "Suspend organization",
      body: `Block all reviews for ${data.name}. Existing data is kept; webhooks and manual triggers will fail closed until unsuspended.`,
      confirm: "Suspend",
      tone: "danger",
    },
    unsuspend: {
      title: "Unsuspend organization",
      body: `Restore review access for ${data.name}.`,
      confirm: "Unsuspend",
      tone: "primary",
    },
    cancel: {
      title: "Cancel subscription",
      body: `Cancel Razorpay subscription for ${data.name} at cycle end (same as owner cancel).`,
      confirm: "Cancel at cycle end",
      tone: "danger",
    },
    "change-pro": {
      title: "Change plan to Pro",
      body: `Switch ${data.name} to the Pro Razorpay plan immediately.`,
      confirm: "Switch to Pro",
      tone: "primary",
    },
    "change-team": {
      title: "Change plan to Team",
      body: `Switch ${data.name} to the Team Razorpay plan immediately.`,
      confirm: "Switch to Team",
      tone: "primary",
    },
  };

  const tabLabel = (t: Tab) => {
    if (t === "members") return `Members (${data.members.length})`;
    if (t === "repos") return `Repos (${data.repos.length})`;
    if (t === "runs") return `Recent runs (${data.recentRuns.length})`;
    return "Summary";
  };

  return (
    <PageShell>
      <div className="shrink-0 space-y-3">
        <div>
          <Link to="/orgs" className="text-xs text-zinc-500 hover:text-zinc-300">
            ← Orgs
          </Link>
          <PageHeader
            title={data.name}
            subtitle={`${data.kind} · ${data.platform} · created ${fmtDate(data.createdAt)}`}
            actions={
              <Toolbar>
                {isSuspended ? (
                  <ActionButton
                    tone="primary"
                    onClick={() => {
                      setActionError(null);
                      setDialog("unsuspend");
                    }}
                  >
                    Unsuspend
                  </ActionButton>
                ) : (
                  <ActionButton
                    tone="danger"
                    onClick={() => {
                      setActionError(null);
                      setDialog("suspend");
                    }}
                  >
                    Suspend
                  </ActionButton>
                )}
              </Toolbar>
            }
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge tone={planTone(data.plan)}>{data.plan}</Badge>
            {data.subscriptionStatus && <Badge tone={statusTone(data.subscriptionStatus)}>{data.subscriptionStatus}</Badge>}
            {isSuspended && <Badge tone="bad">suspended</Badge>}
            <span className="text-sm text-zinc-500">{data.seats} seats</span>
          </div>
          {isSuspended && (
            <p className="mt-2 text-sm text-red-400">
              Suspended {fmtDate(data.suspendedAt!)}
              {data.suspendedReason ? ` — ${data.suspendedReason}` : ""}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-1 border-b border-zinc-800 pb-px" role="tablist" aria-label="Organization sections">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setTab(t.id)}
                className={`rounded-t-md px-3 py-2 text-sm font-medium transition ${
                  active
                    ? "border border-b-0 border-zinc-700 bg-zinc-900 text-zinc-50"
                    : "text-zinc-500 hover:text-zinc-200"
                }`}
              >
                {tabLabel(t.id)}
              </button>
            );
          })}
        </div>
      </div>

      {tab === "summary" && (
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <h2 className="text-sm font-semibold text-zinc-100">Organization</h2>
              <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Kind">{data.kind}</Field>
                <Field label="Platform">{data.platform}</Field>
                <Field label="Plan">
                  <Badge tone={planTone(data.plan)}>{data.plan}</Badge>
                </Field>
                <Field label="Seats">{data.seats}</Field>
                <Field label="Created">{fmtDate(data.createdAt)}</Field>
                <Field label="Org ID">
                  <span className="break-all font-mono text-xs text-zinc-400">{data.id}</span>
                </Field>
              </dl>
            </Card>

            <Card className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-100">Billing</h2>
                  <p className="mt-1 text-sm text-zinc-400">
                    {hasLiveSub
                      ? `Live ${data.plan} subscription — cancel at cycle end or change plan via Razorpay.`
                      : "No live paid subscription on file (checkout is customer-owned)."}
                  </p>
                  {data.subscriptionStatus && (
                    <p className="mt-2 text-sm text-zinc-300">
                      Status: <Badge tone={statusTone(data.subscriptionStatus)}>{data.subscriptionStatus}</Badge>
                    </p>
                  )}
                </div>
                {hasLiveSub && (
                  <Toolbar>
                    <ActionButton
                      onClick={() => {
                        setActionError(null);
                        setDialog("change-pro");
                      }}
                      disabled={data.plan === "pro"}
                    >
                      → Pro
                    </ActionButton>
                    <ActionButton
                      onClick={() => {
                        setActionError(null);
                        setDialog("change-team");
                      }}
                      disabled={data.plan === "team"}
                    >
                      → Team
                    </ActionButton>
                    <ActionButton
                      tone="danger"
                      onClick={() => {
                        setActionError(null);
                        setDialog("cancel");
                      }}
                    >
                      Cancel sub
                    </ActionButton>
                  </Toolbar>
                )}
              </div>
            </Card>
          </div>

          <Card className="p-4">
            <h2 className="text-sm font-semibold text-zinc-100">Usage this month</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric
                label="Reviews used"
                value={
                  data.usage.quota === null ? String(data.usage.used) : `${data.usage.used} / ${data.usage.quota}`
                }
                sub={
                  isSuspended
                    ? "org suspended — reviews blocked"
                    : data.usage.blocked
                      ? "quota exceeded — reviews blocked"
                      : data.usage.remaining !== null
                        ? `${data.usage.remaining} remaining`
                        : "unlimited (self-hosted)"
                }
              />
              <Metric label="Members" value={String(data.members.length)} />
              <Metric label="Repos" value={String(data.repos.length)} />
              <Metric label="Recent runs" value={String(data.recentRuns.length)} />
            </div>
            {usagePct !== null && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-zinc-500">
                  <span>Quota burn</span>
                  <span className="tabular-nums">{usagePct}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded bg-zinc-800">
                  <div
                    className={`h-full rounded ${data.usage.blocked ? "bg-red-500" : usagePct >= 80 ? "bg-amber-500" : "bg-emerald-500"}`}
                    style={{ width: `${usagePct}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-zinc-600">
                  Period {fmtDate(data.usage.periodStart)} → {fmtDate(data.usage.periodEnd)}
                </p>
              </div>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="text-sm font-semibold text-zinc-100">Recent run spend</h2>
            <p className="mt-1 text-xs text-zinc-500">Last {data.recentRuns.length} runs · INR</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <Metric label="Total" value={fmtInr(runSpend)} />
              <Metric label="Anthropic" value={fmtInr(runAnthropic)} />
              <Metric label="OpenAI" value={fmtInr(runOpenai)} />
            </div>
          </Card>
        </div>
      )}

      {tab === "members" && (
        <DataPanel
          toolbar={
            <Toolbar>
              <SearchInput
                value={memberQuery}
                onChange={(v) => {
                  setMemberQuery(v);
                  memberPaging.resetPage();
                }}
                placeholder="Filter members…"
              />
            </Toolbar>
          }
          footer={
            <Pagination
              page={memberPaging.page}
              totalPages={memberPaging.totalPages}
              onPageChange={memberPaging.setPage}
              totalItems={memberPaging.total}
              pageSize={memberPaging.pageSize}
              onPageSizeChange={memberPaging.setPageSize}
            />
          }
        >
          {memberPaging.pageItems.length === 0 ? (
            <EmptyState>No members match.</EmptyState>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>User</Th>
                  <Th>Role</Th>
                </tr>
              </thead>
              <tbody>
                {memberPaging.pageItems.map((m) => (
                  <tr key={m.userId} className="hover:bg-zinc-900/50">
                    <Td>
                      <div>{m.email ?? m.handle ?? m.userId}</div>
                      {m.email && m.handle && <div className="text-xs text-zinc-500">@{m.handle}</div>}
                    </Td>
                    <Td>
                      <Badge>{m.role}</Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </DataPanel>
      )}

      {tab === "repos" && (
        <DataPanel
          toolbar={
            <Toolbar>
              <SearchInput
                value={repoQuery}
                onChange={(v) => {
                  setRepoQuery(v);
                  repoPaging.resetPage();
                }}
                placeholder="Filter repos…"
              />
            </Toolbar>
          }
          footer={
            <Pagination
              page={repoPaging.page}
              totalPages={repoPaging.totalPages}
              onPageChange={repoPaging.setPage}
              totalItems={repoPaging.total}
              pageSize={repoPaging.pageSize}
              onPageSizeChange={repoPaging.setPageSize}
            />
          }
        >
          {repoPaging.pageItems.length === 0 ? (
            <EmptyState>No repos match.</EmptyState>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Index status</Th>
                </tr>
              </thead>
              <tbody>
                {repoPaging.pageItems.map((r) => (
                  <tr key={r.id} className="hover:bg-zinc-900/50">
                    <Td>{r.name}</Td>
                    <Td>
                      <Badge tone={statusTone(r.indexStatus)}>{r.indexStatus}</Badge>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </DataPanel>
      )}

      {tab === "runs" && (
        <DataPanel footer={<RunLinkHint />}>
          <RunsTable runs={data.recentRuns} showOrg={false} />
        </DataPanel>
      )}

      {dialog && (
        <ConfirmDialog
          open
          title={dialogCopy[dialog].title}
          body={dialogCopy[dialog].body}
          confirmLabel={dialogCopy[dialog].confirm}
          tone={dialogCopy[dialog].tone}
          busy={mutate.isPending}
          error={actionError}
          onCancel={() => {
            setDialog(null);
            setSuspendReason("");
            setActionError(null);
          }}
          onConfirm={() => mutate.mutate()}
        >
          {dialog === "suspend" && (
            <label className="block text-xs text-zinc-500">
              Reason (optional)
              <input
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                maxLength={500}
                className="mt-1 w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 outline-none focus:border-zinc-500"
                placeholder="e.g. unpaid invoice, abuse report…"
              />
            </label>
          )}
        </ConfirmDialog>
      )}
    </PageShell>
  );
}
