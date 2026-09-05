import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GlobalErrorWatcher } from "./GlobalErrorWatcher";

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("GlobalErrorWatcher", () => {
  it("renders nothing until an error occurs", () => {
    render(<GlobalErrorWatcher />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows a toast and logs when an uncaught window error fires", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<GlobalErrorWatcher />);

    window.dispatchEvent(new ErrorEvent("error", { error: new Error("event handler boom"), message: "event handler boom" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/Something went wrong/);
    expect(consoleErrorSpy).toHaveBeenCalledWith("[GlobalErrorWatcher] uncaught error:", expect.any(Error));
  });

  it("shows a toast and logs when a promise rejection is unhandled", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<GlobalErrorWatcher />);

    const event = new Event("unhandledrejection") as unknown as PromiseRejectionEvent;
    Object.defineProperty(event, "reason", { value: new Error("rejected") });
    window.dispatchEvent(event);

    expect(await screen.findByRole("alert")).toHaveTextContent(/background request failed/);
    expect(consoleErrorSpy).toHaveBeenCalledWith("[GlobalErrorWatcher] unhandled promise rejection:", expect.any(Error));
  });

  it("dismisses a toast when its dismiss button is clicked", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();
    render(<GlobalErrorWatcher />);

    window.dispatchEvent(new ErrorEvent("error", { error: new Error("boom") }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("caps the number of visible toasts at 3", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<GlobalErrorWatcher />);

    for (let i = 0; i < 5; i++) {
      window.dispatchEvent(new ErrorEvent("error", { error: new Error(`boom ${i}`) }));
    }

    await waitFor(() => expect(screen.getAllByRole("alert")).toHaveLength(3));
  });

  it("removes its window listeners on unmount", () => {
    const addSpy = vi.spyOn(window, "addEventListener");
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { unmount } = render(<GlobalErrorWatcher />);

    expect(addSpy).toHaveBeenCalledWith("error", expect.any(Function));
    expect(addSpy).toHaveBeenCalledWith("unhandledrejection", expect.any(Function));

    unmount();

    expect(removeSpy).toHaveBeenCalledWith("error", expect.any(Function));
    expect(removeSpy).toHaveBeenCalledWith("unhandledrejection", expect.any(Function));
  });
});
