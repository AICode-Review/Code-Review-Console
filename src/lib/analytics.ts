/** Small client-side aggregations for console charts (no backend changes). */

export type NamedCount = { name: string; count: number; fill?: string };

export const CHART_COLORS = [
  "#60a5fa",
  "#34d399",
  "#fbbf24",
  "#f87171",
  "#a78bfa",
  "#22d3ee",
  "#fb7185",
  "#a3e635",
  "#818cf8",
  "#f472b6",
];

export const PLAN_COLORS: Record<string, string> = {
  free: "#71717a",
  pro: "#34d399",
  team: "#60a5fa",
};

export const STATUS_COLORS: Record<string, string> = {
  completed: "#34d399",
  failed: "#f87171",
  running: "#fbbf24",
  queued: "#60a5fa",
  active: "#34d399",
  trialing: "#22d3ee",
  cancelled: "#f87171",
  past_due: "#fbbf24",
  halted: "#fb7185",
  ready: "#34d399",
};

export const PLATFORM_COLORS: Record<string, string> = {
  github: "#a78bfa",
  bitbucket: "#60a5fa",
};

export const PROVIDER_COLORS: Record<string, string> = {
  Anthropic: "#d97706",
  OpenAI: "#10b981",
  anthropic: "#d97706",
  openai: "#10b981",
};

export function countBy<T>(items: T[], keyFn: (item: T) => string): NamedCount[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = keyFn(item) || "—";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function withColors(rows: NamedCount[], palette: Record<string, string> | string[] = CHART_COLORS): NamedCount[] {
  return rows.map((row, i) => ({
    ...row,
    fill: Array.isArray(palette) ? (palette[i % palette.length] ?? "#a1a1aa") : (palette[row.name] ?? CHART_COLORS[i % CHART_COLORS.length]),
  }));
}

export function sumBy<T>(items: T[], keyFn: (item: T) => string, valueFn: (item: T) => number): { name: string; value: number; fill?: string }[] {
  const map = new Map<string, number>();
  for (const item of items) {
    const key = keyFn(item) || "—";
    map.set(key, (map.get(key) ?? 0) + valueFn(item));
  }
  return [...map.entries()]
    .map(([name, value]) => ({ name, value: Number(value.toFixed(4)) }))
    .sort((a, b) => b.value - a.value);
}

/** Bucket ISO timestamps into UTC calendar days (newest last for charts). */
export function bucketByDay<T>(
  items: T[],
  dateFn: (item: T) => string,
  valueFn: (item: T) => number,
  days = 14,
): { day: string; value: number; label: string }[] {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (days - 1)));
  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }
  for (const item of items) {
    const day = dateFn(item).slice(0, 10);
    if (buckets.has(day)) buckets.set(day, (buckets.get(day) ?? 0) + valueFn(item));
  }
  return [...buckets.entries()].map(([day, value]) => ({
    day,
    value: Number(value.toFixed(4)),
    label: new Date(day + "T00:00:00Z").toLocaleDateString(undefined, { month: "short", day: "numeric" }),
  }));
}

/** Per-day Anthropic + OpenAI spend buckets for dual-provider charts. */
export function bucketProviderSpendByDay<T>(
  items: T[],
  dateFn: (item: T) => string,
  anthropicFn: (item: T) => number,
  openaiFn: (item: T) => number,
  days = 14,
): { day: string; label: string; anthropic: number; openai: number; total: number }[] {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (days - 1)));
  const buckets = new Map<string, { anthropic: number; openai: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    buckets.set(d.toISOString().slice(0, 10), { anthropic: 0, openai: 0 });
  }
  for (const item of items) {
    const day = dateFn(item).slice(0, 10);
    const bucket = buckets.get(day);
    if (!bucket) continue;
    bucket.anthropic += anthropicFn(item);
    bucket.openai += openaiFn(item);
  }
  return [...buckets.entries()].map(([day, v]) => ({
    day,
    label: new Date(day + "T00:00:00Z").toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    anthropic: Number(v.anthropic.toFixed(4)),
    openai: Number(v.openai.toFixed(4)),
    total: Number((v.anthropic + v.openai).toFixed(4)),
  }));
}

/** Audit action category from dotted action string (e.g. billing.cancel → billing). */
export function actionCategory(action: string): string {
  const i = action.indexOf(".");
  return i === -1 ? action : action.slice(0, i);
}
