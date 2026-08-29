import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import AdminDashboard from "./AdminDashboard";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, unknown>) =>
      vars ? `${key}:${vars.page}/${vars.total}` : key,
    i18n: { language: "en", changeLanguage: () => Promise.resolve() },
  }),
}));

vi.mock("@/shared/api/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/api/client")>();
  return { ...actual, apiClient: vi.fn() };
});

import { apiClient } from "@/shared/api/client";

const mockApiClient = vi.mocked(apiClient);

function makeLeads(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `lead-${i}`,
    firstName: `First${i}`,
    lastName: `Last${i}`,
    email: `l${i}@example.com`,
    phone: "",
    country: "Brazil",
    nationality: "Brazilian",
    gender: "Male",
    sport: "Soccer",
    positions: [],
    heightCm: 1,
    weightKg: 1,
    highlightLinks: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  }));
}

function renderDashboard(entry = "/admin/dashboard") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[entry]}>
        <AdminDashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockApiClient.mockResolvedValue({
    leads: makeLeads(2),
    pagination: { page: 1, pageSize: 20, total: 40, totalPages: 2 },
  });
});

describe("AdminDashboard", () => {
  it("renders the leads and the total count from the API", async () => {
    renderDashboard();

    expect(await screen.findByText("First0")).toBeInTheDocument();
    expect(screen.getByText("(40)")).toBeInTheDocument();
  });

  it("advances the page when Next is clicked", async () => {
    renderDashboard();
    await screen.findByText("First0");

    fireEvent.click(screen.getByRole("button", { name: "admin.next" }));

    await waitFor(() =>
      expect(mockApiClient).toHaveBeenCalledWith(
        "/leads",
        expect.objectContaining({ params: expect.objectContaining({ page: 2 }) }),
      ),
    );
  });

  it("requests a sort when a column header is clicked", async () => {
    renderDashboard();
    await screen.findByText("First0");

    fireEvent.click(screen.getByRole("columnheader", { name: /admin\.last_name/ }));

    await waitFor(() =>
      expect(mockApiClient).toHaveBeenCalledWith(
        "/leads",
        expect.objectContaining({
          params: expect.objectContaining({ sortBy: "lastName", sortOrder: "asc" }),
        }),
      ),
    );
  });

  it("reads the initial filters from the URL", async () => {
    renderDashboard("/admin/dashboard?sport=Soccer&page=2");

    await waitFor(() =>
      expect(mockApiClient).toHaveBeenCalledWith(
        "/leads",
        expect.objectContaining({
          params: expect.objectContaining({ sport: "Soccer", page: 2 }),
        }),
      ),
    );
  });
});
