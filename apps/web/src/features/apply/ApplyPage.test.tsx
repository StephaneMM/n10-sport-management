import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import ApplyPage from "./ApplyPage";

vi.mock("@/shared/api/leads", () => ({
  useSubmitLead: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", changeLanguage: vi.fn() },
  }),
}));

describe("ApplyPage numeric inputs", () => {
  it("does not allow negative values through keyboard or direct input", () => {
    render(<ApplyPage />);

    const height = screen.getByLabelText("apply.height");
    const numericInputs = screen.getAllByRole("spinbutton");

    expect(numericInputs).toHaveLength(3);
    numericInputs.forEach((input) => expect(input).toHaveAttribute("min", "0"));

    const keyEvent = new KeyboardEvent("keydown", { key: "-", bubbles: true, cancelable: true });
    height.dispatchEvent(keyEvent);
    expect(keyEvent.defaultPrevented).toBe(true);

    fireEvent.change(height, { target: { value: "-10" } });
    expect(height).toHaveValue(0);
  });
});
