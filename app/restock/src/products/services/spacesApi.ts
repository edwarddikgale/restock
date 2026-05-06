const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/+$/, "");

export interface Space {
  _id: string;
  tenantId: string;
  name: string;
  description?: string;
  sortOrder?: number;
  color?: string;
  icon?: string;
}

export interface SectionStats {
  items: number;
  runningLow: number;
  onHand: number;
  fullyStocked: number;
}

export interface LastActivity {
  productId: string;
  productName: string;
  lastUpdatedOn: string;
}

export interface SectionSummary {
  _id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  stats: SectionStats;
  lastActivity: LastActivity | null;
}

type GetToken = () => Promise<string | null>;

async function call<T>(path: string, init: RequestInit, getToken: GetToken): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || body?.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchMySpaces(getToken: GetToken): Promise<Space[]> {
  const data = await call<{ spaces: Space[] }>("/api/spaces/my", { method: "GET" }, getToken);
  return data.spaces || [];
}

export async function fetchMySectionsSummary(getToken: GetToken): Promise<SectionSummary[]> {
  const data = await call<{ sections: SectionSummary[] }>("/api/spaces/my/summary", { method: "GET" }, getToken);
  return data.sections || [];
}

export async function createSpace(
  payload: { name: string; description?: string; color?: string; icon?: string },
  getToken: GetToken
): Promise<Space> {
  return call<Space>("/api/spaces", { method: "POST", body: JSON.stringify(payload) }, getToken);
}

export async function updateSpace(
  id: string,
  patch: Partial<Pick<Space, "name" | "description" | "color" | "icon" | "sortOrder">>,
  getToken: GetToken
): Promise<Space> {
  return call<Space>(`/api/spaces/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  }, getToken);
}

export async function deleteSpace(id: string, force: boolean, getToken: GetToken): Promise<void> {
  await call(`/api/spaces/${encodeURIComponent(id)}${force ? "?force=true" : ""}`, {
    method: "DELETE",
  }, getToken);
}
