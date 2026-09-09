import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import type { AdminUserOrgMembership, AdminUserSummary } from "../lib/types";
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
} from "../components/ui";
import { tierLabel } from "../lib/analytics";

function OrgLines({
  orgs,
  render,
  empty = "—",
}: {
  orgs: AdminUserOrgMembership[];
  render: (org: AdminUserOrgMembership) => ReactNode;
  empty?: string;
}) {
  if (orgs.length === 0) return <span className="text-zinc-600">{empty}</span>;
  return (
    <ul className="flex flex-col gap-1.5">
      {orgs.map((o) => (
        <li key={o.id} className="flex min-h-6 items-center">
          {render(o)}
        </li>
      ))}
    </ul>
  );
}

export default function Users() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => api<{ users: AdminUserSummary[] }>("/api/admin/users"),
  });

  const [query, setQuery] = useState("");
  const [seatFilter, setSeatFilter] = useState("all");
  const [orgCountFilter, setOrgCountFilter] = useState("all");
  const [planFilter, setPlanFilter] = useState("all");

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (data?.users ?? []).filter((u) => {
      const hay = `${u.email ?? ""} ${u.handle ?? ""} ${u.id}`.toLowerCase();
      const matchesQuery = !needle || hay.includes(needle) || u.orgs.some((o) => o.name.toLowerCase().includes(needle));
      const matchesSeat = seatFilter === "all" || (seatFilter === "active" ? u.seatActive : !u.seatActive);
      const orgN = u.orgs.length;
      const matchesOrgCount =
        orgCountFilter === "all" ||
        (orgCountFilter === "0" ? orgN === 0 : orgCountFilter === "1" ? orgN === 1 : orgN >= 2);
      const matchesPlan = planFilter === "all" || u.orgs.some((o) => o.plan === planFilter);
      return matchesQuery && matchesSeat && matchesOrgCount && matchesPlan;
    });
  }, [data?.users, query, seatFilter, orgCountFilter, planFilter]);

  const paging = useClientPagination(filtered);

  const onQuery = (v: string) => {
    setQuery(v);
    paging.resetPage();
  };
  const reset = (setter: (v: string) => void) => (v: string) => {
    setter(v);
    paging.resetPage();
  };

  if (isLoading) return <LoadingText>Loading users…</LoadingText>;
  if (error) return <ErrorText>Failed to load users: {(error as Error).message}</ErrorText>;

  const activeSeats = filtered.filter((u) => u.seatActive).length;

  return (
    <PageShell>
      <PageHeader
        title="Users"
        subtitle={`${filtered.length} of ${data?.users.length ?? 0} users · ${activeSeats} active seats`}
      />

      <DataPanel
        toolbar={
          <Toolbar>
            <SearchInput value={query} onChange={onQuery} placeholder="Search email, handle, org…" />
            <SelectFilter
              label="Seat"
              value={seatFilter}
              onChange={reset(setSeatFilter)}
              options={[
                { value: "all", label: "All" },
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
            />
            <SelectFilter
              label="Orgs"
              value={orgCountFilter}
              onChange={reset(setOrgCountFilter)}
              options={[
                { value: "all", label: "Any count" },
                { value: "0", label: "0 orgs" },
                { value: "1", label: "1 org" },
                { value: "2+", label: "2+ orgs" },
              ]}
            />
            <SelectFilter
              label="Plan"
              value={planFilter}
              onChange={reset(setPlanFilter)}
              options={[
                { value: "all", label: "All" },
                { value: "free", label: "Free" },
                { value: "pro", label: "Individual" },
                { value: "team", label: "Team" },
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
          <EmptyState>No users match these filters.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Email / handle</Th>
                <Th>Orgs</Th>
                <Th>Used reviews</Th>
                <Th>Allotted reviews</Th>
                <Th>Seat</Th>
                <Th>Joined</Th>
              </tr>
            </thead>
            <tbody>
              {paging.pageItems.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-900/50">
                  <Td>
                    <div className="font-medium text-zinc-100">{u.email ?? u.handle ?? u.id}</div>
                    {u.email && u.handle && <div className="text-xs text-zinc-500">@{u.handle}</div>}
                  </Td>
                  <Td>
                    <OrgLines
                      orgs={u.orgs}
                      render={(o) => (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Link to={`/orgs/${o.id}`} className="text-zinc-300 hover:underline">
                            {o.name}
                          </Link>
                          <span className="text-zinc-600">({o.role})</span>
                          <Badge tone={o.plan === "free" ? undefined : "good"}>{tierLabel(o.plan)}</Badge>
                        </div>
                      )}
                    />
                  </Td>
                  <Td>
                    <OrgLines
                      orgs={u.orgs}
                      render={(o) => (
                        <div className="flex items-center gap-1.5 tabular-nums text-zinc-200">
                          <span>{o.reviewsUsed}</span>
                          {o.quotaBlocked && <Badge tone="bad">quota reached</Badge>}
                        </div>
                      )}
                    />
                  </Td>
                  <Td>
                    <OrgLines
                      orgs={u.orgs}
                      render={(o) => (
                        <span className="tabular-nums text-zinc-200">
                          {o.reviewsAllotted === null ? "Unlimited" : o.reviewsAllotted}
                        </span>
                      )}
                    />
                  </Td>
                  <Td>{u.seatActive ? <Badge tone="good">active</Badge> : <Badge>inactive</Badge>}</Td>
                  <Td>{fmtDate(u.createdAt)}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </DataPanel>
    </PageShell>
  );
}
