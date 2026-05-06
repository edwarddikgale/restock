const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/+$/, "");

export interface Store {
  _id: string;
  tenantId: string;
  name: string;
  createdOn?: string;
  lastUpdatedOn?: string;
}

type GetToken = () => Promise<string | null>;

async function call<T>(
  path: string,
  init: RequestInit,
  getToken: GetToken
): Promise<T> {
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

export async function fetchMyStores(getToken: GetToken): Promise<Store[]> {
  const data = await call<{ stores: Store[] }>("/api/stores/my", { method: "GET" }, getToken);
  return data.stores || [];
}

export async function createStore(name: string, getToken: GetToken): Promise<Store> {
  return call<Store>("/api/stores", { method: "POST", body: JSON.stringify({ name }) }, getToken);
}

export async function updateStore(id: string, name: string, getToken: GetToken): Promise<Store> {
  return call<Store>(`/api/stores/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ name }) }, getToken);
}

export async function deleteStore(id: string, getToken: GetToken): Promise<void> {
  await call(`/api/stores/${encodeURIComponent(id)}`, { method: "DELETE" }, getToken);
}
