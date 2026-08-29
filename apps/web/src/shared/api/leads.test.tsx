import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { useLeads, useLead } from "./leads";
import { ApiError } from "./client";

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

describe("useLeads", () => {
  it("returns the leads array unwrapped from the API envelope", async () => {
    mockApiClient.mockResolvedValue({ leads: [{ id: "1" }, { id: "2" }] });

    const { result } = renderHook(() => useLeads(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
  });

  it("surfaces the error instead of falling back to mock data", async () => {
    mockApiClient.mockRejectedValue(new ApiError(500, "Internal server error"));

    const { result } = renderHook(() => useLeads(), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
    expect(result.current.error).toBeInstanceOf(ApiError);
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
