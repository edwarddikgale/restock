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

export async function fetchMySpaces(getToken: () => Promise<string | null>): Promise<Space[]> {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/api/spaces/my`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(`Failed to load spaces: HTTP ${res.status}`);
  const data = await res.json();
  return data.spaces || [];
}
