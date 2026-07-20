import { Link } from "react-router-dom";
import type { AdminRunSummary } from "../lib/types";
import { Badge, EmptyState, Table, Td, Th, fmtDate, fmtLatency, fmtInr, statusTone } from "./ui";

export function RunsTable({ runs, showOrg = true }: { runs: AdminRunSummary[]; showOrg?: boolean }) {
  if (runs.length === 0) {
    return <EmptyState>No review runs yet.</EmptyState>;
  }

  return (
    <Table>
      <thead>
        <tr>
          {showOrg && <Th>Org</Th>}
          <Th>Repo / PR</Th>
          <Th>Status</Th>
          <Th align="right">Cand</Th>
          <Th align="right">Ver</Th>
          <Th align="right">Posted</Th>
          <Th align="right">Digest</Th>
          <Th align="right">Total</Th>
          <Th align="right">Anthropic</Th>
          <Th align="right">OpenAI</Th>
          <Th align="right">Latency</Th>
          <Th>Started</Th>
        </tr>
      </thead>
      <tbody>
        {runs.map((r) => (
          <tr key={r.id} className="hover:bg-zinc-900/50">
            {showOrg && <Td>{r.orgName ?? "—"}</Td>}
            <Td>
              <span className="text-zinc-200">{r.repoName ?? "—"}</span>
              {r.prNumber != null && <span className="text-zinc-500"> #{r.prNumber}</span>}
            </Td>
            <Td>
              <Badge tone={statusTone(r.status)}>{r.status}</Badge>
              {r.error && (
                <span className="mt-1 block max-w-xs truncate text-xs text-red-400" title={r.error}>
                  {r.error}
                </span>
              )}
            </Td>
            <Td align="right" className="tabular-nums">
              {r.candidates}
            </Td>
            <Td align="right" className="tabular-nums">
              {r.verified}
            </Td>
            <Td align="right" className="tabular-nums">
              {r.posted}
            </Td>
            <Td align="right" className="tabular-nums">
              {r.digest}
            </Td>
            <Td align="right" className="tabular-nums">
              {fmtInr(r.llmCostUsd)}
            </Td>
            <Td align="right" className="tabular-nums text-amber-500/90">
              {fmtInr(r.anthropicCostUsd)}
            </Td>
            <Td align="right" className="tabular-nums text-emerald-500/90">
              {fmtInr(r.openaiCostUsd)}
            </Td>
            <Td align="right" className="tabular-nums">
              {fmtLatency(r.latencyMs)}
            </Td>
            <Td>
              <span title={r.finishedAt ? `Finished ${fmtDate(r.finishedAt)}` : undefined}>{fmtDate(r.startedAt)}</span>
            </Td>
          </tr>
        ))}
      </tbody>
    </Table>
  );
}

export function RunLinkHint() {
  return (
    <p className="px-3 py-3 text-xs text-zinc-600">
      Full run history: <Link to="/runs" className="text-zinc-400 hover:text-zinc-200">Runs</Link>
    </p>
  );
}
