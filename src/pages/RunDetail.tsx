import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../lib/api";
import type { AdminRunSummary } from "../lib/types";
import {
  Badge,
  Card,
  ErrorText,
  LoadingText,
  PageHeader,
  ScrollPage,
  StatCard,
  fmtDate,
  fmtInr,
  fmtLatency,
  statusTone,
} from "../components/ui";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium text-zinc-500">{label}</dt>
      <dd className="mt-1 text-sm text-zinc-200">{children}</dd>
    </div>
  );
}

export default function RunDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: run, isLoading, error } = useQuery({
    queryKey: ["admin", "run", id],
    queryFn: () => api<AdminRunSummary>(`/api/admin/runs/${id}`),
    enabled: !!id,
  });

  if (isLoading) return <LoadingText>Loading run…</LoadingText>;
  if (error) return <ErrorText>Failed to load run: {(error as Error).message}</ErrorText>;
  if (!run) return <ErrorText>Run not found.</ErrorText>;

  const title =
    run.repoName != null
      ? `${run.repoName}${run.prNumber != null ? ` #${run.prNumber}` : ""}`
      : `Run ${run.id.slice(0, 8)}`;

  return (
    <ScrollPage>
      <div className="flex flex-col gap-4 pb-8">
        <PageHeader
          title={title}
          subtitle={run.orgName ? `${run.orgName} · review run` : "Review run"}
          actions={
            <Link
              to="/runs"
              className="rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
            >
              ← Back to runs
            </Link>
          }
        />

        <div className="flex flex-wrap items-center gap-3">
          <Badge tone={statusTone(run.status)}>{run.status}</Badge>
          <span className="font-mono text-xs text-zinc-500">{run.id}</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total cost" value={fmtInr(run.llmCostUsd)} sub="INR" />
          <StatCard label="Anthropic" value={fmtInr(run.anthropicCostUsd)} />
          <StatCard label="OpenAI" value={fmtInr(run.openaiCostUsd)} />
          <StatCard label="Latency" value={fmtLatency(run.latencyMs)} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Candidates" value={String(run.candidates)} />
          <StatCard label="Verified" value={String(run.verified)} />
          <StatCard label="Posted" value={String(run.posted)} />
          <StatCard label="Digest" value={String(run.digest)} />
        </div>

        <Card className="p-4">
          <h2 className="text-sm font-semibold text-zinc-100">Timeline</h2>
          <dl className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label="Started">{fmtDate(run.startedAt)}</Field>
            <Field label="Finished">{run.finishedAt ? fmtDate(run.finishedAt) : "—"}</Field>
            {run.orgName && <Field label="Organization">{run.orgName}</Field>}
            {run.repoName && (
              <Field label="Repo / PR">
                {run.repoName}
                {run.prNumber != null ? ` #${run.prNumber}` : ""}
              </Field>
            )}
          </dl>
        </Card>

        {run.error && (
          <Card className="border-red-900/60 bg-red-950/30 p-4">
            <h2 className="text-sm font-semibold text-red-300">Error</h2>
            <pre className="mt-2 whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-red-200/90">
              {run.error}
            </pre>
          </Card>
        )}
      </div>
    </ScrollPage>
  );
}
