import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Layout } from "./Layout";
import { ThemeProvider } from "../hooks/useTheme";

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    user: { email: "admin@example.com" },
    signOut: vi.fn(),
  }),
}));

function renderLayout(path = "/") {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <Layout />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("Layout", () => {
  beforeEach(() => {
    localStorage.removeItem("scrutinye.console.theme");
    localStorage.removeItem("scrutinye.console.sidebarCollapsed");
  });

  it("renders Users and Admins as separate nav items", () => {
    renderLayout("/");
    expect(screen.getByRole("link", { name: /^Users$/i })).toHaveAttribute("href", "/users");
    expect(screen.getByRole("link", { name: /^Admins$/i })).toHaveAttribute("href", "/admins");
  });

  it("titles the header Admins on /admins", () => {
    renderLayout("/admins");
    expect(screen.getByRole("heading", { name: "Admins" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /^Admins$/i }).className).toContain("bg-zinc-800");
    expect(screen.getByRole("link", { name: /^Users$/i }).className).not.toContain("bg-zinc-800");
  });

  it("renders a top header with page title and hamburger", () => {
    renderLayout("/");
    expect(screen.getByRole("banner")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Collapse sidebar" })).toBeInTheDocument();
    expect(screen.getByText("admin@example.com")).toBeInTheDocument();
  });

  it("collapses and expands the sidebar from the header menu", async () => {
    const user = userEvent.setup();
    renderLayout();

    expect(screen.getByText("Scrutinye")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Overview/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Collapse sidebar" }));
    expect(screen.queryByText("Admin console")).not.toBeInTheDocument();
    expect(localStorage.getItem("scrutinye.console.sidebarCollapsed")).toBe("1");

    await user.click(screen.getByRole("button", { name: "Expand sidebar" }));
    expect(screen.getByText("Scrutinye")).toBeInTheDocument();
    expect(screen.getByText("Admin console")).toBeInTheDocument();
  });

  it("toggles light and dark theme from the header", async () => {
    const user = userEvent.setup();
    renderLayout();

    const shell = document.querySelector(".console-shell");
    expect(shell).toHaveAttribute("data-theme", "dark");

    await user.click(screen.getByRole("button", { name: "Switch to light theme" }));
    expect(shell).toHaveAttribute("data-theme", "light");
    expect(localStorage.getItem("scrutinye.console.theme")).toBe("light");

    await user.click(screen.getByRole("button", { name: "Switch to dark theme" }));
    expect(shell).toHaveAttribute("data-theme", "dark");
  });

  it("activates only Runs analytics when on /runs/analytics (not Review runs)", () => {
    renderLayout("/runs/analytics");
    const analytics = screen.getByRole("link", { name: /Runs analytics/i });
    const reviewRuns = screen.getByRole("link", { name: /Review runs/i });
    expect(analytics.className).toContain("bg-zinc-800");
    expect(reviewRuns.className).not.toContain("bg-zinc-800");
  });

  it("keeps Review runs active on a run detail path", () => {
    renderLayout("/runs/run-1");
    const reviewRuns = screen.getByRole("link", { name: /Review runs/i });
    const analytics = screen.getByRole("link", { name: /Runs analytics/i });
    expect(reviewRuns.className).toContain("bg-zinc-800");
    expect(analytics.className).not.toContain("bg-zinc-800");
  });

  it("activates only Billing analytics when on /billing/analytics", () => {
    renderLayout("/billing/analytics");
    expect(screen.getByRole("link", { name: /^Billing analytics$/i }).className).toContain("bg-zinc-800");
    expect(screen.getByRole("link", { name: /^Billing$/i }).className).not.toContain("bg-zinc-800");
  });

  it("activates only Audit analytics when on /audit/analytics", () => {
    renderLayout("/audit/analytics");
    expect(screen.getByRole("link", { name: /^Audit analytics$/i }).className).toContain("bg-zinc-800");
    expect(screen.getByRole("link", { name: /^Audit log$/i }).className).not.toContain("bg-zinc-800");
  });
});
