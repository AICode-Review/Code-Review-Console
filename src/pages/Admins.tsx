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
  Table,
  Td,
  Th,
  Toolbar,
  fmtDate,
} from "../components/ui";

export default function Admins() {
  const queryClient = useQueryClient();
  const me = useAdminMe();
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "admins"],
    queryFn: () => api<{ admins: AdminUserSummary[] }>("/api/admin/admins"),
  });

  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<AdminUserSummary | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (data?.admins ?? []).filter((u) => {
      if (!needle) return true;
      const hay = `${u.email ?? ""} ${u.handle ?? ""} ${u.id}`.toLowerCase();
      return hay.includes(needle) || u.orgs.some((o) => o.name.toLowerCase().includes(needle));
    });
  }, [data?.admins, query]);

  const paging = useClientPagination(filtered);

  const revokeAdmin = useMutation({
    mutationFn: (id: string) =>
      api<{ id: string; isPlatformAdmin: boolean }>(`/api/admin/admins/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      setRevokeTarget(null);
      setActionError(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin", "admins"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
        queryClient.invalidateQueries({ queryKey: ["admin", "audit"] }),
      ]);
    },
    onError: (err) => {
      setActionError(err instanceof ApiError ? err.message : (err as Error).message);
    },
  });

  const onQuery = (v: string) => {
    setQuery(v);
    paging.resetPage();
  };

  if (isLoading) return <LoadingText>Loading admins…</LoadingText>;
  if (error) return <ErrorText>Failed to load admins: {(error as Error).message}</ErrorText>;

  const adminCount = data?.admins.length ?? 0;
  const lastAdmin = adminCount <= 1;

  return (
    <PageShell>
      <PageHeader
        title="Admins"
        subtitle={`${filtered.length} of ${adminCount} platform admin${adminCount === 1 ? "" : "s"}`}
        actions={
          <ActionButton
            tone="primary"
            onClick={() => {
              setActionError(null);
              setAddOpen(true);
            }}
          >
            Add admin
          </ActionButton>
        }
      />

      <DataPanel
        toolbar={
          <Toolbar>
            <SearchInput value={query} onChange={onQuery} placeholder="Search email, handle…" />
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
          <EmptyState>No admins match this search.</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Email / handle</Th>
                <Th>Orgs</Th>
                <Th>Joined</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {paging.pageItems.map((u) => {
                const isSelf = me.data?.id === u.id;
                return (
                  <tr key={u.id} className="hover:bg-zinc-900/50">
                    <Td>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-zinc-100">{u.email ?? u.handle ?? u.id}</span>
                        {isSelf && <Badge>you</Badge>}
                      </div>
                      {u.email && u.handle && <div className="text-xs text-zinc-500">@{u.handle}</div>}
                    </Td>
                    <Td>
                      {u.orgs.length === 0 ? (
                        <span className="text-zinc-600">—</span>
                      ) : (
                        <ul className="flex flex-col gap-1">
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
                    <Td>{fmtDate(u.createdAt)}</Td>
                    <Td align="right">
                      <ActionButton
                        tone="danger"
                        disabled={lastAdmin}
                        title={lastAdmin ? "Cannot revoke the last platform admin" : undefined}
                        onClick={() => {
                          setActionError(null);
                          setRevokeTarget(u);
                        }}
                      >
                        Revoke
                      </ActionButton>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </DataPanel>

      <AddAdminDialog
        open={addOpen}
        error={actionError}
        onCancel={() => {
          setAddOpen(false);
          setActionError(null);
        }}
        onGranted={async () => {
          setAddOpen(false);
          setActionError(null);
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ["admin", "admins"] }),
            queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
            queryClient.invalidateQueries({ queryKey: ["admin", "audit"] }),
          ]);
        }}
        onError={(message) => setActionError(message)}
      />

      <ConfirmDialog
        open={!!revokeTarget}
        title="Revoke platform admin"
        body={`Revoke console access from ${revokeTarget?.email ?? revokeTarget?.id}? They will no longer be able to open the admin console.`}
        confirmLabel="Revoke admin"
        tone="danger"
        busy={revokeAdmin.isPending}
        error={actionError}
        onCancel={() => {
          setRevokeTarget(null);
          setActionError(null);
        }}
        onConfirm={() => {
          if (!revokeTarget) return;
          revokeAdmin.mutate(revokeTarget.id);
        }}
      />
    </PageShell>
  );
}

function AddAdminDialog({
  open,
  error,
  onCancel,
  onGranted,
  onError,
}: {
  open: boolean;
  error: string | null;
  onCancel: () => void;
  onGranted: () => Promise<void>;
  onError: (message: string) => void;
}) {
  const usersQ = useQuery({
    queryKey: ["admin", "users"],
    queryFn: () => api<{ users: AdminUserSummary[] }>("/api/admin/users"),
    enabled: open,
  });
  const [needle, setNeedle] = useState("");
  const [email, setEmail] = useState("");
  const [selected, setSelected] = useState<AdminUserSummary | null>(null);

  const candidates = useMemo(() => {
    const q = needle.trim().toLowerCase();
    return (usersQ.data?.users ?? [])
      .filter((u) => !u.isPlatformAdmin)
      .filter((u) => {
        if (!q) return true;
        return `${u.email ?? ""} ${u.handle ?? ""} ${u.id}`.toLowerCase().includes(q);
      })
      .slice(0, 8);
  }, [usersQ.data?.users, needle]);

  const add = useMutation({
    mutationFn: (body: { userId?: string; email?: string }) =>
      api<{ id: string; isPlatformAdmin: boolean }>("/api/admin/admins", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: async () => {
      setNeedle("");
      setEmail("");
      setSelected(null);
      await onGranted();
    },
    onError: (err) => {
      onError(err instanceof ApiError ? err.message : (err as Error).message);
    },
  });

  if (!open) return null;

  const emailTrimmed = email.trim();
  const canSubmit = !!selected || emailTrimmed.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-lg rounded-lg border border-zinc-700 bg-zinc-950 p-5 shadow-xl">
        <h2 className="text-sm font-semibold text-zinc-100">Add platform admin</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Grant console access to someone who has already signed in. They will see every org on the platform.
        </p>

        <label className="mt-4 block text-xs font-medium text-zinc-500">Pick a signed-in user</label>
        <div className="mt-1.5">
          <SearchInput value={needle} onChange={setNeedle} placeholder="Search email or handle…" />
        </div>
        <div className="mt-2 max-h-48 overflow-y-auto rounded-md border border-zinc-800">
          {usersQ.isLoading ? (
            <p className="px-3 py-4 text-sm text-zinc-500">Loading users…</p>
          ) : candidates.length === 0 ? (
            <p className="px-3 py-4 text-sm text-zinc-500">No matching users who aren’t already admins.</p>
          ) : (
            <ul>
              {candidates.map((u) => {
                const active = selected?.id === u.id;
                return (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(active ? null : u);
                        setEmail("");
                      }}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm ${
                        active ? "bg-zinc-800 text-zinc-50" : "text-zinc-300 hover:bg-zinc-900"
                      }`}
                    >
                      <span>
                        {u.email ?? u.handle ?? u.id}
                        {u.email && u.handle ? <span className="ml-2 text-xs text-zinc-500">@{u.handle}</span> : null}
                      </span>
                      {active && <Badge tone="good">selected</Badge>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <label className="mt-4 block text-xs font-medium text-zinc-500" htmlFor="admin-email">
          Or enter their email
        </label>
        <input
          id="admin-email"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setSelected(null);
          }}
          placeholder="operator@example.com"
          className="mt-1.5 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-500"
        />

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <ActionButton
            onClick={() => {
              setNeedle("");
              setEmail("");
              setSelected(null);
              onCancel();
            }}
            disabled={add.isPending}
          >
            Cancel
          </ActionButton>
          <ActionButton
            tone="primary"
            disabled={!canSubmit || add.isPending}
            onClick={() => {
              if (selected) add.mutate({ userId: selected.id });
              else add.mutate({ email: emailTrimmed });
            }}
          >
            {add.isPending ? "Working…" : "Grant access"}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
