const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/+$/, "");

export interface ShoppingProductSnapshot {
  _id: string;
  name: string;
  spaceId: string;
  measureType: string;
  defaultQuantity: number;
  percentageLeft: number;
  category: string;
  preferredStores: string[];
}

export interface ShoppingItem {
  _id: string;
  productId?: string;
  freeText?: string;
  qty?: number;
  checked: boolean;
  addedByUserId: string;
  addedByName: string;
  addedAt: string;
  checkedAt?: string;
  checkedByUserId?: string;
  // Server enriches with the linked product (or null)
  product?: ShoppingProductSnapshot | null;
}

export interface ShoppingList {
  _id: string;
  tenantId: string;
  status: "active" | "archived";
  items: ShoppingItem[];
  createdAt: string;
  archivedAt?: string;
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

export async function fetchActiveShoppingList(getToken: GetToken): Promise<ShoppingList> {
  const data = await call<{ list: ShoppingList }>(
    "/api/shopping/active",
    { method: "GET" },
    getToken
  );
  return data.list;
}

export async function addShoppingItem(
  payload: { productId?: string; freeText?: string; qty?: number },
  getToken: GetToken
): Promise<ShoppingList> {
  const data = await call<{ list: ShoppingList }>(
    "/api/shopping/items",
    { method: "POST", body: JSON.stringify(payload) },
    getToken
  );
  return data.list;
}

export async function updateShoppingItem(
  itemId: string,
  patch: { checked?: boolean; qty?: number; freeText?: string },
  getToken: GetToken
): Promise<ShoppingList> {
  const data = await call<{ list: ShoppingList }>(
    `/api/shopping/items/${encodeURIComponent(itemId)}`,
    { method: "PATCH", body: JSON.stringify(patch) },
    getToken
  );
  return data.list;
}

export async function removeShoppingItem(
  itemId: string,
  getToken: GetToken
): Promise<ShoppingList> {
  const data = await call<{ list: ShoppingList }>(
    `/api/shopping/items/${encodeURIComponent(itemId)}`,
    { method: "DELETE" },
    getToken
  );
  return data.list;
}

export async function bulkAddRunningLow(
  getToken: GetToken
): Promise<{ list: ShoppingList; addedCount: number }> {
  return call<{ list: ShoppingList; addedCount: number }>(
    "/api/shopping/items/bulk-add-low",
    { method: "POST" },
    getToken
  );
}

export async function finishShopping(
  options: { markAllAsFilled: boolean },
  getToken: GetToken
): Promise<{ filledCount: number }> {
  const data = await call<{ success: boolean; filledCount: number }>(
    "/api/shopping/finish",
    { method: "POST", body: JSON.stringify(options) },
    getToken
  );
  return { filledCount: data.filledCount || 0 };
}

export interface ArchivedListsResponse {
  lists: ShoppingList[];
  pagination: { page: number; pageSize: number; totalItems: number; totalPages: number };
}

export async function fetchArchivedShoppingLists(
  page: number,
  pageSize: number,
  getToken: GetToken
): Promise<ArchivedListsResponse> {
  return call<ArchivedListsResponse>(
    `/api/shopping/archived?page=${page}&pageSize=${pageSize}`,
    { method: "GET" },
    getToken
  );
}
