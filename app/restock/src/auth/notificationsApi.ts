const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/+$/, "");

type GetToken = () => Promise<string | null>;

export interface DigestNowResponse {
  sent: boolean;
  itemsCount: number;
  reason?: string;
  message?: string;
  messageId?: string;
  remainingToday?: number;
}

export async function requestDigestNow(getToken: GetToken): Promise<DigestNowResponse> {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/api/notifications/digest-now`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.message || body?.error || `HTTP ${res.status}`);
  }
  return body;
}
