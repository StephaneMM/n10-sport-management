import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

import LeadFilters from "./LeadFilters";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("LeadFilters", () => {
  it("commits the search value only after typing pauses (debounced)", async () => {
    const onChange = vi.fn();
    render(<LeadFilters filters={{}} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("admin.search_placeholder"), {
      target: { value: "ada" },
    });

    expect(onChange).not.toHaveBeenCalled();
    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ search: "ada" }));
  });

  it("commits the nationality value after a debounce", async () => {
    const onChange = vi.fn();
    render(<LeadFilters filters={{}} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("admin.filter_nationality"), {
      target: { value: "Brazilian" },
    });

    await waitFor(() => expect(onChange).toHaveBeenCalledWith({ nationality: "Brazilian" }));
  });

  it("shows the clear button only when a filter is active and resets everything", () => {
    const onChange = vi.fn();
    const { rerender } = render(<LeadFilters filters={{}} onChange={onChange} />);
    expect(screen.queryByText("admin.clear_filters")).toBeNull();

    rerender(<LeadFilters filters={{ sport: "Soccer" }} onChange={onChange} />);
    fireEvent.click(screen.getByText("admin.clear_filters"));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ sport: undefined, search: undefined, nationality: undefined }),
    );
  });

  it("renders both ends of the date range", () => {
    render(<LeadFilters filters={{}} onChange={vi.fn()} />);
    expect(screen.getByLabelText("admin.date_from")).toBeInTheDocument();
    expect(screen.getByLabelText("admin.date_to")).toBeInTheDocument();
  });

  it("renders the status filter and clears it with the other filters", () => {
    const onChange = vi.fn();
    const { rerender } = render(<LeadFilters filters={{}} onChange={onChange} />);
    expect(screen.getByLabelText("admin.filter_status")).toBeInTheDocument();

    rerender(<LeadFilters filters={{ status: "QUALIFIED" }} onChange={onChange} />);
    fireEvent.click(screen.getByText("admin.clear_filters"));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ status: undefined }));
  });
});
