import type { ReactNode } from "react";
import { PAGE_SIZES, type PageSize } from "../hooks/useClientPagination";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-zinc-800 bg-zinc-900/60 ${className}`}>{children}</div>;
}

export function LoadingText({ children }: { children: ReactNode }) {
  return <p className="text-sm text-zinc-500">{children}</p>;
}

export function ErrorText({ children }: { children: ReactNode }) {
  return <p className="text-sm text-red-400">{children}</p>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="px-3 py-8 text-center text-sm text-zinc-500">{children}</p>;
}

/** Fills the main pane; header/toolbar stay put, table panel grows and scrolls inside. */
export function PageShell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`flex h-full min-h-0 flex-col gap-3 ${className}`}>{children}</div>;
}

/** Scrollable content pages (Overview, Org detail) — page scrolls, not the window. */
export function ScrollPage({ children }: { children: ReactNode }) {
  return <div className="h-full min-h-0 overflow-y-auto">{children}</div>;
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-zinc-50">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium text-zinc-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight tabular-nums text-zinc-50">{value}</p>
      {sub && <p className="mt-1 text-xs text-zinc-500">{sub}</p>}
    </Card>
  );
}

/**
 * Full-height table panel: optional toolbar on top, scrollable body (table only),
 * pagination footer pinned — page chrome never scrolls.
 */
export function DataPanel({
  toolbar,
  footer,
  children,
  className = "",
}: {
  toolbar?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`flex min-h-0 flex-1 flex-col overflow-hidden ${className}`}>
      {toolbar && <div className="shrink-0 border-b border-zinc-800 px-3 py-2">{toolbar}</div>}
      <div className="min-h-0 flex-1 overflow-auto">{children}</div>
      {footer && <div className="shrink-0 border-t border-zinc-800 bg-zinc-950/80">{footer}</div>}
    </Card>
  );
}

/** Plain table — scrolling is owned by DataPanel, not this wrapper. */
export function Table({ children }: { children: ReactNode }) {
  return <table className="w-full min-w-max border-collapse text-sm">{children}</table>;
}

export function Th({ children, align = "left" }: { children: ReactNode; align?: "left" | "right" }) {
  return (
    <th
      scope="col"
      className={`sticky top-0 z-10 border-b border-zinc-800 bg-zinc-900 px-3 py-1.5 text-left text-xs font-medium text-zinc-500 ${align === "right" ? "text-right" : "text-left"}`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  align = "left",
  className = "",
  title,
}: {
  children: ReactNode;
  align?: "left" | "right";
  className?: string;
  title?: string;
}) {
  return (
    <td
      title={title}
      className={`border-b border-zinc-900 px-3 py-1.5 text-zinc-200 ${align === "right" ? "text-right" : "text-left"} ${className}`}
    >
      {children}
    </td>
  );
}

export function Badge({
  tone = "neutral",
  children,
  title,
}: {
  tone?: "neutral" | "good" | "warn" | "bad";
  children: ReactNode;
  title?: string;
}) {
  const toneClass = {
    neutral: "border-zinc-700 bg-zinc-800 text-zinc-300",
    good: "border-emerald-800 bg-emerald-950 text-emerald-400",
    warn: "border-amber-800 bg-amber-950 text-amber-400",
    bad: "border-red-800 bg-red-950 text-red-400",
  }[tone];
  return (
    <span title={title} className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${toneClass}`}>
      {children}
    </span>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="search"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full max-w-xs rounded-md border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-500"
    />
  );
}

export function SelectFilter({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  label?: string;
}) {
  return (
    <label className="flex items-center gap-2 text-xs text-zinc-500">
      {label && <span>{label}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-zinc-700 bg-zinc-950 px-2 py-1.5 text-sm text-zinc-200 outline-none focus:border-zinc-500"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Toolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-3">{children}</div>;
}

function pageButtonClass(active = false, disabled = false): string {
  return [
    "min-w-7 rounded-md border px-2 py-1 text-xs tabular-nums",
    active ? "border-zinc-500 bg-zinc-800 text-zinc-50" : "border-zinc-700 text-zinc-300 hover:border-zinc-500",
    disabled ? "cursor-not-allowed opacity-40" : "",
  ].join(" ");
}

/** Window of page numbers around the current page (with ellipsis). */
export function pageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>();
  pages.add(1);
  pages.add(total);
  for (let i = current - 1; i <= current + 1; i++) {
    if (i >= 1 && i <= total) pages.add(i);
  }
  const sorted = [...pages].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const n = sorted[i]!;
    if (i > 0 && n - sorted[i - 1]! > 1) out.push("…");
    out.push(n);
  }
  return out;
}

