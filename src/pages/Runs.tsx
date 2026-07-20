import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AdminRunSummary } from "../lib/types";
import { useCursorPagination } from "../hooks/useCursorPagination";
import { ChartCard, DonutChart, DualProviderSpendChart, VerticalBarChart } from "../components/charts";
import { RunsTable } from "../components/RunsTable";
import { api } from "../lib/api";
import { STATUS_COLORS, bucketProviderSpendByDay, countBy, withColors } from "../lib/analytics";
import {
  CursorPagination,
  DataPanel,
  ErrorText,
  LoadingText,
  PageHeader,
  PageShell,
  SearchInput,
  SelectFilter,
  StatCard,
  Toolbar,
  fmtInr,
} from "../components/ui";

export default function Runs() {
  const {
    items,
    isLoading,
    isFetching,
    error,
    page,
    pageSize,
    setPageSize,
    hasMore,
    canPrev,
    goNext,
    goPrev,
    reset,
  } = useCursorPagination<AdminRunSummary>({
    queryKey: "runs",
    path: "/api/admin/runs",
    extract: (data) => (data as { runs: AdminRunSummary[] }).runs,
    cursorField: (r) => r.startedAt,
    initialPageSize: 25,
  });

  const sampleQ = useQuery({
    queryKey: ["admin", "runs", "chart-sample"],
    queryFn: () => api<{ runs: AdminRunSummary[] }>("/api/admin/runs?limit=100"),
  });

  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [costFilter, setCostFilter] = useState("all");

  const sample = sampleQ.data?.runs ?? [];

  const filteredPage = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((r) => {
      const hay = `${r.orgName ?? ""} ${r.repoName ?? ""} ${r.prNumber ?? ""} ${r.error ?? ""}`.toLowerCase();
      const matchesQuery = !needle || hay.includes(needle);
      const matchesStatus = statusFilter === "all" || r.status === statusFilter;
      const matchesCost =
        costFilter === "all" ||
        (costFilter === "paid" ? r.llmCostUsd > 0 : r.llmCostUsd === 0);
      return matchesQuery && matchesStatus && matchesCost;
    });
  }, [items, query, statusFilter, costFilter]);

  const pageStats = useMemo(() => {
    const spend = filteredPage.reduce((n, r) => n + r.llmCostUsd, 0);
    const anthropic = filteredPage.reduce((n, r) => n + r.anthropicCostUsd, 0);
    const openai = filteredPage.reduce((n, r) => n + r.openaiCostUsd, 0);
    const completed = filteredPage.filter((r) => r.status === "completed").length;
    const failed = filteredPage.filter((r) => r.status === "failed").length;
    const posted = filteredPage.reduce((n, r) => n + r.posted, 0);
    const verified = filteredPage.reduce((n, r) => n + r.verified, 0);
    return { spend, anthropic, openai, completed, failed, posted, verified };
  }, [filteredPage]);

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

  if (isLoading) return <LoadingText>Loading runs…</LoadingText>;
  if (error) return <ErrorText>Failed to load runs: {(error as Error).message}</ErrorText>;

  return (
    <PageShell>
      <PageHeader
        title="Review runs"
        subtitle="Cross-org pipeline activity · LLM spend · finding funnel (candidates → verified → posted / digest)"
      />

      <div className="grid shrink-0 grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Page spend" value={fmtInr(pageStats.spend)} sub="after filters · INR" />
        <StatCard label="Anthropic (page)" value={fmtInr(pageStats.anthropic)} />
        <StatCard label="OpenAI (page)" value={fmtInr(pageStats.openai)} />
        <StatCard label="Completed" value={String(pageStats.completed)} />
        <StatCard label="Failed" value={String(pageStats.failed)} />
        <StatCard label="Posted (page)" value={String(pageStats.posted)} />
      </div>

      <div className="grid shrink-0 gap-3 lg:grid-cols-3">
        <ChartCard title="Status (last 100)" className="!p-3" empty={charts.status.length === 0}>
          <DonutChart data={charts.status} height={120} />
        </ChartCard>
        <ChartCard
          title="Provider spend (14d sample)"
          className="!p-3"
          empty={charts.providerSpendByDay.every((d) => d.anthropic === 0 && d.openai === 0)}
        >
          <DualProviderSpendChart data={charts.providerSpendByDay} height={120} formatValue={(n) => fmtInr(n)} />
        </ChartCard>
        <ChartCard title="Finding funnel (sample)" className="!p-3" empty={sample.length === 0}>
          <VerticalBarChart data={charts.funnel} dataKey="value" height={120} />
        </ChartCard>
      </div>

      <DataPanel
        toolbar={
          <Toolbar>
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Filter this page: org, repo, PR, error…"
            />
            <SelectFilter
              label="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { value: "all", label: "All" },
                { value: "completed", label: "Completed" },
                { value: "failed", label: "Failed" },
                { value: "running", label: "Running" },
                { value: "queued", label: "Queued" },
              ]}
            />
            <SelectFilter
              label="Cost"
              value={costFilter}
              onChange={setCostFilter}
              options={[
                { value: "all", label: "All" },
                { value: "paid", label: "Has spend" },
                { value: "zero", label: "Zero cost" },
              ]}
            />
          </Toolbar>
        }
        footer={
          <CursorPagination
            page={page}
            pageSize={pageSize}
            onPageSizeChange={(s) => {
              setPageSize(s);
              reset();
            }}
            canPrev={canPrev}
            hasMore={hasMore}
            onPrev={goPrev}
            onNext={goNext}
            loading={isFetching}
          />
        }
      >
        <RunsTable runs={filteredPage} />
      </DataPanel>
    </PageShell>
  );
}
