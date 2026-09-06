import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Users from "./Users";
import type { AdminUserSummary } from "../lib/types";

const apiMock = vi.fn();
vi.mock("../lib/api", () => ({
  api: (path: string, init?: RequestInit) => apiMock(path, init),
  ApiError: class ApiError extends Error {},
}));

const USERS: AdminUserSummary[] = [
  {
    id: "u1",
    email: "owner@acme.dev",
    handle: "owner",
    seatActive: true,
    isPlatformAdmin: false,
    createdAt: "2026-06-01T00:00:00.000Z",
    orgs: [
      {
        id: "org-pro",
        name: "Acme Pro",
        role: "owner",
        plan: "pro",
        reviewsUsed: 32,
        reviewsAllotted: 250,
        reviewsRemaining: 218,
        quotaBlocked: false,
      },
    ],
  },
  {
    id: "u2",
    email: "solo@free.dev",
    handle: "solo",
    seatActive: true,
    isPlatformAdmin: false,
    createdAt: "2026-06-05T00:00:00.000Z",
    orgs: [
      {
        id: "org-free",
        name: "Solo Free",
        role: "owner",
        plan: "free",
        reviewsUsed: 25,
        reviewsAllotted: 25,
        reviewsRemaining: 0,
        quotaBlocked: true,
      },
    ],
  },
];

function renderUsers() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Users />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Users page", () => {
  beforeEach(() => {
    apiMock.mockReset();
    apiMock.mockImplementation(async (path: string) => {
      if (path === "/api/admin/users") return { users: USERS };
      if (path === "/api/admin/me") return { id: "u1", email: "owner@acme.dev", isPlatformAdmin: true };
      throw new Error(`unexpected path ${path}`);
    });
  });

  it("shows each user's plan and review-quota usage per org", async () => {
    renderUsers();

    // "Individual"/"Free" also appear as Plan-filter option labels, so assert
    // via the unique usage text instead of disambiguating every badge match.
    expect(await screen.findByText("32/250 reviews used")).toBeInTheDocument();
    expect(screen.getByText("25/25 reviews used")).toBeInTheDocument();
    expect(screen.getAllByText("Individual").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Free").length).toBeGreaterThan(0);
    expect(screen.getByText("quota reached")).toBeInTheDocument();
  });

  it("filters the list down to users on a specific plan", async () => {
    renderUsers();
    await screen.findByText("owner@acme.dev");
    expect(screen.getByText("solo@free.dev")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Plan"), { target: { value: "free" } });

    expect(screen.queryByText("owner@acme.dev")).not.toBeInTheDocument();
    expect(screen.getByText("solo@free.dev")).toBeInTheDocument();
  });
});
