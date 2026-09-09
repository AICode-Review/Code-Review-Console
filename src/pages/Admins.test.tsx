import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Admins from "./Admins";
import type { AdminUserSummary } from "../lib/types";

const apiMock = vi.fn();
vi.mock("../lib/api", async () => {
  const actual = await vi.importActual<typeof import("../lib/api")>("../lib/api");
  return { ...actual, api: (path: string, init?: RequestInit) => apiMock(path, init) };
});

const ADMIN: AdminUserSummary = {
  id: "u-admin",
  email: "ops@scrutinye.dev",
  handle: "ops",
  seatActive: true,
  isPlatformAdmin: true,
  createdAt: "2026-06-01T00:00:00.000Z",
  orgs: [],
};

const CANDIDATE: AdminUserSummary = {
  id: "u-user",
  email: "owner@acme.dev",
  handle: "owner",
  seatActive: true,
  isPlatformAdmin: false,
  createdAt: "2026-06-05T00:00:00.000Z",
  orgs: [],
};

function renderAdmins() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <Admins />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Admins page", () => {
  beforeEach(() => {
    apiMock.mockReset();
    apiMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/api/admin/admins" && !init?.method) return { admins: [ADMIN] };
      if (path === "/api/admin/users") return { users: [ADMIN, CANDIDATE] };
      if (path === "/api/admin/me") return { id: "u-admin", email: "ops@scrutinye.dev", isPlatformAdmin: true };
      throw new Error(`unexpected ${init?.method ?? "GET"} ${path}`);
    });
  });

  it("lists platform admins and does not show a grant button on the table", async () => {
    renderAdmins();
    expect(await screen.findByText("ops@scrutinye.dev")).toBeInTheDocument();
    expect(screen.getByText("you")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add admin" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Grant admin" })).not.toBeInTheDocument();
  });

  it("disables revoke when this is the last platform admin", async () => {
    renderAdmins();
    expect(await screen.findByRole("button", { name: "Revoke" })).toBeDisabled();
  });

  it("lets you revoke when more than one admin exists", async () => {
    const other: AdminUserSummary = {
      ...ADMIN,
      id: "u-admin-2",
      email: "second@scrutinye.dev",
      handle: "second",
    };
    apiMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/api/admin/admins/u-admin-2" && init?.method === "DELETE") {
        return { id: "u-admin-2", isPlatformAdmin: false };
      }
      if (path === "/api/admin/admins") return { admins: [ADMIN, other] };
      if (path === "/api/admin/users") return { users: [ADMIN, other, CANDIDATE] };
      if (path === "/api/admin/me") return { id: "u-admin", email: "ops@scrutinye.dev", isPlatformAdmin: true };
      throw new Error(`unexpected ${init?.method ?? "GET"} ${path}`);
    });

    renderAdmins();
    const revokeButtons = await screen.findAllByRole("button", { name: "Revoke" });
    expect(revokeButtons).toHaveLength(2);
    expect(revokeButtons[0]).not.toBeDisabled();
    fireEvent.click(revokeButtons[1]!);
    fireEvent.click(screen.getByRole("button", { name: "Revoke admin" }));

    await vi.waitFor(() => {
      expect(apiMock.mock.calls.some((c) => c[0] === "/api/admin/admins/u-admin-2" && (c[1] as RequestInit | undefined)?.method === "DELETE")).toBe(true);
    });
  });

  it("adds an admin by picking a signed-in user", async () => {
    apiMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/api/admin/admins" && init?.method === "POST") {
        return { id: "u-user", isPlatformAdmin: true };
      }
      if (path === "/api/admin/admins") return { admins: [ADMIN] };
      if (path === "/api/admin/users") return { users: [ADMIN, CANDIDATE] };
      if (path === "/api/admin/me") return { id: "u-admin", email: "ops@scrutinye.dev", isPlatformAdmin: true };
      throw new Error(`unexpected ${init?.method ?? "GET"} ${path}`);
    });

    renderAdmins();
    fireEvent.click(await screen.findByRole("button", { name: "Add admin" }));
    fireEvent.click(await screen.findByRole("button", { name: /owner@acme.dev/ }));
    fireEvent.click(screen.getByRole("button", { name: "Grant access" }));

    await vi.waitFor(() => {
      const post = apiMock.mock.calls.find((c) => c[0] === "/api/admin/admins" && (c[1] as RequestInit | undefined)?.method === "POST");
      expect(post).toBeTruthy();
      expect(JSON.parse((post![1] as RequestInit).body as string)).toEqual({ userId: "u-user" });
    });
  });

  it("adds an admin by email when no user is selected", async () => {
    apiMock.mockImplementation(async (path: string, init?: RequestInit) => {
      if (path === "/api/admin/admins" && init?.method === "POST") {
        return { id: "u-user", isPlatformAdmin: true };
      }
      if (path === "/api/admin/admins") return { admins: [ADMIN] };
      if (path === "/api/admin/users") return { users: [ADMIN, CANDIDATE] };
      if (path === "/api/admin/me") return { id: "u-admin", email: "ops@scrutinye.dev", isPlatformAdmin: true };
      throw new Error(`unexpected ${init?.method ?? "GET"} ${path}`);
    });

    renderAdmins();
    fireEvent.click(await screen.findByRole("button", { name: "Add admin" }));
    fireEvent.change(screen.getByLabelText("Or enter their email"), { target: { value: "owner@acme.dev" } });
    fireEvent.click(screen.getByRole("button", { name: "Grant access" }));

    await vi.waitFor(() => {
      const post = apiMock.mock.calls.find((c) => c[0] === "/api/admin/admins" && (c[1] as RequestInit | undefined)?.method === "POST");
      expect(post).toBeTruthy();
      expect(JSON.parse((post![1] as RequestInit).body as string)).toEqual({ email: "owner@acme.dev" });
    });
  });
});
