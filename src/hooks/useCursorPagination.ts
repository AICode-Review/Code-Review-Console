import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { PageSize } from "./useClientPagination";

function buildQuery(params: Record<string, string | number | undefined>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") qs.set(k, String(v));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

/**
 * Server cursor pagination for /api/admin/runs and /api/admin/audit.
 * Backend: `?limit=&before=<ISO>` — next page uses the last row's timestamp.
 * We keep a stack of `before` cursors so Previous works without offset support.
 */
export function useCursorPagination<T>({
  queryKey,
  path,
  extract,
  cursorField,
  initialPageSize = 25,
}: {
  queryKey: string;
  path: string;
  extract: (data: unknown) => T[];
  cursorField: (item: T) => string;
  initialPageSize?: PageSize;
}) {
  const [pageSize, setPageSizeState] = useState<PageSize>(initialPageSize);
  /** cursors[i] is the `before` value used to fetch page i (undefined = first page). */
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const pageIndex = cursors.length - 1;
  const before = cursors[pageIndex];

  const query = useQuery({
    queryKey: ["admin", queryKey, before ?? null, pageSize],
    queryFn: async () => {
      const data = await api<unknown>(`${path}${buildQuery({ limit: pageSize, before })}`);
      return extract(data);
    },
  });

  const items = query.data ?? [];
  const hasMore = items.length >= pageSize;
  const lastCursor = items.length > 0 ? cursorField(items[items.length - 1]!) : undefined;

  const goNext = useCallback(() => {
    if (!hasMore || !lastCursor) return;
    setCursors((prev) => [...prev, lastCursor]);
  }, [hasMore, lastCursor]);

  const goPrev = useCallback(() => {
    setCursors((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  function setPageSize(next: PageSize) {
    setPageSizeState(next);
    setCursors([undefined]);
  }

  function reset() {
    setCursors([undefined]);
  }

  return {
    ...query,
    items,
    page: pageIndex + 1,
    pageSize,
    setPageSize,
    hasMore,
    canPrev: pageIndex > 0,
    goNext,
    goPrev,
    reset,
  };
}
