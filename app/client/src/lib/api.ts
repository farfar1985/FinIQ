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

  // Jobs — FR5.1-5.7
  getJobs: (filters?: {
    status?: string;
    priority?: string;
    agent_type?: string;
    limit?: number;
    offset?: number;
  }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    if (filters?.priority) params.set("priority", filters.priority);
    if (filters?.agent_type) params.set("agent_type", filters.agent_type);
    if (filters?.limit) params.set("limit", String(filters.limit));
    if (filters?.offset) params.set("offset", String(filters.offset));
    const qs = params.toString();
    return request<import("@/types").JobsResponse>(`/jobs${qs ? `?${qs}` : ""}`);
  },

  getJob: (id: string) =>
    request<{ job: import("@/types").Job }>(`/jobs/${id}`),

  submitJob: (job: {
    query: string;
    priority?: string;
    agent_type?: string;
    schedule?: string;
  }) =>
    request<{ job: import("@/types").Job }>("/jobs", {
      method: "POST",
      body: JSON.stringify(job),
    }),

  updateJob: (id: string, data: { status: string; result?: unknown; error?: string }) =>
    request<{ job: import("@/types").Job }>(`/jobs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  retryJob: (id: string) =>
    request<{ job: import("@/types").Job }>(`/jobs/${id}/retry`, {
      method: "POST",
    }),

  getAgents: () =>
    request<{ agents: import("@/types").AgentInfo[] }>("/jobs/agents"),
};
