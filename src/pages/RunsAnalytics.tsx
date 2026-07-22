import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import type { AdminRunSummary } from "../lib/types";
import { ChartCard, DonutChart, DualProviderSpendChart, VerticalBarChart } from "../components/charts";
import { api } from "../lib/api";
import { STATUS_COLORS, bucketProviderSpendByDay, countBy, withColors } from "../lib/analytics";
import { ErrorText, LoadingText, PageHeader, ScrollPage, StatCard, fmtInr } from "../components/ui";

export default function RunsAnalytics() {
  const sampleQ = useQuery({
    queryKey: ["admin", "runs", "chart-sample"],
    queryFn: () => api<{ runs: AdminRunSummary[] }>("/api/admin/runs?limit=100"),
  });

  const sample = sampleQ.data?.runs ?? [];

  const sampleStats = useMemo(() => {
    const spend = sample.reduce((n, r) => n + r.llmCostUsd, 0);
    const anthropic = sample.reduce((n, r) => n + r.anthropicCostUsd, 0);
    const openai = sample.reduce((n, r) => n + r.openaiCostUsd, 0);
    const completed = sample.filter((r) => r.status === "completed").length;
    const failed = sample.filter((r) => r.status === "failed").length;
    const posted = sample.reduce((n, r) => n + r.posted, 0);
    return { spend, anthropic, openai, completed, failed, posted };
  }, [sample]);

  const charts = useMemo(() => {
    const status = withColors(countBy(sample, (r) => r.status), STATUS_COLORS);
    const providerSpendByDay = bucketProviderSpendByDay(
      sample,
      (r) => r.startedAt,
      (r) => r.anthropicCostUsd,
      (r) => r.openaiCostUsd,
      14,
    );
    const funnel = [
      { name: "Candidates", value: sample.reduce((n, r) => n + r.candidates, 0), fill: "#71717a" },
      { name: "Verified", value: sample.reduce((n, r) => n + r.verified, 0), fill: "#60a5fa" },
      { name: "Posted", value: sample.reduce((n, r) => n + r.posted, 0), fill: "#34d399" },
      { name: "Digest", value: sample.reduce((n, r) => n + r.digest, 0), fill: "#fbbf24" },
    ];
    return { status, providerSpendByDay, funnel };
  }, [sample]);

  if (sampleQ.isLoading) return <LoadingText>Loading analytics…</LoadingText>;
  if (sampleQ.error) return <ErrorText>Failed to load analytics: {(sampleQ.error as Error).message}</ErrorText>;

  return (
    <ScrollPage>
      <div className="flex flex-col gap-4 pb-8">
        <PageHeader
          title="Runs analytics"
          subtitle="LLM spend and finding funnel over the last 100 runs sample-wide"
          actions={
            <Link
              to="/runs"
              className="rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
            >
              ← Back to run list
            </Link>
          }
        />

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Spend (sample)" value={fmtInr(sampleStats.spend)} sub="last 100 · INR" />
          <StatCard label="Anthropic (sample)" value={fmtInr(sampleStats.anthropic)} />
          <StatCard label="OpenAI (sample)" value={fmtInr(sampleStats.openai)} />
          <StatCard label="Completed" value={String(sampleStats.completed)} />
          <StatCard label="Failed" value={String(sampleStats.failed)} />
          <StatCard label="Posted (sample)" value={String(sampleStats.posted)} />
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <ChartCard title="Status (last 100)" className="!p-3" empty={charts.status.length === 0}>
            <DonutChart data={charts.status} height={160} />
          </ChartCard>
          <ChartCard
            title="Provider spend (14d sample)"
            className="!p-3"
            empty={charts.providerSpendByDay.every((d) => d.anthropic === 0 && d.openai === 0)}
          >
            <DualProviderSpendChart data={charts.providerSpendByDay} height={160} formatValue={(n) => fmtInr(n)} />
          </ChartCard>
          <ChartCard title="Finding funnel (sample)" className="!p-3" empty={sample.length === 0}>
            <VerticalBarChart data={charts.funnel} dataKey="value" height={160} />
          </ChartCard>
        </div>
      </div>
    </ScrollPage>
  );
}
