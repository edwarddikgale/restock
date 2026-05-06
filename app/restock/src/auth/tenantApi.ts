const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/+$/, "");

export interface TenantMember {
  userId: string;
  role: "owner" | "member";
  fullName: string;
  email: string;
  isYou: boolean;
}

export interface TenantInfo {
  _id: string;
  name: string;
  ownerId: string;
}

export interface TenantWithMembers {
  tenant: TenantInfo;
  members: TenantMember[];
}

export async function fetchTenantMembers(
  getToken: () => Promise<string | null>
): Promise<TenantWithMembers> {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}/api/auth/tenant/members`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.message || `HTTP ${res.status}`);
  }
  return res.json();
}
