import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { AdminOrgSummary } from "../lib/types";
import { useClientPagination } from "../hooks/useClientPagination";
import {
  Badge,
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
  fmtDate,
  planTone,
} from "../components/ui";

export default function Orgs() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "orgs"],
    queryFn: () => api<{ orgs: AdminOrgSummary[] }>("/api/admin/orgs"),
  });

  const [query, setQuery] = useState("");
  const [planFilter, setPlanFilter] = useState("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [kindFilter, setKindFilter] = useState("all");
  const [subFilter, setSubFilter] = useState("all");
  const [suspendFilter, setSuspendFilter] = useState("all");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (data?.orgs ?? []).filter((org) => {
      const matchesQuery = !needle || org.name.toLowerCase().includes(needle) || org.id.toLowerCase().includes(needle);
      const matchesPlan = planFilter === "all" || org.plan === planFilter;
      const matchesPlatform = platformFilter === "all" || org.platform === platformFilter;
      const matchesKind = kindFilter === "all" || org.kind === kindFilter;
      const sub = org.subscriptionStatus ?? "none";
      const matchesSub = subFilter === "all" || sub === subFilter;
      const matchesSuspend =
        suspendFilter === "all" ||
        (suspendFilter === "suspended" ? !!org.suspendedAt : !org.suspendedAt);
      return matchesQuery && matchesPlan && matchesPlatform && matchesKind && matchesSub && matchesSuspend;
    });
  }, [data?.orgs, query, planFilter, platformFilter, kindFilter, subFilter, suspendFilter]);

  const paging = useClientPagination(filtered);

  const onQuery = (v: string) => {
    setQuery(v);
    paging.resetPage();
  };
  const reset = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    paging.resetPage();
  };

  if (isLoading) return <LoadingText>Loading orgs…</LoadingText>;
  if (error) return <ErrorText>Failed to load orgs: {(error as Error).message}</ErrorText>;

  return (
    <PageShell>
      <PageHeader title="Orgs" subtitle={`${filtered.length} of ${data?.orgs.length ?? 0} organizations`} />

      <DataPanel
        toolbar={
          <Toolbar>
            <SearchInput value={query} onChange={onQuery} placeholder="Search by name…" />
            <SelectFilter
              label="Plan"
              value={planFilter}
              onChange={reset(setPlanFilter)}
              options={[
                { value: "all", label: "All" },
                { value: "free", label: "Free" },
                { value: "pro", label: "Pro" },
                { value: "team", label: "Team" },
              ]}
            />
            <SelectFilter
              label="Platform"
              value={platformFilter}
              onChange={reset(setPlatformFilter)}
              options={[
                { value: "all", label: "All" },
                { value: "github", label: "GitHub" },
                { value: "bitbucket", label: "Bitbucket" },
              ]}
            />
            <SelectFilter
              label="Kind"
              value={kindFilter}
              onChange={reset(setKindFilter)}
              options={[
                { value: "all", label: "All" },
                { value: "individual", label: "Individual" },
                { value: "team", label: "Team" },
              ]}
            />
            <SelectFilter
              label="Sub"
              value={subFilter}
              onChange={reset(setSubFilter)}
              options={[
                { value: "all", label: "All" },
                { value: "active", label: "Active" },
                { value: "trialing", label: "Trialing" },
                { value: "cancelled", label: "Cancelled" },
                { value: "past_due", label: "Past due" },
                { value: "halted", label: "Halted" },
                { value: "none", label: "None" },
              ]}
            />
            <SelectFilter
              label="Access"
              value={suspendFilter}
              onChange={reset(setSuspendFilter)}
              options={[
                { value: "all", label: "All" },
                { value: "active", label: "Not suspended" },
                { value: "suspended", label: "Suspended" },
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
          <EmptyState>No orgs match these filters.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Kind</Th>
                <Th>Platform</Th>
                <Th>Plan</Th>
                <Th>Sub status</Th>
                <Th>Access</Th>
                <Th align="right">Seats</Th>
                <Th>Created</Th>
              </tr>
            </thead>
            <tbody>
              {paging.pageItems.map((org) => (
                <tr key={org.id} className="hover:bg-zinc-900/50">
                  <Td>
                    <Link to={`/orgs/${org.id}`} className="font-medium text-zinc-100 hover:underline">
                      {org.name}
                    </Link>
                  </Td>
                  <Td>{org.kind}</Td>
                  <Td>{org.platform}</Td>
                  <Td>
                    <Badge tone={planTone(org.plan)}>{org.plan}</Badge>
                  </Td>
                  <Td>{org.subscriptionStatus ?? <span className="text-zinc-600">—</span>}</Td>
                  <Td>
                    {org.suspendedAt ? (
                      <Badge tone="bad" title={org.suspendedReason ?? undefined}>
                        suspended
                      </Badge>
                    ) : (
                      <span className="text-zinc-600">ok</span>
                    )}
                  </Td>
                  <Td align="right" className="tabular-nums">
                    {org.seats}
                  </Td>
                  <Td>{fmtDate(org.createdAt)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </DataPanel>
    </PageShell>
  );
}
