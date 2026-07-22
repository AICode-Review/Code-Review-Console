import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OrgDetail from "./OrgDetail";
import type { AdminOrgDetail } from "../lib/types";

const apiMock = vi.fn();
vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return { ...actual, api: (path: string, init?: RequestInit) => apiMock(path, init) };
});

function renderOrgDetail(orgId = "org-1") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/orgs/${orgId}`]}>
        <Routes>
          <Route path="/orgs/:id" element={<OrgDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

function baseOrg(overrides: Partial<AdminOrgDetail> = {}): AdminOrgDetail {
  return {
    id: "org-1",
    name: "Acme Inc",
    kind: "team",
    platform: "github",
    plan: "pro",
    seats: 5,
    createdAt: "2026-06-01T00:00:00.000Z",
    subscriptionStatus: "active",
    suspendedAt: null,
    suspendedReason: null,
    members: [{ userId: "u1", email: "owner@acme.dev", handle: "owner", role: "owner" }],
    repos: [{ id: "r1", name: "acme/web", indexStatus: "ready" }],
    usage: {
      plan: "pro",
      seats: 5,
      used: 10,
      quota: 200,
      remaining: 190,
      periodStart: "2026-07-01T00:00:00.000Z",
      periodEnd: "2026-08-01T00:00:00.000Z",
      blocked: false,
    },
    recentRuns: [],
    ...overrides,
  };
}

describe("OrgDetail page", () => {
  beforeEach(() => {
    apiMock.mockReset();
  });

  it("renders org name, plan, and summary metrics on the default Summary tab", async () => {
    apiMock.mockImplementation(async (path: string) => {
      if (path === "/api/admin/orgs/org-1") return baseOrg();
      throw new Error(`unexpected ${path}`);
    });
    renderOrgDetail();

    expect(await screen.findByRole("heading", { name: "Acme Inc" })).toBeInTheDocument();
    // "pro" appears in both the header badge and the Summary tab's Plan field.
    expect(screen.getAllByText("pro").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("5 seats")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Suspend" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Members (1)" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Repos (1)" })).toBeInTheDocument();
  });

  it("shows the members list on the Members tab", async () => {
    const user = userEvent.setup();
    apiMock.mockImplementation(async (path: string) => {
      if (path === "/api/admin/orgs/org-1") return baseOrg();
      throw new Error(`unexpected ${path}`);
    });
    renderOrgDetail();

    await screen.findByRole("heading", { name: "Acme Inc" });
    await user.click(screen.getByRole("tab", { name: "Members (1)" }));

    expect(await screen.findByText("owner@acme.dev")).toBeInTheDocument();
    expect(screen.getByText("owner")).toBeInTheDocument();
  });

  it("shows the repos list on the Repos tab", async () => {
    const user = userEvent.setup();
    apiMock.mockImplementation(async (path: string) => {
      if (path === "/api/admin/orgs/org-1") return baseOrg();
      throw new Error(`unexpected ${path}`);
    });
    renderOrgDetail();

    await screen.findByRole("heading", { name: "Acme Inc" });
    await user.click(screen.getByRole("tab", { name: "Repos (1)" }));

    expect(await screen.findByText("acme/web")).toBeInTheDocument();
    expect(screen.getByText("ready")).toBeInTheDocument();
  });

  it("suspends an org with a reason and refreshes the data", async () => {
    const user = userEvent.setup();
    let suspended = false;
    apiMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/api/admin/orgs/org-1" && !init) {
        return baseOrg(suspended ? { suspendedAt: "2026-07-22T00:00:00.000Z", suspendedReason: "abuse report" } : {});
      }
      if (path === "/api/admin/orgs/org-1/suspend" && init?.method === "POST") {
        expect(JSON.parse(init.body as string)).toEqual({ reason: "abuse report" });
        suspended = true;
        return { ok: true };
      }
      throw new Error(`unexpected ${path}`);
    });
    renderOrgDetail();

    await screen.findByRole("heading", { name: "Acme Inc" });
    await user.click(screen.getByRole("button", { name: "Suspend" }));

    const dialog = await screen.findByRole("dialog");
    await user.type(within(dialog).getByLabelText(/Reason/), "abuse report");
    await user.click(within(dialog).getByRole("button", { name: "Suspend" }));

    expect(await screen.findByText("suspended")).toBeInTheDocument();
    expect(await screen.findByText(/abuse report/)).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("unsuspends an already-suspended org", async () => {
    const user = userEvent.setup();
    apiMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/api/admin/orgs/org-1" && !init) {
        return baseOrg({ suspendedAt: "2026-07-20T00:00:00.000Z", suspendedReason: "unpaid invoice" });
      }
      if (path === "/api/admin/orgs/org-1/unsuspend" && init?.method === "POST") {
        return { ok: true };
      }
      throw new Error(`unexpected ${path}`);
    });
    renderOrgDetail();

    expect(await screen.findByText("suspended")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Unsuspend" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Unsuspend" }));

    expect(apiMock).toHaveBeenCalledWith("/api/admin/orgs/org-1/unsuspend", { method: "POST" });
  });

  it("cancels the subscription at cycle end", async () => {
    const user = userEvent.setup();
    apiMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/api/admin/orgs/org-1" && !init) return baseOrg();
      if (path === "/api/admin/orgs/org-1/billing/cancel" && init?.method === "POST") return { ok: true };
      throw new Error(`unexpected ${path}`);
    });
    renderOrgDetail();

    await screen.findByRole("heading", { name: "Acme Inc" });
    await user.click(screen.getByRole("button", { name: "Cancel sub" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Cancel at cycle end" }));

    expect(apiMock).toHaveBeenCalledWith("/api/admin/orgs/org-1/billing/cancel", { method: "POST" });
  });

  it("changes the plan to Team", async () => {
    const user = userEvent.setup();
    apiMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/api/admin/orgs/org-1" && !init) return baseOrg();
      if (path === "/api/admin/orgs/org-1/billing/change-plan" && init?.method === "POST") {
        expect(JSON.parse(init.body as string)).toEqual({ tier: "team" });
        return { ok: true };
      }
      throw new Error(`unexpected ${path}`);
    });
    renderOrgDetail();

    await screen.findByRole("heading", { name: "Acme Inc" });
    await user.click(screen.getByRole("button", { name: "→ Team" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Switch to Team" }));

    expect(apiMock).toHaveBeenCalledWith(
      "/api/admin/orgs/org-1/billing/change-plan",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("shows the action error in the dialog and keeps it open when the mutation fails", async () => {
    const user = userEvent.setup();
    apiMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/api/admin/orgs/org-1" && !init) return baseOrg();
      if (path === "/api/admin/orgs/org-1/suspend") throw new Error("network down");
      throw new Error(`unexpected ${path}`);
    });
    renderOrgDetail();

    await screen.findByRole("heading", { name: "Acme Inc" });
    await user.click(screen.getByRole("button", { name: "Suspend" }));
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "Suspend" }));

    expect(await screen.findByText("network down")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