/** Offset pagination for full-list endpoints (orgs / users / billing). */
export function Pagination({
  page,
  totalPages,
  onPageChange,
  totalItems,
  pageSize,
  onPageSizeChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  pageSize: number;
  onPageSizeChange?: (size: PageSize) => void;
}) {
  const start = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalItems);
  const numbers = pageNumbers(page, totalPages);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
        <span>
          {start}–{end} of {totalItems}
        </span>
        {onPageSizeChange && (
          <label className="flex items-center gap-1.5">
            Rows
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value) as PageSize)}
              className="rounded border border-zinc-700 bg-zinc-950 px-1.5 py-0.5 text-zinc-300"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
          className={pageButtonClass(false, page <= 1)}
          aria-label="First page"
        >
          «
        </button>
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className={pageButtonClass(false, page <= 1)}
        >
          Previous
        </button>
        {numbers.map((n, i) =>
          n === "…" ? (
            <span key={`e-${i}`} className="px-1 text-xs text-zinc-600">
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              aria-current={n === page ? "page" : undefined}
              onClick={() => onPageChange(n)}
              className={pageButtonClass(n === page)}
            >
              {n}
            </button>
          ),
        )}
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className={pageButtonClass(false, page >= totalPages)}
        >
          Next
        </button>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(totalPages)}
          className={pageButtonClass(false, page >= totalPages)}
          aria-label="Last page"
        >
          »
        </button>
      </div>
    </div>
  );
}

/** Cursor pagination for /runs and /audit (`before` + `limit`). */
export function CursorPagination({
  page,
  pageSize,
  onPageSizeChange,
  canPrev,
  hasMore,
  onPrev,
  onNext,
  loading,
}: {
  page: number;
  pageSize: number;
  onPageSizeChange: (size: PageSize) => void;
  canPrev: boolean;
  hasMore: boolean;
  onPrev: () => void;
  onNext: () => void;
  loading?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 text-sm">
      <label className="flex items-center gap-1.5 text-xs text-zinc-500">
        Rows
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value) as PageSize)}
          className="rounded border border-zinc-700 bg-zinc-950 px-1.5 py-0.5 text-zinc-300"
        >
          {PAGE_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={!canPrev || loading}
          onClick={onPrev}
          className={pageButtonClass(false, !canPrev || !!loading)}
        >
          Previous
        </button>
        <span className="min-w-16 text-center text-xs text-zinc-500">Page {page}</span>
        <button
          type="button"
          disabled={!hasMore || loading}
          onClick={onNext}
          className={pageButtonClass(false, !hasMore || !!loading)}
        >
          Next
        </button>
      </div>
    </div>
  );
}

/** Approximate USD→INR rate used on the public pricing page — console displays money in INR. */
export const USD_TO_INR = 83;

/** Convert a USD amount (API source of truth) to INR for display. */
export function usdToInr(usd: number): number {
  return usd * USD_TO_INR;
}

/** Format a USD amount as Indian Rupees (e.g. ₹34.86). */
export function fmtInr(usd: number): string {
  return `₹${usdToInr(usd).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Whole-rupee seat price label (matches frontend Pricing.tsx rounding to nearest ₹5). */
export function fmtInrSeat(usdPerSeat: number): string {
  const inr = Math.round((usdPerSeat * USD_TO_INR) / 5) * 5;
  return `₹${inr.toLocaleString("en-IN")}`;
}

/** @deprecated Use fmtInr — console money is shown in INR. */
export function fmtUsd(n: number): string {
  return fmtInr(n);
}

export function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function fmtLatency(ms: number | null): string {
  if (ms === null) return "—";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function statusTone(status: string): "neutral" | "good" | "warn" | "bad" {
  if (status === "completed" || status === "active" || status === "trialing" || status === "ready") return "good";
  if (status === "failed" || status === "cancelled" || status === "halted") return "bad";
  if (status === "running" || status === "queued" || status === "past_due") return "warn";
  return "neutral";
}

export function planTone(plan: string): "neutral" | "good" | "warn" | "bad" {
  if (plan === "pro" || plan === "team") return "good";
  return "neutral";
}

/** Compact action button for admin mutations — uses remapped status tokens so light theme stays readable. */
export function ActionButton({
  children,
  onClick,
  tone = "neutral",
  disabled,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  tone?: "neutral" | "danger" | "primary";
  disabled?: boolean;
  title?: string;
}) {
  const toneClass =
    tone === "danger"
      ? "border-red-800 bg-red-950 text-red-400 hover:brightness-95 disabled:opacity-40"
      : tone === "primary"
        ? "border-emerald-800 bg-emerald-950 text-emerald-400 hover:brightness-95 disabled:opacity-40"
        : "border-zinc-700 bg-zinc-800 text-zinc-200 hover:bg-zinc-900 disabled:opacity-40";
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-md border px-2.5 py-1 text-xs font-semibold transition ${toneClass}`}
    >
      {children}
    </button>
  );
}

/** Lightweight confirm dialog for destructive / irreversible admin actions. */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  tone = "danger",
  busy,
  error,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  tone?: "danger" | "primary";
  busy?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-md rounded-lg border border-zinc-700 bg-zinc-950 p-5 shadow-xl">
        <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
        <p className="mt-2 text-sm text-zinc-400">{body}</p>
        {children && <div className="mt-3">{children}</div>}
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <ActionButton onClick={onCancel} disabled={busy}>
            Cancel
          </ActionButton>
          <ActionButton onClick={onConfirm} tone={tone === "danger" ? "danger" : "primary"} disabled={busy}>
            {busy ? "Working…" : confirmLabel}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
