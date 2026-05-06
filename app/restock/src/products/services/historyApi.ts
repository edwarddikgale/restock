const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/+$/, "");

export interface HistoryChange {
  field: string;
  from: any;
  to: any;
}

export interface ProductHistoryEntry {
  _id: string;
  productId: string;
  productName: string;
  tenantId: string;
  spaceId: string;
  userId: string;
  userName: string;
  changes: HistoryChange[];
  createdAt: string;
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

export async function fetchRecentHistory(
  limit: number,
  getToken: GetToken
): Promise<ProductHistoryEntry[]> {
  const data = await call<{ entries: ProductHistoryEntry[] }>(
    `/api/product-history/recent?limit=${limit}`,
    { method: "GET" },
    getToken
  );
  return data.entries || [];
}

export async function fetchProductHistory(
  productId: string,
  getToken: GetToken,
  pageSize = 50
): Promise<ProductHistoryEntry[]> {
  const data = await call<{ entries: ProductHistoryEntry[] }>(
    `/api/product-history/product/${encodeURIComponent(productId)}?pageSize=${pageSize}`,
    { method: "GET" },
    getToken
  );
  return data.entries || [];
}
