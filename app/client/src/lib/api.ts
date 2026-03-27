/**
 * API client for FinIQ backend
 */

const API_BASE = "/api";

async function request<T>(
  path: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(error.message || `API error: ${res.status}`);
  }

  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // Health check
  health: () => request<{ status: string; mode: string }>("/health"),

  // Chat / NL query
  query: (message: string, sessionId?: string) =>
    request<{
      response: string;
      data?: unknown;
      chartConfig?: unknown;
      sources?: unknown[];
    }>("/chat", {
      method: "POST",
      body: JSON.stringify({ message, sessionId }),
    }),

  // Entities
  getEntities: () =>
    request<{ entities: { Entity_ID: string; Entity_Alias: string; Parent_Entity_ID: string | null }[] }>(
      "/entities"
    ),

  // Jobs
  getJobs: () => request<{ jobs: unknown[] }>("/jobs"),
  submitJob: (job: { query: string; priority?: string }) =>
    request<{ job: unknown }>("/jobs", {
      method: "POST",
      body: JSON.stringify(job),
    }),
};
