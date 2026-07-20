import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Orgs from "./Orgs";

const apiMock = vi.fn();
vi.mock("../lib/api", () => ({ api: (path: string) => apiMock(path) }));

function renderOrgs() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Orgs />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Orgs page", () => {
  it("lists every org with its plan and seat count", async () => {
    apiMock.mockResolvedValueOnce({
      orgs: [
        { id: "org-1", name: "Acme Inc", kind: "team", platform: "github", plan: "pro", seats: 5, createdAt: "2026-06-01T00:00:00.000Z", subscriptionStatus: "active", suspendedAt: null, suspendedReason: null },
        { id: "org-2", name: "Solo Dev", kind: "individual", platform: "bitbucket", plan: "free", seats: 1, createdAt: "2026-07-01T00:00:00.000Z", subscriptionStatus: null, suspendedAt: null, suspendedReason: null },
      ],
    });
    renderOrgs();

    expect(await screen.findByText("Acme Inc")).toBeInTheDocument();
    expect(screen.getByText("Solo Dev")).toBeInTheDocument();
    expect(screen.getByText(/2 of 2 organizations/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Acme Inc" })).toHaveAttribute("href", "/orgs/org-1");
  });

  it("shows an error message when the orgs request fails", async () => {
    apiMock.mockRejectedValueOnce(new Error("boom"));
    renderOrgs();
    expect(await screen.findByText(/Failed to load orgs: boom/)).toBeInTheDocument();
  });
});
