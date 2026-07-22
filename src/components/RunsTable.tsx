import { Link } from "react-router-dom";
import type { AdminRunSummary } from "../lib/types";
import { Badge, EmptyState, Table, Td, Th, fmtDate, fmtInr, statusTone } from "./ui";

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
          <Th align="right">Total</Th>
          <Th>Started</Th>
          <Th>
            <span className="sr-only">View</span>
          </Th>
        </tr>
      </thead>
      <tbody>
        {runs.map((r) => (
          <tr key={r.id} className="hover:bg-zinc-900/50">
            {showOrg && <Td>{r.orgName ?? "—"}</Td>}
            <Td>
              <Link to={`/runs/${r.id}`} className="text-zinc-200 hover:underline">
                {r.repoName ?? "—"}
                {r.prNumber != null && <span className="text-zinc-500"> #{r.prNumber}</span>}
              </Link>
            </Td>
            <Td>
              <Badge tone={statusTone(r.status)}>{r.status}</Badge>
            </Td>
            <Td align="right" className="tabular-nums">
              {fmtInr(r.llmCostUsd)}
            </Td>
            <Td>{fmtDate(r.startedAt)}</Td>
            <Td>
              <Link
                to={`/runs/${r.id}`}
                className="text-xs text-zinc-500 hover:text-zinc-300"
                aria-label={`View run ${r.repoName ?? r.id}`}
              >
                View →
              </Link>
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
      Full run history:{" "}
      <Link to="/runs" className="text-zinc-400 hover:text-zinc-200">
        Runs
      </Link>
    </p>
  );
}
