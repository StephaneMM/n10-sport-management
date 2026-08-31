import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useLeads, useLead, useSubmitLead } from "./leads";
import { ApiError } from "./client";
import { leadFormSchema, type LeadFormValues } from "@/shared/types/lead";

vi.mock("./client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./client")>();
  return { ...actual, apiClient: vi.fn() };
});

import { apiClient } from "./client";

const mockApiClient = vi.mocked(apiClient);

function wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

const paginated = (leads: unknown[], total = leads.length) => ({
  leads,
  pagination: { page: 1, pageSize: 20, total, totalPages: 1 },
});

describe("useLeads", () => {
  it("returns the paginated envelope from the API", async () => {
    mockApiClient.mockResolvedValue(paginated([{ id: "1" }, { id: "2" }], 42));

    const { result } = renderHook(() => useLeads(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.leads).toHaveLength(2);
    expect(result.current.data?.pagination.total).toBe(42);
  });

  it("passes filters through to the API as query params", async () => {
    mockApiClient.mockResolvedValue(paginated([]));

    renderHook(() => useLeads({ page: 2, search: "ada", sport: "Soccer" }), { wrapper });

    await waitFor(() => expect(mockApiClient).toHaveBeenCalled());
    expect(mockApiClient).toHaveBeenCalledWith("/leads", {
      params: { page: 2, search: "ada", sport: "Soccer" },
    });
  });

  it("surfaces the error instead of falling back to mock data", async () => {
    mockApiClient.mockRejectedValue(new ApiError(500, "Internal server error"));

    const { result } = renderHook(() => useLeads(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeInstanceOf(ApiError);
  });
});

const validFormValues: LeadFormValues = {
  firstName: "Ana",
  lastName: "Silva",
  email: "ana@example.com",
  phone: "+55 11 99999-9999",
  country: "Brazil",
  dateOfBirth: "14/05/2008",
  nationality: "Brazilian",
  gender: "Female",
  sport: "Volleyball",
  positions: "Outside Hitter, Opposite",
  heightCm: 182,
  weightKg: 70,
  verticalJumpCm: "",
  league: "",
  currentClub: "",
  highlightLinks: "",
  messageToUs: "",
  source: "INSTAGRAM",
  consentToContact: true,
};

describe("leadFormSchema", () => {
  it.each(["", "2008-05-14", "5/14/2008", "32/01/2008", "14/05/2999"])(
    "rejects %j",
    (dateOfBirth) => {
      expect(leadFormSchema.safeParse({ ...validFormValues, dateOfBirth }).success).toBe(false);
    },
  );

  it("accepts a real past DD/MM/YYYY date", () => {
    expect(leadFormSchema.safeParse(validFormValues).success).toBe(true);
  });

  it("requires a source", () => {
    expect(leadFormSchema.safeParse({ ...validFormValues, source: "" }).success).toBe(false);
  });

  it("requires consent to contact", () => {
    expect(
      leadFormSchema.safeParse({ ...validFormValues, consentToContact: false }).success,
    ).toBe(false);
  });

  it("requires guardian contact when the applicant is a minor", () => {
    const minor = { ...validFormValues, dateOfBirth: "15/06/2012" };
    expect(leadFormSchema.safeParse(minor).success).toBe(false);
    expect(
      leadFormSchema.safeParse({
        ...minor,
        guardianName: "Rosa Silva",
        guardianEmail: "rosa@example.com",
        guardianPhone: "+55 11 98888-0000",
      }).success,
    ).toBe(true);
  });
});

describe("useSubmitLead", () => {
  it("converts the date of birth to ISO and splits positions before POSTing", async () => {
    mockApiClient.mockResolvedValue({ id: "lead-1" });

    const { result } = renderHook(() => useSubmitLead(), { wrapper });
    result.current.mutate(validFormValues);

    await waitFor(() => expect(mockApiClient).toHaveBeenCalled());
    const [, options] = mockApiClient.mock.calls[0];
    expect(options?.method).toBe("POST");
    expect(options?.body).toMatchObject({
      dateOfBirth: "2008-05-14",
      positions: ["Outside Hitter", "Opposite"],
      heightCm: 182,
    });
  });
});

describe("useLead", () => {
  it("surfaces a 404 instead of returning a fake lead", async () => {
    mockApiClient.mockRejectedValue(new ApiError(404, "Lead not found."));

    const { result } = renderHook(() => useLead("does-not-exist"), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
    expect((result.current.error as ApiError).status).toBe(404);
  });

  it("stays idle when no id is provided", () => {
    const { result } = renderHook(() => useLead(""), { wrapper });
    expect(result.current.fetchStatus).toBe("idle");
    expect(mockApiClient).not.toHaveBeenCalled();
  });
});
