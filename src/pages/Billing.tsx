import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ChartCard, DonutChart, VerticalBarChart } from "../components/charts";
import { api, ApiError } from "../lib/api";
import type { AdminSubscriptionSummary } from "../lib/types";
import { useClientPagination } from "../hooks/useClientPagination";
import { useOverview } from "../hooks/useOverview";
import { PLAN_COLORS, STATUS_COLORS, countBy, sumBy, withColors } from "../lib/analytics";
import {
  ActionButton,
  Badge,
  ConfirmDialog,
  DataPanel,
  EmptyState,
  ErrorText,
  LoadingText,
  PageHeader,
  PageShell,
  Pagination,
  SearchInput,
  SelectFilter,
  StatCard,
  Table,
  Td,
  Th,
  Toolbar,
  fmtInr,
  statusTone,
} from "../components/ui";

const TIER_PRICE: Record<string, number> = { pro: 15, team: 25 };

type BillingDialog = { orgId: string; orgName: string; kind: "cancel" | "pro" | "team" } | null;

export default function Billing() {
  const overview = useOverview();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "billing"],
    queryFn: () => api<{ subscriptions: AdminSubscriptionSummary[] }>("/api/admin/billing"),
  });

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [razorpayFilter, setRazorpayFilter] = useState("all");
  const [dialog, setDialog] = useState<BillingDialog>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (data?.subscriptions ?? []).filter((s) => {
      const hay = `${s.orgName} ${s.razorpaySubId ?? ""} ${s.razorpayCustomerId ?? ""}`.toLowerCase();
      const matchesQuery = !needle || hay.includes(needle);
      const matchesStatus = statusFilter === "all" || s.status === statusFilter;
      const matchesTier = tierFilter === "all" || s.tier === tierFilter;
      const hasRz = !!(s.razorpaySubId || s.razorpayCustomerId);
      const matchesRz =
        razorpayFilter === "all" || (razorpayFilter === "linked" ? hasRz : !hasRz);
      return matchesQuery && matchesStatus && matchesTier && matchesRz;
    });
  }, [data?.subscriptions, query, statusFilter, tierFilter, razorpayFilter]);

  const paging = useClientPagination(filtered);

  const tracked = useMemo(() => {
    const subs = data?.subscriptions ?? [];
    const active = subs.filter((s) => s.status === "active" || s.status === "trialing");
    const cancelled = subs.filter((s) => s.status === "cancelled" || s.status === "halted");
    const seats = active.reduce((n, s) => n + Math.max(1, s.seats), 0);
    return { total: subs.length, active: active.length, cancelled: cancelled.length, seats };
  }, [data?.subscriptions]);

  const charts = useMemo(() => {
    const status = withColors(countBy(filtered, (s) => s.status), STATUS_COLORS);
    const tier = withColors(countBy(filtered, (s) => s.tier), PLAN_COLORS);
    const mrr = sumBy(
      filtered.filter((s) => s.status === "active" || s.status === "trialing"),
      (s) => s.tier,
      (s) => (TIER_PRICE[s.tier] ?? 0) * Math.max(1, s.seats),
    ).map((r, i) => ({
      name: r.name,
      value: r.value,
      fill: PLAN_COLORS[r.name] ?? ["#60a5fa", "#34d399"][i % 2],
    }));
    return { status, tier, mrr };
  }, [filtered]);

  const mutate = useMutation({
    mutationFn: async () => {
      if (!dialog) return;
      if (dialog.kind === "cancel") {
        return api(`/api/admin/orgs/${dialog.orgId}/billing/cancel`, { method: "POST" });
      }
      return api(`/api/admin/orgs/${dialog.orgId}/billing/change-plan`, {
        method: "POST",
        body: JSON.stringify({ tier: dialog.kind }),
      });
    },
    onSuccess: async () => {
      setDialog(null);
      setActionError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "billing"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "orgs"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "overview"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "audit"] }),
      ]);
    },
    onError: (err) => {
      setActionError(err instanceof ApiError ? err.message : (err as Error).message);
    },
  });

  const onQuery = (v: string) => {
    setQuery(v);
    paging.resetPage();
  };
  const reset = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    paging.resetPage();
  };

  if (isLoading) return <LoadingText>Loading subscriptions…</LoadingText>;
  if (error) return <ErrorText>Failed to load billing: {(error as Error).message}</ErrorText>;

  return (
    <PageShell>
      <PageHeader title="Billing" subtitle="Subscription tracking + operator cancel / change-plan (Razorpay)" />

      <div className="grid shrink-0 grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="MRR (est.)" value={fmtInr(overview.data?.mrrUsd ?? 0)} sub="active + trialing only · INR" />
        <StatCard label="Subscriptions" value={String(tracked.total)} sub={`${tracked.active} active`} />
        <StatCard label="Paid seats" value={String(tracked.seats)} sub="active + trialing" />
        <StatCard label="Cancelled / halted" value={String(tracked.cancelled)} />
      </div>

      <div className="grid shrink-0 gap-3 lg:grid-cols-3">
        <ChartCard title="Status (filtered)" className="!p-3" empty={charts.status.length === 0}>
          <DonutChart data={charts.status} height={120} />
        </ChartCard>
        <ChartCard title="Tier mix (filtered)" className="!p-3" empty={charts.tier.length === 0}>
          <DonutChart data={charts.tier} height={120} />
        </ChartCard>
        <ChartCard title="MRR by tier (filtered)" className="!p-3" empty={charts.mrr.length === 0}>
          <VerticalBarChart data={charts.mrr} dataKey="value" height={120} formatValue={(n) => fmtInr(n)} />
        </ChartCard>
      </div>

      <DataPanel
        toolbar={
          <Toolbar>
            <SearchInput value={query} onChange={onQuery} placeholder="Search org or Razorpay id…" />
            <SelectFilter
              label="Status"
              value={statusFilter}
              onChange={reset(setStatusFilter)}
              options={[
                { value: "all", label: "All" },
                { value: "active", label: "Active" },
                { value: "trialing", label: "Trialing" },
                { value: "cancelled", label: "Cancelled" },
                { value: "past_due", label: "Past due" },
                { value: "halted", label: "Halted" },
              ]}
            />
            <SelectFilter
              label="Tier"
              value={tierFilter}
              onChange={reset(setTierFilter)}
              options={[
                { value: "all", label: "All" },
                { value: "pro", label: "Pro" },
                { value: "team", label: "Team" },
                { value: "free", label: "Free" },
              ]}
            />
            <SelectFilter
              label="Razorpay"
              value={razorpayFilter}
              onChange={reset(setRazorpayFilter)}
              options={[
                { value: "all", label: "All" },
                { value: "linked", label: "Linked" },
                { value: "missing", label: "Missing IDs" },
              ]}
            />
          </Toolbar>
        }
        footer={
          <Pagination
            page={paging.page}
            totalPages={paging.totalPages}
            onPageChange={paging.setPage}
            totalItems={paging.total}
            pageSize={paging.pageSize}
            onPageSizeChange={paging.setPageSize}
          />
        }
      >
        {paging.pageItems.length === 0 ? (
          <EmptyState>No subscriptions match these filters.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Org</Th>
                <Th>Tier</Th>
                <Th>Status</Th>
                <Th align="right">Seats</Th>
                <Th align="right">Est. MRR</Th>
                <Th>Razorpay customer</Th>
                <Th>Razorpay sub</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {paging.pageItems.map((s) => {
                const price = TIER_PRICE[s.tier];
                const isLive = s.status === "active" || s.status === "trialing";
                const rowMrr = price && isLive ? price * Math.max(1, s.seats) : 0;
                return (
                  <tr key={`${s.orgId}-${s.razorpaySubId ?? s.status}`} className="hover:bg-zinc-900/50">
                    <Td>
                      <Link to={`/orgs/${s.orgId}`} className="font-medium text-zinc-100 hover:underline">
                        {s.orgName}
                      </Link>
                    </Td>
                    <Td>
                      <span className="capitalize">{s.tier}</span>
                    </Td>
                    <Td>
                      <Badge tone={statusTone(s.status)}>{s.status}</Badge>
                    </Td>
                    <Td align="right" className="tabular-nums">
                      {s.seats}
                    </Td>
                    <Td align="right" className="tabular-nums">
                      {rowMrr > 0 ? fmtInr(rowMrr) : <span className="text-zinc-600">—</span>}
                    </Td>
                    <Td className="max-w-[10rem] truncate font-mono text-xs text-zinc-400" title={s.razorpayCustomerId ?? undefined}>
                      {s.razorpayCustomerId ?? "—"}
                    </Td>
                    <Td className="max-w-[10rem] truncate font-mono text-xs text-zinc-400" title={s.razorpaySubId ?? undefined}>
                      {s.razorpaySubId ?? "—"}
                    </Td>
                    <Td align="right">
                      {isLive && s.razorpaySubId ? (
                        <div className="flex flex-wrap justify-end gap-1">
                          <ActionButton
                            disabled={s.tier === "pro"}
                            onClick={() => {
                              setActionError(null);
                              setDialog({ orgId: s.orgId, orgName: s.orgName, kind: "pro" });
                            }}
                          >
                            → Pro
                          </ActionButton>
                          <ActionButton
                            disabled={s.tier === "team"}
                            onClick={() => {
                              setActionError(null);
                              setDialog({ orgId: s.orgId, orgName: s.orgName, kind: "team" });
                            }}
                          >
                            → Team
                          </ActionButton>
                          <ActionButton
                            tone="danger"
                            onClick={() => {
                              setActionError(null);
                              setDialog({ orgId: s.orgId, orgName: s.orgName, kind: "cancel" });
                            }}
                          >
                            Cancel
                          </ActionButton>
                        </div>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </DataPanel>

      {dialog && (
        <ConfirmDialog
          open
          title={dialog.kind === "cancel" ? "Cancel subscription" : `Change plan to ${dialog.kind}`}
          body={
            dialog.kind === "cancel"
              ? `Cancel Razorpay subscription for ${dialog.orgName} at cycle end.`
              : `Switch ${dialog.orgName} to the ${dialog.kind} plan immediately via Razorpay.`
          }
          confirmLabel={dialog.kind === "cancel" ? "Cancel at cycle end" : `Switch to ${dialog.kind}`}
          tone={dialog.kind === "cancel" ? "danger" : "primary"}
          busy={mutate.isPending}
          error={actionError}
          onCancel={() => {
            setDialog(null);
            setActionError(null);
          }}
          onConfirm={() => mutate.mutate()}
        />
      )}
    </PageShell>
  );
}
