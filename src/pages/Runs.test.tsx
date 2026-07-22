import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Runs from "./Runs";

const apiMock = vi.fn();
vi.mock("../lib/api", () => ({ api: (path: string) => apiMock(path) }));

function renderRuns() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Runs />
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

describe("Runs page", () => {
  beforeEach(() => {
    apiMock.mockReset();
  });

  it("shows finding funnel columns and requests cursor pagination params", async () => {
    apiMock.mockImplementation(async (path: string) => {
      if (path === "/api/admin/runs?limit=25") return { runs: [sampleRun] };
      throw new Error(`unexpected ${path}`);
    });
    renderRuns();

    expect(await screen.findByText("Acme")).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Cand" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Ver" })).toBeInTheDocument();
    expect(apiMock).toHaveBeenCalledWith("/api/admin/runs?limit=25");
  });

  it("loads the next page with before= last startedAt", async () => {
    const user = userEvent.setup();
    const page1 = Array.from({ length: 25 }, (_, i) => ({
      id: `run-${i}`,
      status: "completed",
      startedAt: `2026-07-19T12:${String(59 - i).padStart(2, "0")}:00.000Z`,
      finishedAt: null,
      candidates: 1,
      verified: 1,
      posted: 1,
      digest: 0,
      llmCostUsd: 0.01,
      anthropicCostUsd: 0.008,
      openaiCostUsd: 0.002,
      latencyMs: 1000,
      error: null,
      orgName: "Org",
      repoName: "repo",
      prNumber: i + 1,
    }));

    apiMock.mockImplementation(async (path: string) => {
      if (path === "/api/admin/runs?limit=100") return { runs: page1 };
      if (path === "/api/admin/runs?limit=25") return { runs: page1 };
      if (path.includes("before=")) {
        return {
          runs: [
            {
              id: "run-next",
              status: "failed",
              startedAt: "2026-07-18T09:00:00.000Z",
              finishedAt: null,
              candidates: 0,
              verified: 0,
              posted: 0,
              digest: 0,
              llmCostUsd: 0,
              anthropicCostUsd: 0,
              openaiCostUsd: 0,
              latencyMs: null,
              error: "boom",
              orgName: "Org",
              repoName: "repo",
              prNumber: 99,
            },
          ],
        };
      }
      throw new Error(`unexpected ${path}`);
    });

    renderRuns();
    expect(await screen.findByText("Page 1")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(await screen.findByText("Page 2")).toBeInTheDocument();
    expect(await screen.findByText("boom")).toBeInTheDocument();

    const beforeCall = apiMock.mock.calls.map((c) => c[0] as string).find((p) => p.includes("before="));
    expect(beforeCall).toBeTruthy();
    expect(beforeCall).toContain("limit=25");
    expect(beforeCall).toContain(encodeURIComponent(page1[page1.length - 1]!.startedAt));
  });
});
