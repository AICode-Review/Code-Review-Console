import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import type { AdminAuditLogEntry } from "../lib/types";
import { useCursorPagination } from "../hooks/useCursorPagination";
import { ChartCard, DonutChart, TimeSeriesChart } from "../components/charts";
import { api } from "../lib/api";
import { actionCategory, bucketByDay, countBy, withColors } from "../lib/analytics";
import {
  Badge,
  CursorPagination,
  DataPanel,
  EmptyState,
  ErrorText,
  LoadingText,
  PageHeader,
  PageShell,
  SearchInput,
  SelectFilter,
  Table,
  Td,
  Th,
  Toolbar,
  fmtDate,
} from "../components/ui";

function actionTone(action: string): "neutral" | "good" | "warn" | "bad" {
  if (action.includes("suspended") || action.includes("revoked") || action.includes("deleted") || action.includes("removed") || action.includes("cancel"))
    return "bad";
  if (action.startsWith("billing.") || action.includes("blocked")) return "warn";
  if (
    action.includes("created") ||
    action.includes("joined") ||
    action.includes("subscribed") ||
    action.includes("activated") ||
    action.includes("granted") ||
    action.includes("unsuspended")
  )
    return "good";
  return "neutral";
}

function MetaCell({ meta }: { meta: Record<string, unknown> }) {
  const [open, setOpen] = useState(false);
  const keys = Object.keys(meta ?? {});
  if (keys.length === 0) return <span className="text-zinc-600">—</span>;

  return (
    <div>
      <button type="button" onClick={() => setOpen((v) => !v)} className="text-xs text-zinc-400 hover:text-zinc-200">
        {open ? "Hide" : `${keys.length} field${keys.length === 1 ? "" : "s"}`}
      </button>
      {open && (
        <pre className="mt-1 max-w-xs overflow-x-auto rounded border border-zinc-800 bg-zinc-950 p-2 text-[10px] leading-relaxed text-zinc-400">
          {JSON.stringify(meta, null, 2)}
        </pre>
      )}
    </div>
  );
}

const CATEGORY_OPTIONS = [
  { value: "all", label: "All categories" },
  { value: "billing", label: "Billing" },
  { value: "member", label: "Members" },
  { value: "invite", label: "Invites" },
  { value: "rule", label: "Rules" },
  { value: "repo", label: "Repos" },
  { value: "review", label: "Reviews" },
  { value: "run", label: "Runs" },
  { value: "onboarding", label: "Onboarding" },
  { value: "bitbucket", label: "Bitbucket" },
];

export default function AuditLog() {
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
  } = useCursorPagination<AdminAuditLogEntry>({
    queryKey: "audit",
    path: "/api/admin/audit",
    extract: (data) => (data as { entries: AdminAuditLogEntry[] }).entries,
    cursorField: (e) => e.createdAt,
    initialPageSize: 25,
  });

  const sampleQ = useQuery({
    queryKey: ["admin", "audit", "chart-sample"],
    queryFn: () => api<{ entries: AdminAuditLogEntry[] }>("/api/admin/audit?limit=100"),
  });

  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [actorFilter, setActorFilter] = useState("all");

  const sample = sampleQ.data?.entries ?? [];

  const filteredPage = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return items.filter((e) => {
      const hay = `${e.orgName ?? ""} ${e.actor} ${e.action} ${e.target ?? ""}`.toLowerCase();
      const matchesQuery = !needle || hay.includes(needle);
      const matchesCat = categoryFilter === "all" || actionCategory(e.action) === categoryFilter;
      const matchesActor =
        actorFilter === "all" ||
        (actorFilter === "system" ? e.actor === "system" : e.actor !== "system");
      return matchesQuery && matchesCat && matchesActor;
    });
  }, [items, query, categoryFilter, actorFilter]);

  const charts = useMemo(() => {
    const categories = withColors(countBy(sample, (e) => actionCategory(e.action)));
    const byDay = bucketByDay(sample, (e) => e.createdAt, () => 1, 14);
    return { categories, byDay };
  }, [sample]);

  if (isLoading) return <LoadingText>Loading audit log…</LoadingText>;
  if (error) return <ErrorText>Failed to load audit log: {(error as Error).message}</ErrorText>;

  return (
    <PageShell>
      <PageHeader
        title="Audit log"
        subtitle="Cross-org operator trail — billing, members, rules, reviews blocked by plan/quota"
      />

      <div className="grid shrink-0 gap-3 lg:grid-cols-2">
        <ChartCard title="Action categories (last 100)" className="!p-3" empty={charts.categories.length === 0}>
          <DonutChart data={charts.categories} height={140} />
        </ChartCard>
        <ChartCard title="Events / day (14d sample)" className="!p-3" empty={charts.byDay.every((d) => d.value === 0)}>
          <TimeSeriesChart data={charts.byDay} height={140} color="#fbbf24" />
        </ChartCard>
      </div>

      <DataPanel
        toolbar={
          <Toolbar>
            <SearchInput value={query} onChange={setQuery} placeholder="Filter this page: org, actor, action…" />
            <SelectFilter label="Category" value={categoryFilter} onChange={setCategoryFilter} options={CATEGORY_OPTIONS} />
            <SelectFilter
              label="Actor"
              value={actorFilter}
              onChange={setActorFilter}
              options={[
                { value: "all", label: "All" },
                { value: "system", label: "System" },
                { value: "user", label: "User" },
              ]}
            />
          </Toolbar>
        }
        footer={
          <CursorPagination
            page={page}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
            canPrev={canPrev}
            hasMore={hasMore}
            onPrev={goPrev}
            onNext={goNext}
            loading={isFetching}
          />
        }
      >
        {filteredPage.length === 0 ? (
          <EmptyState>No audit entries match these filters on this page.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>When</Th>
                <Th>Org</Th>
                <Th>Actor</Th>
                <Th>Action</Th>
                <Th>Target</Th>
                <Th>Meta</Th>
              </tr>
            </thead>
            <tbody>
              {filteredPage.map((e) => (
                <tr key={e.id} className="hover:bg-zinc-900/50">
                  <Td className="whitespace-nowrap text-zinc-400">{fmtDate(e.createdAt)}</Td>
                  <Td>
                    {e.orgId ? (
                      <Link to={`/orgs/${e.orgId}`} className="text-zinc-200 hover:underline">
                        {e.orgName ?? e.orgId.slice(0, 8)}
                      </Link>
                    ) : (
                      <span className="text-zinc-500">platform</span>
                    )}
                  </Td>
                  <Td className="max-w-[10rem] truncate" title={e.actor}>
                    {e.actor}
                  </Td>
                  <Td>
                    <Badge tone={actionTone(e.action)}>{e.action}</Badge>
                  </Td>
                  <Td className="max-w-[12rem] truncate text-zinc-400" title={e.target ?? undefined}>
                    {e.target ?? "—"}
                  </Td>
                  <Td>
                    <MetaCell meta={e.meta ?? {}} />
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </DataPanel>
    </PageShell>
  );
}
