import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiClient, ApiError } from "./client";

const TOKEN_KEY = "n10_token";

let store: Record<string, string>;

function mockFetch(response: { ok: boolean; status?: number; json: () => Promise<unknown> }) {
  const fetchMock = vi.fn().mockResolvedValue(response);
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  store = {};
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiClient", () => {
  it("resolves with the parsed JSON body on success", async () => {
    mockFetch({ ok: true, json: async () => ({ hello: "world" }) });
    await expect(apiClient("/x")).resolves.toEqual({ hello: "world" });
  });

  it("throws an ApiError carrying the status and the server's error message", async () => {
    mockFetch({
      ok: false,
      status: 403,
      json: async () => ({ error: "Forbidden: You must be an admin." }),
    });

    await expect(apiClient("/x")).rejects.toMatchObject({
      name: "ApiError",
      status: 403,
      message: "Forbidden: You must be an admin.",
    });
  });

  it("clears the stored token on 401", async () => {
    store[TOKEN_KEY] = "stale-token";
    mockFetch({ ok: false, status: 401, json: async () => ({ error: "expired" }) });

    await expect(apiClient("/x")).rejects.toBeInstanceOf(ApiError);
    expect(store[TOKEN_KEY]).toBeUndefined();
  });

  it("keeps the token on non-401 errors", async () => {
    store[TOKEN_KEY] = "good-token";
    mockFetch({ ok: false, status: 500, json: async () => ({}) });

    await expect(apiClient("/x")).rejects.toBeInstanceOf(ApiError);
    expect(store[TOKEN_KEY]).toBe("good-token");
  });

  it("sends the Authorization header when a token is stored", async () => {
    store[TOKEN_KEY] = "abc123";
    const fetchMock = mockFetch({ ok: true, json: async () => ({}) });

    await apiClient("/x");

    const requestInit = fetchMock.mock.calls[0][1] as RequestInit;
    expect((requestInit.headers as Record<string, string>).Authorization).toBe(
      "Bearer abc123",
    );
  });

  it("appends params as a query string and drops empty values", async () => {
    const fetchMock = mockFetch({ ok: true, json: async () => ({}) });

    await apiClient("/leads", {
      params: { page: 2, search: "ada", sport: undefined, gender: "" },
    });

    expect(fetchMock.mock.calls[0][0]).toBe("/api/leads?page=2&search=ada");
  });
});
