import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import type { AdminUserSummary } from "../lib/types";
import { useAdminMe } from "../hooks/useAdminMe";
import { useClientPagination } from "../hooks/useClientPagination";
import {
  ActionButton,
  Badge,
  ConfirmDialog,
  DataPanel,
  EmptyState,
  ErrorText,
  LoadingText,
  PageHeader,
  PageShell,
  Pagination,
  SearchInput,
  SelectFilter,
  StatCard,
  Table,
  Td,
  Th,
  Toolbar,
  fmtDate,
} from "../components/ui";

export default function Users() {
  const queryClient = useQueryClient();
  const me = useAdminMe();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => api<{ users: AdminUserSummary[] }>("/api/admin/users"),
  });

  const [query, setQuery] = useState("");
  const [seatFilter, setSeatFilter] = useState("all");
  const [adminFilter, setAdminFilter] = useState("all");
  const [orgCountFilter, setOrgCountFilter] = useState("all");
  const [pending, setPending] = useState<AdminUserSummary | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (data?.users ?? []).filter((u) => {
      const hay = `${u.email ?? ""} ${u.handle ?? ""} ${u.id}`.toLowerCase();
      const matchesQuery = !needle || hay.includes(needle) || u.orgs.some((o) => o.name.toLowerCase().includes(needle));
      const matchesSeat = seatFilter === "all" || (seatFilter === "active" ? u.seatActive : !u.seatActive);
      const matchesAdmin =
        adminFilter === "all" || (adminFilter === "admin" ? u.isPlatformAdmin : !u.isPlatformAdmin);
      const orgN = u.orgs.length;
      const matchesOrgCount =
        orgCountFilter === "all" ||
        (orgCountFilter === "0" ? orgN === 0 : orgCountFilter === "1" ? orgN === 1 : orgN >= 2);
      return matchesQuery && matchesSeat && matchesAdmin && matchesOrgCount;
    });
  }, [data?.users, query, seatFilter, adminFilter, orgCountFilter]);

  const paging = useClientPagination(filtered);

  const stats = useMemo(() => {
    const activeSeats = filtered.filter((u) => u.seatActive).length;
    const inactiveSeats = filtered.length - activeSeats;
    const admins = filtered.filter((u) => u.isPlatformAdmin).length;
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const signups30d = filtered.filter((u) => new Date(u.createdAt).getTime() >= cutoff).length;
    return { activeSeats, inactiveSeats, admins, signups30d };
  }, [filtered]);

  const toggleAdmin = useMutation({
    mutationFn: (args: { id: string; isPlatformAdmin: boolean }) =>
      api<{ id: string; isPlatformAdmin: boolean }>(`/api/admin/users/${args.id}`, {
        method: "PATCH",
        body: JSON.stringify({ isPlatformAdmin: args.isPlatformAdmin }),
      }),
    onSuccess: async () => {
      setPending(null);
      setActionError(null);
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (err) => {
      setActionError(err instanceof ApiError ? err.message : (err as Error).message);
    },
  });

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

  const adminCount = (data?.users ?? []).filter((u) => u.isPlatformAdmin).length;
  const granting = pending ? !pending.isPlatformAdmin : false;

  return (
    <PageShell>
      <PageHeader
        title="Users"
        subtitle={`${filtered.length} of ${data?.users.length ?? 0} users · ${adminCount} platform admin${adminCount === 1 ? "" : "s"}`}
      />

      <div className="grid shrink-0 grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Active seats"
          value={String(stats.activeSeats)}
          sub={stats.inactiveSeats > 0 ? `${stats.inactiveSeats} inactive` : "after filters"}
        />
        <StatCard label="Platform admins" value={String(stats.admins)} sub="after filters" />
        <StatCard label="Regular users" value={String(filtered.length - stats.admins)} sub="after filters" />
        <StatCard label="Signups (30d)" value={String(stats.signups30d)} sub="after filters" />
      </div>

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
              label="Admin"
              value={adminFilter}
              onChange={reset(setAdminFilter)}
              options={[
                { value: "all", label: "All" },
                { value: "admin", label: "Platform admin" },
                { value: "user", label: "Not admin" },
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
                <Th>Seat</Th>
                <Th>Admin</Th>
                <Th>Joined</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {paging.pageItems.map((u) => {
                const isSelf = me.data?.id === u.id;
                const soleSelfRevoke = isSelf && u.isPlatformAdmin && adminCount <= 1;
                return (
                  <tr key={u.id} className="hover:bg-zinc-900/50">
                    <Td>
                      <div className="font-medium text-zinc-100">{u.email ?? u.handle ?? u.id}</div>
                      {u.email && u.handle && <div className="text-xs text-zinc-500">@{u.handle}</div>}
                    </Td>
                    <Td>
                      {u.orgs.length === 0 ? (
                        <span className="text-zinc-600">—</span>
                      ) : (
                        <ul className="flex flex-col gap-0.5">
                          {u.orgs.map((o) => (
                            <li key={o.id}>
                              <Link to={`/orgs/${o.id}`} className="text-zinc-300 hover:underline">
                                {o.name}
                              </Link>
                              <span className="text-zinc-600"> ({o.role})</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </Td>
                    <Td>{u.seatActive ? <Badge tone="good">active</Badge> : <Badge>inactive</Badge>}</Td>
                    <Td>{u.isPlatformAdmin ? <Badge tone="good">admin</Badge> : <span className="text-zinc-600">—</span>}</Td>
                    <Td>{fmtDate(u.createdAt)}</Td>
                    <Td align="right">
                      <ActionButton
                        tone={u.isPlatformAdmin ? "danger" : "primary"}
                        disabled={soleSelfRevoke}
                        title={soleSelfRevoke ? "Cannot revoke the last platform admin" : undefined}
                        onClick={() => {
                          setActionError(null);
                          setPending(u);
                        }}
                      >
                        {u.isPlatformAdmin ? "Revoke admin" : "Grant admin"}
                      </ActionButton>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </DataPanel>

      <ConfirmDialog
        open={!!pending}
        title={granting ? "Grant platform admin" : "Revoke platform admin"}
        body={
          granting
            ? `Grant console access to ${pending?.email ?? pending?.id}? They will see every org on the platform.`
            : `Revoke console access from ${pending?.email ?? pending?.id}?`
        }
        confirmLabel={granting ? "Grant admin" : "Revoke admin"}
        tone={granting ? "primary" : "danger"}
        busy={toggleAdmin.isPending}
        error={actionError}
        onCancel={() => {
          setPending(null);
          setActionError(null);
        }}
        onConfirm={() => {
          if (!pending) return;
          toggleAdmin.mutate({ id: pending.id, isPlatformAdmin: !pending.isPlatformAdmin });
        }}
      />
    </PageShell>
  );
}
