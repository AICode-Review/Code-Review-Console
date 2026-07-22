import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ChartCard, DonutChart, VerticalBarChart } from "../components/charts";
import { api } from "../lib/api";
import type { AdminSubscriptionSummary } from "../lib/types";
import { useOverview } from "../hooks/useOverview";
import { PLAN_COLORS, STATUS_COLORS, countBy, sumBy, withColors } from "../lib/analytics";
import { ErrorText, LoadingText, PageHeader, ScrollPage, StatCard, fmtInr } from "../components/ui";

const TIER_PRICE: Record<string, number> = { pro: 15, team: 25 };

export default function BillingAnalytics() {
  const overview = useOverview();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "billing"],
    queryFn: () => api<{ subscriptions: AdminSubscriptionSummary[] }>("/api/admin/billing"),
  });

  const subs = data?.subscriptions ?? [];

  const tracked = useMemo(() => {
    const active = subs.filter((s) => s.status === "active" || s.status === "trialing");
    const cancelled = subs.filter((s) => s.status === "cancelled" || s.status === "halted");
    const seats = active.reduce((n, s) => n + Math.max(1, s.seats), 0);
    return { total: subs.length, active: active.length, cancelled: cancelled.length, seats };
  }, [subs]);

  const charts = useMemo(() => {
    const status = withColors(countBy(subs, (s) => s.status), STATUS_COLORS);
    const tier = withColors(countBy(subs, (s) => s.tier), PLAN_COLORS);
    const mrr = sumBy(
      subs.filter((s) => s.status === "active" || s.status === "trialing"),
      (s) => s.tier,
      (s) => (TIER_PRICE[s.tier] ?? 0) * Math.max(1, s.seats),
    ).map((r, i) => ({
      name: r.name,
      value: r.value,
      fill: PLAN_COLORS[r.name] ?? ["#60a5fa", "#34d399"][i % 2],
    }));
    return { status, tier, mrr };
  }, [subs]);

  if (isLoading) return <LoadingText>Loading billing analytics…</LoadingText>;
  if (error) return <ErrorText>Failed to load billing: {(error as Error).message}</ErrorText>;

  return (
    <ScrollPage>
      <div className="flex flex-col gap-4 pb-8">
        <PageHeader
          title="Billing analytics"
          subtitle="MRR, tier mix, and subscription status across the platform"
          actions={
            <Link
              to="/billing"
              className="rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
            >
              ← Back to subscriptions
            </Link>
          }
        />

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="MRR (est.)" value={fmtInr(overview.data?.mrrUsd ?? 0)} sub="active + trialing only · INR" />
          <StatCard label="Subscriptions" value={String(tracked.total)} sub={`${tracked.active} active`} />
          <StatCard label="Paid seats" value={String(tracked.seats)} sub="active + trialing" />
          <StatCard label="Cancelled / halted" value={String(tracked.cancelled)} />
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <ChartCard title="Status" className="!p-3" empty={charts.status.length === 0}>
            <DonutChart data={charts.status} height={160} />
          </ChartCard>
          <ChartCard title="Tier mix" className="!p-3" empty={charts.tier.length === 0}>
            <DonutChart data={charts.tier} height={160} />
          </ChartCard>
          <ChartCard title="MRR by tier" className="!p-3" empty={charts.mrr.length === 0}>
            <VerticalBarChart data={charts.mrr} dataKey="value" height={160} formatValue={(n) => fmtInr(n)} />
          </ChartCard>
        </div>
      </div>
    </ScrollPage>
  );
}
