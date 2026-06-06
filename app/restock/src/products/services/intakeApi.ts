const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/+$/, "");

export interface MatchCandidate {
  productId: string;
  name: string;
  synonym?: string;
  spaceId: string;
  score: number;
}

export interface MatchedItem {
  name: string;
  originalName?: string;
  originalLanguage?: string | null;
  quantity?: number | null;
  measure?: string | null;
  price?: number | null;
  candidates: MatchCandidate[];
  bestMatchId: string | null;
}

export interface ParseIntakeResult {
  store: string | null;
  items: MatchedItem[];
}

export type IntakeSource = "receipt" | "voice" | "text" | "human";

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

export async function parseIntake(
  rawText: string,
  getToken: GetToken,
  targetLanguage = "English"
): Promise<ParseIntakeResult> {
  const data = await call<{ store?: string | null; items: MatchedItem[] }>(
    "/api/intake/parse",
    { method: "POST", body: JSON.stringify({ rawText, targetLanguage }) },
    getToken
  );
  return { store: data.store ?? null, items: data.items || [] };
}

export async function parseIntakeImage(
  imageDataUrl: string,
  getToken: GetToken,
  targetLanguage = "English"
): Promise<ParseIntakeResult> {
  const data = await call<{ store?: string | null; items: MatchedItem[] }>(
    "/api/intake/parse-image",
    { method: "POST", body: JSON.stringify({ imageDataUrl, targetLanguage }) },
    getToken
  );
  return { store: data.store ?? null, items: data.items || [] };
}

export interface IntakeNewItem {
  name: string;
  spaceId: string;
  synonym?: string;
  category?: string;
  measureType?: string;
  defaultQuantity?: number;
  quantity?: number;
  price?: number;
  measure?: string | null;
}

export interface IntakeFillItem {
  productId: string;
  quantity?: number;
  price?: number;
  measure?: string | null;
  /** Original receipt text in the source language — backend folds it into the product's synonym if new. */
  originalName?: string;
  /** ISO-639-1 code of the originalName, when known. */
  originalLanguage?: string | null;
}

export interface ApplyFillResult {
  filledCount: number;
  createdCount: number;
  mergedCount: number;
}

export async function applyIntakeFill(
  payload: {
    store?: string;
    source?: IntakeSource;
    items?: IntakeFillItem[];
    newItems?: IntakeNewItem[];
  },
  getToken: GetToken
): Promise<ApplyFillResult> {
  return call<ApplyFillResult>(
    "/api/intake/apply-fill",
    { method: "POST", body: JSON.stringify(payload) },
    getToken
  );
}

export async function estimateItemPrices(
  items: Array<{ name: string; qty?: number }>,
  country: string,
  getToken: GetToken
): Promise<Array<{ name: string; price: number }>> {
  const data = await call<{ estimates: Array<{ name: string; price: number }> }>(
    "/api/intake/estimate-prices",
    { method: "POST", body: JSON.stringify({ items, country }) },
    getToken
  );
  return data.estimates || [];
}

export async function applyIntakeShopping(
  payload: {
    items: Array<{ productId?: string; freeText?: string; qty?: number }>;
    defaultSpaceId?: string;
  },
  getToken: GetToken
): Promise<{ addedCount: number; createdCount: number }> {
  return call<{ addedCount: number; createdCount: number }>(
    "/api/intake/apply-shopping",
    { method: "POST", body: JSON.stringify(payload) },
    getToken
  );
}
