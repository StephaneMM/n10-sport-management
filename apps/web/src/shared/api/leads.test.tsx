import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useLeads, useLead, useSubmitLead, useUpdateLead } from "./leads";
import { ApiError } from "./client";
import { leadFormSchema, type LeadFormValues } from "@/shared/types/lead";

vi.mock("./client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./client")>();
  return { ...actual, apiClient: vi.fn() };
});

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: { language: "fr-FR" } }),
}));

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

  it.each(["", " ", "  "])("treats %j vertical jump input as blank", (verticalJumpCm) => {
    const result = leadFormSchema.safeParse({ ...validFormValues, verticalJumpCm });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.verticalJumpCm).toBe("");
  });

  it.each(["0", 0])("rejects zero vertical jump input %j like the API", (verticalJumpCm) => {
    expect(leadFormSchema.safeParse({ ...validFormValues, verticalJumpCm }).success).toBe(false);
  });

  it.each([
    ["a height below the supported range", { heightCm: 99 }],
    ["a height above the supported range", { heightCm: 251 }],
    ["a weight below the supported range", { weightKg: 29 }],
    ["a weight above the supported range", { weightKg: 201 }],
    ["more than 20 positions", { positions: Array.from({ length: 21 }, () => "Position").join(", ") }],
    ["a position over 60 characters", { positions: "P".repeat(61) }],
    ["an invalid highlight link", { highlightLinks: "not a URL" }],
    ["a non-http highlight link", { highlightLinks: "javascript:alert(1)" }],
    ["a highlight link over 500 characters", { highlightLinks: `https://example.com/${"a".repeat(500)}` }],
    ["more than 10 highlight links", { highlightLinks: Array.from({ length: 11 }, (_, i) => `https://example.com/${i}`).join(",") }],
    ["a vertical jump over 200cm", { verticalJumpCm: "201" }],
    ["a message over 2000 characters", { messageToUs: "x".repeat(2001) }],
    ["a first name over 100 characters", { firstName: "A".repeat(101) }],
    ["an unknown source", { source: "WORD_OF_MOUTH" }],
  ])("rejects %s before submission", (_label, overrides) => {
    expect(leadFormSchema.safeParse({ ...validFormValues, ...overrides }).success).toBe(false);
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

  it("validates guardian email whenever it is provided", () => {
    expect(
      leadFormSchema.safeParse({ ...validFormValues, guardianEmail: "not-an-email" }).success,
    ).toBe(false);
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
      highlightLinks: [],
      heightCm: 182,
      preferredLanguage: "FR",
    });
    expect(options?.body).toHaveProperty("verticalJumpCm", undefined);
  });

  it.each([" ", "  "])("omits whitespace-only vertical jump input %j", async (verticalJumpCm) => {
    mockApiClient.mockResolvedValue({ id: "lead-1" });

    const { result } = renderHook(() => useSubmitLead(), { wrapper });
    result.current.mutate({ ...validFormValues, verticalJumpCm });

    await waitFor(() => expect(mockApiClient).toHaveBeenCalled());
    const [, options] = mockApiClient.mock.calls[0];
    expect(options?.body).toHaveProperty("verticalJumpCm", undefined);
  });

  it("converts a positive vertical jump string to a number", async () => {
    mockApiClient.mockResolvedValue({ id: "lead-1" });

    const { result } = renderHook(() => useSubmitLead(), { wrapper });
    result.current.mutate({ ...validFormValues, verticalJumpCm: "45" });

    await waitFor(() => expect(mockApiClient).toHaveBeenCalled());
    const [, options] = mockApiClient.mock.calls[0];
    expect(options?.body).toHaveProperty("verticalJumpCm", 45);
  });

  it("drops blank comma-separated position entries before POSTing", async () => {
    mockApiClient.mockResolvedValue({ id: "lead-1" });

    const { result } = renderHook(() => useSubmitLead(), { wrapper });
    result.current.mutate({ ...validFormValues, positions: "Outside Hitter, , Opposite," });

    await waitFor(() => expect(mockApiClient).toHaveBeenCalled());
    const [, options] = mockApiClient.mock.calls[0];
    expect(options?.body).toMatchObject({ positions: ["Outside Hitter", "Opposite"] });
  });

  it("trims and converts comma-separated highlight links before POSTing", async () => {
    mockApiClient.mockResolvedValue({ id: "lead-1" });

    const { result } = renderHook(() => useSubmitLead(), { wrapper });
    result.current.mutate({ ...validFormValues, highlightLinks: " https://example.com/a , https://example.com/b " });

    await waitFor(() => expect(mockApiClient).toHaveBeenCalled());
    const [, options] = mockApiClient.mock.calls[0];
    expect(options?.body).toMatchObject({
      highlightLinks: ["https://example.com/a", "https://example.com/b"],
    });
  });
});

describe("useUpdateLead", () => {
  it("PATCHes the lead with the given fields", async () => {
    mockApiClient.mockResolvedValue({ id: "lead-1", status: "QUALIFIED" });

    const { result } = renderHook(() => useUpdateLead("lead-1"), { wrapper });
    result.current.mutate({ status: "QUALIFIED" });

    await waitFor(() =>
      expect(mockApiClient).toHaveBeenCalledWith("/leads/lead-1", {
        method: "PATCH",
        body: { status: "QUALIFIED" },
      }),
    );
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
