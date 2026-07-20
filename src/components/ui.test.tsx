import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { CursorPagination, Pagination, fmtInr, fmtInrSeat, pageNumbers } from "../components/ui";

describe("fmtInr", () => {
  it("converts USD amounts to Indian Rupees", () => {
    expect(fmtInr(0.42)).toBe("₹34.86");
    expect(fmtInr(15)).toBe("₹1,245.00");
    expect(fmtInrSeat(15)).toBe("₹1,245");
    expect(fmtInrSeat(25)).toBe("₹2,075");
  });
});

describe("pageNumbers", () => {
  it("lists every page when total is small", () => {
    expect(pageNumbers(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("windows around the current page with ellipsis", () => {
    expect(pageNumbers(5, 20)).toEqual([1, "…", 4, 5, 6, "…", 20]);
  });
});

describe("Pagination", () => {
  it("shows range and numbered page buttons", () => {
    render(
      <Pagination page={1} totalPages={1} totalItems={5} pageSize={10} onPageChange={() => {}} />,
    );
    expect(screen.getByText("1–5 of 5")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1" })).toHaveAttribute("aria-current", "page");
  });

  it("calls onPageChange for next/prev and page numbers", async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(
      <Pagination page={2} totalPages={3} totalItems={25} pageSize={10} onPageChange={onPageChange} />,
    );
    expect(screen.getByText("11–20 of 25")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Previous" }));
    expect(onPageChange).toHaveBeenCalledWith(1);
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
    await user.click(screen.getByRole("button", { name: "3" }));
    expect(onPageChange).toHaveBeenCalledWith(3);
  });
});

describe("CursorPagination", () => {
  it("disables prev on first page and next when hasMore is false", () => {
    render(
      <CursorPagination
        page={1}
        pageSize={25}
        onPageSizeChange={() => {}}
        canPrev={false}
        hasMore={false}
        onPrev={() => {}}
        onNext={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  it("invokes next/prev handlers", async () => {
    const user = userEvent.setup();
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(
      <CursorPagination
        page={2}
        pageSize={25}
        onPageSizeChange={() => {}}
        canPrev
        hasMore
        onPrev={onPrev}
        onNext={onNext}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Previous" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(onPrev).toHaveBeenCalled();
    expect(onNext).toHaveBeenCalled();
  });
});
