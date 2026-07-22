import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RunsAnalytics from "./RunsAnalytics";

const apiMock = vi.fn();
vi.mock("../lib/api", () => ({ api: (path: string) => apiMock(path) }));

function renderAnalytics() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <RunsAnalytics />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const sampleRun = {
  id: "run-1",
  status: "completed",
  startedAt: "2026-07-19T10:00:00.000Z",
  finishedAt: "2026-07-19T10:02:00.000Z",
  candidates: 12,
  verified: 4,
  posted: 2,
  digest: 2,
  llmCostUsd: 0.42,
  anthropicCostUsd: 0.35,
  openaiCostUsd: 0.07,
  latencyMs: 120000,
  error: null,
  prNumber: 7,
  repoName: "api",
  orgName: "Acme",
};

describe("RunsAnalytics page", () => {
  beforeEach(() => {
    apiMock.mockReset();
  });

  it("requests the 100-run sample and renders spend stat cards", async () => {
    apiMock.mockImplementation(async (path: string) => {
      if (path === "/api/admin/runs?limit=100") return { runs: [sampleRun] };
      throw new Error(`unexpected ${path}`);
    });
    renderAnalytics();

    expect(await screen.findByText("Runs analytics")).toBeInTheDocument();
    expect(screen.getAllByText("₹34.86").length).toBeGreaterThanOrEqual(1);
    expect(apiMock).toHaveBeenCalledWith("/api/admin/runs?limit=100");
    expect(screen.getByRole("link", { name: "View run list →" })).toHaveAttribute("href", "/runs");
  });

  it("shows an error message when the sample request fails", async () => {
    apiMock.mockRejectedValue(new Error("boom"));
    renderAnalytics();
    expect(await screen.findByText(/Failed to load analytics: boom/)).toBeInTheDocument();
  });
});
