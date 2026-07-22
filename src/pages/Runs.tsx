import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { AdminRunSummary } from "../lib/types";
import { useCursorPagination } from "../hooks/useCursorPagination";
import { RunsTable } from "../components/RunsTable";
import {
  CursorPagination,
  DataPanel,
  ErrorText,
  LoadingText,
  PageHeader,
  PageShell,
  SearchInput,
  SelectFilter,
  Toolbar,
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

  const [statusFilter, setStatusFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [costFilter, setCostFilter] = useState("all");

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

  if (isLoading) return <LoadingText>Loading runs…</LoadingText>;
  if (error) return <ErrorText>Failed to load runs: {(error as Error).message}</ErrorText>;

  return (
    <PageShell>
      <PageHeader
        title="Review runs"
        subtitle="Cross-org pipeline activity · open a run for funnel, cost split, latency, and errors"
        actions={
          <Link
            to="/runs/analytics"
            className="rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
          >
            View analytics →
          </Link>
        }
      />

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
