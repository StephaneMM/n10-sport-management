import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import AdminLeadDetail from "./AdminLeadDetail";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

vi.mock("@/shared/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/api/client")>();
  return { ...actual, apiClient: vi.fn() };
});

import { apiClient } from "@/shared/api/client";

const mockApiClient = vi.mocked(apiClient);

const lead = {
  id: "lead-1",
  firstName: "Ana",
  lastName: "Silva",
  email: "ana@example.com",
  phone: "+55 11 99999",
  country: "Brazil",
  dateOfBirth: "2008-05-14T00:00:00.000Z",
  nationality: "Brazilian",
  gender: "Female",
  sport: "Volleyball",
  positions: ["Outside Hitter"],
  heightCm: 182,
  weightKg: 70,
  highlightLinks: [],
  adminComment: "",
  status: "CONTACTED",
  consentToContact: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function renderDetail() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/admin/leads/lead-1"]}>
        <Routes>
          <Route path="/admin/leads/:id" element={<AdminLeadDetail />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockApiClient.mockResolvedValue(lead);
});

describe("AdminLeadDetail", () => {
  it("shows the current triage status", async () => {
    renderDetail();
    expect(await screen.findByText("Contacted")).toBeInTheDocument();
  });

  it("saves an admin comment with a PATCH", async () => {
    renderDetail();
    await screen.findByText("Contacted");

    fireEvent.change(screen.getByPlaceholderText("admin.comments_placeholder"), {
      target: { value: "Looks promising" },
    });
    fireEvent.click(screen.getByRole("button", { name: "admin.update_comments" }));

    await waitFor(() =>
      expect(mockApiClient).toHaveBeenCalledWith("/leads/lead-1", {
        method: "PATCH",
        body: { adminComment: "Looks promising" },
      }),
    );
  });
});
