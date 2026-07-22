import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import type { AdminAuditLogEntry } from "../lib/types";
import { ChartCard, DonutChart, TimeSeriesChart } from "../components/charts";
import { api } from "../lib/api";
import { actionCategory, bucketByDay, countBy, withColors } from "../lib/analytics";
import { ErrorText, LoadingText, PageHeader, ScrollPage } from "../components/ui";

export default function AuditAnalytics() {
  const sampleQ = useQuery({
    queryKey: ["admin", "audit", "chart-sample"],
    queryFn: () => api<{ entries: AdminAuditLogEntry[] }>("/api/admin/audit?limit=100"),
  });

  const sample = sampleQ.data?.entries ?? [];

  const charts = useMemo(() => {
    const categories = withColors(countBy(sample, (e) => actionCategory(e.action)));
    const byDay = bucketByDay(sample, (e) => e.createdAt, () => 1, 14);
    return { categories, byDay };
  }, [sample]);

  if (sampleQ.isLoading) return <LoadingText>Loading audit analytics…</LoadingText>;
  if (sampleQ.error) return <ErrorText>Failed to load audit analytics: {(sampleQ.error as Error).message}</ErrorText>;

  return (
    <ScrollPage>
      <div className="flex flex-col gap-4 pb-8">
        <PageHeader
          title="Audit analytics"
          subtitle="Action mix and volume over the last 100 audit entries"
          actions={
            <Link
              to="/audit"
              className="rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
            >
              ← Back to audit log
            </Link>
          }
        />

        <div className="grid gap-3 lg:grid-cols-2">
          <ChartCard title="Action categories (last 100)" className="!p-3" empty={charts.categories.length === 0}>
            <DonutChart data={charts.categories} height={200} />
          </ChartCard>
          <ChartCard title="Events / day (14d sample)" className="!p-3" empty={charts.byDay.every((d) => d.value === 0)}>
            <TimeSeriesChart data={charts.byDay} height={200} color="#fbbf24" />
          </ChartCard>
        </div>
      </div>
    </ScrollPage>
  );
}
