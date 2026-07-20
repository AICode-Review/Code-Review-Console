import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { NamedCount } from "../lib/analytics";
import { Card } from "./ui";

export const TOOLTIP_STYLE = {
  background: "var(--console-tooltip-bg, #18181b)",
  border: "1px solid var(--console-tooltip-border, #3f3f46)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--console-tooltip-fg, #fafafa)",
  boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
} as const;

export const TOOLTIP_ITEM_STYLE = {
  color: "var(--console-tooltip-fg, #fafafa)",
} as const;

export const TOOLTIP_LABEL_STYLE = {
  color: "var(--console-tooltip-fg, #fafafa)",
  fontWeight: 600,
} as const;

export function ChartCard({
  title,
  subtitle,
  children,
  empty,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  empty?: boolean;
  className?: string;
}) {
  return (
    <Card className={`flex flex-col overflow-visible p-4 ${className}`}>
      <p className="shrink-0 text-xs font-medium text-zinc-500">{title}</p>
      {subtitle && <p className="mt-0.5 shrink-0 text-[11px] text-zinc-600">{subtitle}</p>}
      {empty ? (
        <p className="mt-6 text-center text-sm text-zinc-500">No data yet.</p>
      ) : (
        <div className="mt-3 overflow-visible">{children}</div>
      )}
    </Card>
  );
}

export function DonutChart({
  data,
  height = 180,
  formatValue,
}: {
  data: NamedCount[];
  height?: number;
  formatValue?: (n: number) => string;
}) {
  if (data.length === 0) return null;

  // Keep the ring fully inside the box: diameter + chart margin must fit height.
  const size = Math.max(height, 120);
  const outerRadius = Math.floor(size * 0.36);
  const innerRadius = Math.floor(outerRadius * 0.58);

  return (
    <div className="flex items-center gap-4" style={{ minHeight: size }}>
      <div className="shrink-0 overflow-visible" style={{ width: size, height: size }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <Pie
              data={data}
              dataKey="count"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={2}
              stroke="var(--console-chart-stroke, #09090b)"
              strokeWidth={1}
            >
              {data.map((entry) => (
                <Cell key={entry.name} fill={entry.fill ?? "#a1a1aa"} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              itemStyle={TOOLTIP_ITEM_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
              formatter={(value: number | string) => (formatValue && typeof value === "number" ? formatValue(value) : value)}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex min-w-0 flex-1 flex-col justify-center gap-2 text-sm">
        {data.map((t) => (
          <li key={t.name} className="flex items-center gap-2 text-zinc-200">
            <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: t.fill }} />
            <span className="min-w-0 truncate capitalize">{t.name}</span>
            <span className="ml-auto tabular-nums text-zinc-500">{formatValue ? formatValue(t.count) : t.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function VerticalBarChart({
  data,
  dataKey = "count",
  nameKey = "name",
  height = 200,
  color = "#60a5fa",
  formatValue,
}: {
  data: Record<string, unknown>[];
  dataKey?: string;
  nameKey?: string;
  height?: number;
  color?: string;
  formatValue?: (n: number) => string;
}) {
  if (data.length === 0) return null;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--console-chart-grid, #27272a)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey={nameKey} tick={{ fill: "var(--console-chart-tick, #71717a)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "var(--console-chart-tick, #71717a)", fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            cursor={{ fill: "rgba(113,113,122,0.12)" }}
            formatter={(value: number | string) => (formatValue && typeof value === "number" ? formatValue(value) : value)}
          />
          <Bar dataKey={dataKey} radius={[4, 4, 0, 0]}>
            {data.map((row, i) => (
              <Cell key={i} fill={(row.fill as string | undefined) ?? color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TimeSeriesChart({
  data,
  dataKey = "value",
  height = 200,
  color = "#34d399",
  formatValue,
}: {
  data: { label: string; value: number }[];
  dataKey?: string;
  height?: number;
  color?: string;
  formatValue?: (n: number) => string;
}) {
  if (data.length === 0) return null;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--console-chart-grid, #27272a)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "var(--console-chart-tick, #71717a)", fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fill: "var(--console-chart-tick, #71717a)", fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            formatter={(value: number | string) => (formatValue && typeof value === "number" ? formatValue(value) : value)}
          />
          <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function DualProviderSpendChart({
  data,
  height = 200,
  formatValue,
}: {
  data: { label: string; anthropic: number; openai: number }[];
  height?: number;
  formatValue?: (n: number) => string;
}) {
  if (data.length === 0) return null;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--console-chart-grid, #27272a)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "var(--console-chart-tick, #71717a)", fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fill: "var(--console-chart-tick, #71717a)", fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            formatter={(value: number | string) => (formatValue && typeof value === "number" ? formatValue(value) : value)}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: "var(--console-chart-tick, #71717a)" }} />
          <Line type="monotone" dataKey="anthropic" name="Anthropic" stroke="#d97706" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="openai" name="OpenAI" stroke="#10b981" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function StackedFunnelBars({
  data,
  height = 200,
}: {
  data: { name: string; candidates: number; verified: number; posted: number; digest: number }[];
  height?: number;
}) {
  if (data.length === 0) return null;
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--console-chart-grid, #27272a)" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="name" tick={{ fill: "var(--console-chart-tick, #71717a)", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "var(--console-chart-tick, #71717a)", fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            itemStyle={TOOLTIP_ITEM_STYLE}
            labelStyle={TOOLTIP_LABEL_STYLE}
            cursor={{ fill: "rgba(113,113,122,0.12)" }}
          />
          <Legend wrapperStyle={{ fontSize: 11, color: "var(--console-chart-tick, #71717a)" }} />
          <Bar dataKey="candidates" stackId="a" fill="#71717a" />
          <Bar dataKey="verified" stackId="a" fill="#60a5fa" />
          <Bar dataKey="posted" stackId="a" fill="#34d399" />
          <Bar dataKey="digest" stackId="a" fill="#fbbf24" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
