import { useState } from "react";

export const PAGE_SIZES = [10, 25, 50, 100] as const;
export type PageSize = (typeof PAGE_SIZES)[number];

/** Client-side slice pagination for endpoints that return full lists (orgs, users, billing). */
export function useClientPagination<T>(items: T[], initialPageSize: PageSize = 25) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState<PageSize>(initialPageSize);

  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  // Clamp both bounds — setPage is exposed directly to callers, and an unclamped page < 1
  // would make startIndex negative, which Array.prototype.slice silently reinterprets as
  // counting from the array's END rather than erroring, returning the wrong (last) page.
  const safePage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (safePage - 1) * pageSize;
  const pageItems = items.slice(startIndex, startIndex + pageSize);

  function setPageSize(next: PageSize) {
    setPageSizeState(next);
    setPage(1);
  }

  function resetPage() {
    setPage(1);
  }

  return {
    page: safePage,
    setPage,
    pageSize,
    setPageSize,
    resetPage,
    total,
    totalPages,
    startIndex,
    pageItems,
    rangeStart: total === 0 ? 0 : startIndex + 1,
    rangeEnd: Math.min(startIndex + pageSize, total),
  };
}
