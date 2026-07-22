import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import type { AdminSubscriptionSummary } from "../lib/types";
import { useClientPagination } from "../hooks/useClientPagination";
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
      <PageHeader
        title="Billing"
        subtitle={`${filtered.length} of ${data?.subscriptions.length ?? 0} subscriptions · Razorpay cancel / change-plan`}
        actions={
          <Link
            to="/billing/analytics"
            className="rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
          >
            View analytics →
          </Link>
        }
      />

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
