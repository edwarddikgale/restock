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
  candidates: MatchCandidate[];
  bestMatchId: string | null;
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

export async function parseIntake(
  rawText: string,
  getToken: GetToken,
  targetLanguage = "English"
): Promise<MatchedItem[]> {
  const data = await call<{ items: MatchedItem[] }>(
    "/api/intake/parse",
    { method: "POST", body: JSON.stringify({ rawText, targetLanguage }) },
    getToken
  );
  return data.items || [];
}

export async function parseIntakeImage(
  imageDataUrl: string,
  getToken: GetToken,
  targetLanguage = "English"
): Promise<MatchedItem[]> {
  const data = await call<{ items: MatchedItem[] }>(
    "/api/intake/parse-image",
    { method: "POST", body: JSON.stringify({ imageDataUrl, targetLanguage }) },
    getToken
  );
  return data.items || [];
}

export interface IntakeNewItem {
  name: string;
  spaceId: string;
  synonym?: string;
  category?: string;
  measureType?: string;
  defaultQuantity?: number;
}

export interface ApplyFillResult {
  filledCount: number;
  createdCount: number;
  mergedCount: number;
}

export async function applyIntakeFill(
  payload: { productIds?: string[]; newItems?: IntakeNewItem[] },
  getToken: GetToken
): Promise<ApplyFillResult> {
  return call<ApplyFillResult>(
    "/api/intake/apply-fill",
    { method: "POST", body: JSON.stringify(payload) },
    getToken
  );
}

export async function applyIntakeShopping(
  items: Array<{ productId?: string; freeText?: string; qty?: number }>,
  getToken: GetToken
): Promise<{ addedCount: number }> {
  return call<{ addedCount: number }>(
    "/api/intake/apply-shopping",
    { method: "POST", body: JSON.stringify({ items }) },
    getToken
  );
}
