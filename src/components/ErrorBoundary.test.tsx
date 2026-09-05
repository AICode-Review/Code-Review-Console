import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

function Bomb({ armed }: { armed: boolean }) {
  if (armed) throw new Error("boom");
  return <div>safe content</div>;
}

describe("ErrorBoundary", () => {
  it("renders children normally when nothing throws", () => {
    render(
      <ErrorBoundary>
        <Bomb armed={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("safe content")).toBeInTheDocument();
  });

  it("renders the fallback UI instead of crashing the tree when a child throws", () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bomb armed={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.queryByText("safe content")).not.toBeInTheDocument();
    consoleErrorSpy.mockRestore();
  });

  it("uses the scope prop in the fallback copy", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary scope="console">
        <Bomb armed={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/This console hit an unexpected error/)).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it("recovers when 'Try again' is clicked and the child no longer throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();

    const flaky = { armed: true };
    function FlakyBomb() {
      if (flaky.armed) throw new Error("boom");
      return <div>recovered</div>;
    }

    render(
      <ErrorBoundary>
        <FlakyBomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Something went wrong")).toBeInTheDocument();

    flaky.armed = false;
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByText("recovered")).toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
