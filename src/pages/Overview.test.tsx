import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Overview from "./Overview";
import type { PlatformOverview } from "../hooks/useOverview";

const apiMock = vi.fn();
vi.mock("../lib/api", () => ({ api: (path: string) => apiMock(path) }));

const SAMPLE: PlatformOverview = {
  totalOrgs: 12,
  totalUsers: 30,
  subscriptionsByTier: [{ tier: "pro", count: 3 }],
  mrrUsd: 225,
  reviewsThisMonth: 88,
  llmSpendThisMonthUsd: 4.5,
  anthropicSpendThisMonthUsd: 3.8,
  openaiSpendThisMonthUsd: 0.7,
  periodStart: "2026-07-01T00:00:00.000Z",
  periodEnd: "2026-08-01T00:00:00.000Z",
};

function renderOverview() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <Overview />
    </QueryClientProvider>,
  );
}

describe("Overview page", () => {
  beforeEach(() => {
    apiMock.mockReset();
    apiMock.mockImplementation(async (path: string) => {
      if (path === "/api/admin/overview") return SAMPLE;
      if (path === "/api/admin/orgs") {
        return {
          orgs: [
            {
              id: "o1",
              name: "Acme",
              kind: "team",
              platform: "github",
              plan: "pro",
              seats: 3,
              createdAt: "2026-06-01T00:00:00.000Z",
              subscriptionStatus: "active",
              suspendedAt: null,
              suspendedReason: null,
            },
          ],
        };
      }
      if (path === "/api/admin/billing") {
        return { subscriptions: [{ orgId: "o1", orgName: "Acme", tier: "pro", status: "active", seats: 3, razorpayCustomerId: null, razorpaySubId: "sub_1" }] };
      }
      if (path.startsWith("/api/admin/runs")) return { runs: [] };
      throw new Error(`unexpected path ${path}`);
    });
  });

  it("renders platform-wide stats once the overview query resolves", async () => {
    renderOverview();

    expect(await screen.findByText("12")).toBeInTheDocument();
    expect(screen.getByText("30")).toBeInTheDocument();
    expect(screen.getByText("₹18,675.00")).toBeInTheDocument();
    expect(screen.getByText("88")).toBeInTheDocument();
    expect(screen.getByText(/Orgs by plan/i)).toBeInTheDocument();
  });

  it("shows an error message when the overview request fails", async () => {
    apiMock.mockImplementation(async (path: string) => {
      if (path === "/api/admin/overview") throw new Error("network down");
      if (path === "/api/admin/orgs") return { orgs: [] };
      if (path === "/api/admin/billing") return { subscriptions: [] };
      if (path.startsWith("/api/admin/runs")) return { runs: [] };
      throw new Error(`unexpected path ${path}`);
    });
    renderOverview();
    expect(await screen.findByText(/Failed to load overview: network down/)).toBeInTheDocument();
  });
});
