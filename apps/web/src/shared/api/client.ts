const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

const TOKEN_STORAGE_KEY = "n10_token";

interface RequestOptions {
  method?: string;
  body?: unknown;
  headers?: Record<string, string>;
}

/** Error thrown for any non-2xx response, carrying the HTTP status. */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = "GET", body, headers = {} } = options;
  const token = getAuthToken();

  const config: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    // The API returns `{ error: string }`; tolerate `{ message }` and empty bodies.
    const payload = await response.json().catch(() => null);
    const message =
      payload?.error || payload?.message || `Request failed (${response.status})`;

    // A rejected token is worthless — drop it so the app stops sending it and
    // ProtectedRoute sends the user back to the login screen.
    if (response.status === 401) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }

    throw new ApiError(response.status, message);
  }

  return response.json();
}
