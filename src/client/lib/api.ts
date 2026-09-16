import type { Result, TaskSummary } from "../../shared/rpcTypes";

const AUTH_TOKEN_KEY = "tg_auth_token";

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string): void {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

export function clearAuthToken(): void {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // ignore
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<Result<T>> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      "content-type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((init?.headers as Record<string, string>) ?? {}),
    };

    const res = await fetch(path, {
      ...init,
      headers,
    });

    if (res.status === 401 && !path.startsWith("/api/auth/login")) {
      clearAuthToken();
      window.dispatchEvent(new CustomEvent("tg_auth_unauthorized"));
      return {
        ok: false,
        errorCode: 401,
        description: "Authentication session expired or invalid",
        reason: "unauthorized",
      };
    }

    const body = (await res.json()) as Result<T>;
    return body;
  } catch (e) {
    return { ok: false, errorCode: 0, description: e instanceof Error ? e.message : String(e), reason: "unknown" };
  }
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

/** Fetches all tasks across all bots in a single query. */
export async function listAllTasks(): Promise<Result<TaskSummary[]>> {
  return api.get<TaskSummary[]>("/api/tasks");
}
