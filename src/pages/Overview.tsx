import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChartCard, DonutChart, DualProviderSpendChart, TimeSeriesChart, VerticalBarChart } from "../components/charts";
import {
  ErrorText,
  LoadingText,
  PageHeader,
  ScrollPage,
  SelectFilter,
  StatCard,
  Toolbar,
  fmtInr,
  fmtInrSeat,
} from "../components/ui";
import { useOverview } from "../hooks/useOverview";
import { api } from "../lib/api";
import {
  PLATFORM_COLORS,
  PLAN_COLORS,
  PROVIDER_COLORS,
  STATUS_COLORS,
  bucketByDay,
  bucketProviderSpendByDay,
  countBy,
  sumBy,
  withColors,
} from "../lib/analytics";
import type { AdminOrgSummary, AdminRunSummary, AdminSubscriptionSummary } from "../lib/types";

export default function Overview() {
  const overview = useOverview();
  const orgsQ = useQuery({
    queryKey: ["admin", "orgs"],
    queryFn: () => api<{ orgs: AdminOrgSummary[] }>("/api/admin/orgs"),
  });
  const billingQ = useQuery({
    queryKey: ["admin", "billing"],
    queryFn: () => api<{ subscriptions: AdminSubscriptionSummary[] }>("/api/admin/billing"),
  });
  const runsQ = useQuery({
    queryKey: ["admin", "runs", "overview-sample"],
    queryFn: () => api<{ runs: AdminRunSummary[] }>("/api/admin/runs?limit=100"),
  });

  const [platformFilter, setPlatformFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState("all");

  const orgs = useMemo(() => {
    return (orgsQ.data?.orgs ?? []).filter((o) => {
      if (platformFilter !== "all" && o.platform !== platformFilter) return false;
      if (planFilter !== "all" && o.plan !== planFilter) return false;
      if (kindFilter !== "all" && o.kind !== kindFilter) return false;
      return true;
    });
  }, [orgsQ.data?.orgs, platformFilter, planFilter, kindFilter]);

  const orgIds = useMemo(() => new Set(orgs.map((o) => o.id)), [orgs]);

  const subs = useMemo(() => {
    const all = billingQ.data?.subscriptions ?? [];
    if (platformFilter === "all" && planFilter === "all" && kindFilter === "all") return all;
    // subscriptions don't carry platform/kind — join via org name/id from filtered orgs
    const names = new Set(orgs.map((o) => o.name));
    return all.filter((s) => orgIds.has(s.orgId) || names.has(s.orgName));
  }, [billingQ.data?.subscriptions, orgs, orgIds, platformFilter, planFilter, kindFilter]);

  const runs = useMemo(() => {
    const all = runsQ.data?.runs ?? [];
    if (platformFilter === "all" && planFilter === "all" && kindFilter === "all") return all;
    const names = new Set(orgs.map((o) => o.name));
    return all.filter((r) => !r.orgName || names.has(r.orgName));
  }, [runsQ.data?.runs, orgs, platformFilter, planFilter, kindFilter]);

  const charts = useMemo(() => {
    const planDist = withColors(countBy(orgs, (o) => o.plan), PLAN_COLORS);
    const platformDist = withColors(countBy(orgs, (o) => o.platform), PLATFORM_COLORS);
    const kindDist = withColors(countBy(orgs, (o) => o.kind));
    const subStatus = withColors(countBy(subs, (s) => s.status), STATUS_COLORS);
    const mrrByTier = withColors(
      sumBy(
        subs.filter((s) => s.status === "active" || s.status === "trialing"),
        (s) => s.tier,
        (s) => {
          const price = s.tier === "team" ? 25 : s.tier === "pro" ? 15 : 0;
          return price * Math.max(1, s.seats);
        },
      ).map((r) => ({ name: r.name, count: r.value })),
      PLAN_COLORS,
    ).map((r) => ({ name: r.name, value: r.count, fill: r.fill }));

    const runStatus = withColors(countBy(runs, (r) => r.status), STATUS_COLORS);
    const spendByDay = bucketByDay(runs, (r) => r.startedAt, (r) => r.llmCostUsd, 14);
    const providerSpendByDay = bucketProviderSpendByDay(
      runs,
      (r) => r.startedAt,
      (r) => r.anthropicCostUsd,
      (r) => r.openaiCostUsd,
      14,
    );
    const reviewsByDay = bucketByDay(runs, (r) => r.startedAt, () => 1, 14);
    const funnel = [
      {
        name: "Funnel",
        candidates: runs.reduce((n, r) => n + r.candidates, 0),
        verified: runs.reduce((n, r) => n + r.verified, 0),
        posted: runs.reduce((n, r) => n + r.posted, 0),
        digest: runs.reduce((n, r) => n + r.digest, 0),
      },
    ];
    const sampleSpend = runs.reduce((n, r) => n + r.llmCostUsd, 0);
    const sampleAnthropic = runs.reduce((n, r) => n + r.anthropicCostUsd, 0);
    const sampleOpenai = runs.reduce((n, r) => n + r.openaiCostUsd, 0);
    const sampleFailRate =
      runs.length === 0 ? 0 : (runs.filter((r) => r.status === "failed").length / runs.length) * 100;

    return {
      planDist,
      platformDist,
      kindDist,
      subStatus,
      mrrByTier,
      runStatus,
      spendByDay,
      providerSpendByDay,
      reviewsByDay,
      funnel,
      sampleSpend,
      sampleAnthropic,
      sampleOpenai,
      sampleFailRate,
      filteredOrgCount: orgs.length,
      filteredSubCount: subs.length,
      sampleRunCount: runs.length,
    };
  }, [orgs, subs, runs]);

  const isLoading = overview.isLoading || orgsQ.isLoading;
  const error = overview.error ?? orgsQ.error;

  if (isLoading) return <LoadingText>Loading overview…</LoadingText>;
  if (error) return <ErrorText>Failed to load overview: {(error as Error).message}</ErrorText>;
  if (!overview.data) return null;

  const data = overview.data;
  const avgCost = data.reviewsThisMonth > 0 ? data.llmSpendThisMonthUsd / data.reviewsThisMonth : 0;
  const periodLabel = `${new Date(data.periodStart).toLocaleDateString()} → ${new Date(data.periodEnd).toLocaleDateString()} (UTC)`;
  const filtered =
    platformFilter !== "all" || planFilter !== "all" || kindFilter !== "all";

  return (
    <ScrollPage>
      <div className="flex flex-col gap-6 pb-6">
        <PageHeader
          title="Overview"
          subtitle={`Platform-wide tracking · billing period ${periodLabel}`}
          actions={
            <Toolbar>
              <SelectFilter
                label="Platform"
                value={platformFilter}
                onChange={setPlatformFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "github", label: "GitHub" },
                  { value: "bitbucket", label: "Bitbucket" },
                ]}
              />
              <SelectFilter
                label="Plan"
                value={planFilter}
                onChange={setPlanFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "free", label: "Free" },
                  { value: "pro", label: "Pro" },
                  { value: "team", label: "Team" },
                ]}
              />
              <SelectFilter
                label="Kind"
                value={kindFilter}
                onChange={setKindFilter}
                options={[
                  { value: "all", label: "All" },
                  { value: "individual", label: "Individual" },
                  { value: "team", label: "Team" },
                ]}
              />
            </Toolbar>
          }
        />

        {filtered && (
          <p className="text-xs text-amber-500/90">
            Charts below are scoped to {charts.filteredOrgCount} org{charts.filteredOrgCount === 1 ? "" : "s"} matching
            filters. KPI tiles remain platform-wide for the billing period.
          </p>
        )}

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
          <StatCard label="Orgs" value={String(data.totalOrgs)} sub={filtered ? `${charts.filteredOrgCount} in filter` : undefined} />
          <StatCard label="Users" value={String(data.totalUsers)} />
          <StatCard label="MRR (est.)" value={fmtInr(data.mrrUsd)} sub={`Pro ${fmtInrSeat(15)}/seat · Team ${fmtInrSeat(25)}/seat`} />
          <StatCard label="Reviews this month" value={String(data.reviewsThisMonth)} />
          <StatCard label="LLM spend this month" value={fmtInr(data.llmSpendThisMonthUsd)} sub="Anthropic + OpenAI · approx INR" />
          <StatCard label="Anthropic this month" value={fmtInr(data.anthropicSpendThisMonthUsd)} sub="passes + repro-gen" />
          <StatCard label="OpenAI this month" value={fmtInr(data.openaiSpendThisMonthUsd)} sub="skeptic cross-exam" />
          <StatCard label="Avg cost / review" value={fmtInr(avgCost)} sub={data.reviewsThisMonth === 0 ? "no reviews yet" : undefined} />
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard title="LLM spend by provider" subtitle="This billing period" empty={data.llmSpendThisMonthUsd === 0}>
            <DonutChart
              data={withColors(
                [
                  { name: "Anthropic", count: data.anthropicSpendThisMonthUsd },
                  { name: "OpenAI", count: data.openaiSpendThisMonthUsd },
                ].filter((r) => r.count > 0),
                PROVIDER_COLORS,
              )}
              formatValue={(n) => fmtInr(n)}
            />
          </ChartCard>
          <ChartCard title="Orgs by plan" empty={charts.planDist.length === 0}>
            <DonutChart data={charts.planDist} />
          </ChartCard>
          <ChartCard title="Orgs by platform" empty={charts.platformDist.length === 0}>
            <DonutChart data={charts.platformDist} />
          </ChartCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <ChartCard title="Orgs by kind" empty={charts.kindDist.length === 0}>
            <DonutChart data={charts.kindDist} />
          </ChartCard>
          <ChartCard title="Subscription status" empty={charts.subStatus.length === 0}>
            <DonutChart data={charts.subStatus} />
          </ChartCard>
          <ChartCard title="Estimated MRR by tier" subtitle="Active + trialing only · INR" empty={charts.mrrByTier.length === 0}>
            <VerticalBarChart data={charts.mrrByTier} dataKey="value" formatValue={(n) => fmtInr(n)} />
          </ChartCard>
        </div>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard label="Sample runs" value={String(charts.sampleRunCount)} sub="last ≤100 from API" />
          <StatCard label="Sample LLM spend" value={fmtInr(charts.sampleSpend)} />
          <StatCard
            label="Sample by provider"
            value={fmtInr(charts.sampleAnthropic + charts.sampleOpenai)}
            sub={`A ${fmtInr(charts.sampleAnthropic)} · O ${fmtInr(charts.sampleOpenai)}`}
          />
          <StatCard label="Sample fail rate" value={`${charts.sampleFailRate.toFixed(1)}%`} />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title="Provider spend (14d sample)"
            subtitle="Anthropic vs OpenAI from recent runs · INR"
            empty={charts.providerSpendByDay.every((d) => d.anthropic === 0 && d.openai === 0)}
          >
            <DualProviderSpendChart data={charts.providerSpendByDay} formatValue={(n) => fmtInr(n)} />
          </ChartCard>
          <ChartCard title="Reviews / day (14d sample)" empty={charts.reviewsByDay.every((d) => d.value === 0)}>
            <TimeSeriesChart data={charts.reviewsByDay} color="#60a5fa" />
          </ChartCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard title="Total LLM spend (14d sample)" subtitle="Combined · INR" empty={charts.spendByDay.every((d) => d.value === 0)}>
            <TimeSeriesChart data={charts.spendByDay} formatValue={(n) => fmtInr(n)} color="#34d399" />
          </ChartCard>
          <ChartCard title="Run status (sample)" empty={charts.runStatus.length === 0}>
            <DonutChart data={charts.runStatus} />
          </ChartCard>
        </div>

        <div className="grid gap-4 lg:grid-cols-1">
          <ChartCard title="Finding totals (sample)" empty={charts.sampleRunCount === 0}>
            <VerticalBarChart
              data={[
                { name: "Candidates", value: charts.funnel[0]?.candidates ?? 0, fill: "#71717a" },
                { name: "Verified", value: charts.funnel[0]?.verified ?? 0, fill: "#60a5fa" },
                { name: "Posted", value: charts.funnel[0]?.posted ?? 0, fill: "#34d399" },
                { name: "Digest", value: charts.funnel[0]?.digest ?? 0, fill: "#fbbf24" },
              ]}
              dataKey="value"
            />
          </ChartCard>
        </div>
      </div>
    </ScrollPage>
  );
}
