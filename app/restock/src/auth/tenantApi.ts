const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/+$/, "");

export type TenantType = "personal" | "company";
export type CompanySize = "1-10" | "11-50" | "51-200" | "201-1000" | "1000+";

export interface CompanyDetails {
  companyName?: string;
  industry?: string;
  website?: string;
  size?: CompanySize;
  taxId?: string;
}

export interface Tenant {
  _id: string;
  name: string;
  ownerId: string;
  type: TenantType;
  country?: string;
  timezone?: string;
  company?: CompanyDetails;
  defaultStoresSeeded?: boolean;
}

export interface TenantMember {
  userId: string;
  role: "owner" | "admin" | "member";
  fullName: string;
  email: string;
  lastLoginAt: string | null;
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

export async function fetchTenantMembers(getToken: GetToken): Promise<TenantWithMembers> {
  return call<TenantWithMembers>("/api/auth/tenant/members", { method: "GET" }, getToken);
}

export interface TenantSummary {
  _id: string;
  name: string;
  role: "owner" | "admin" | "member";
}

export async function fetchMyTenants(
  getToken: GetToken
): Promise<{ tenants: TenantSummary[]; activeTenantId: string | null }> {
  return call("/api/auth/tenants", { method: "GET" }, getToken);
}

export async function setActiveTenant(tenantId: string, getToken: GetToken): Promise<void> {
  await call(
    "/api/auth/active-tenant",
    { method: "POST", body: JSON.stringify({ tenantId }) },
    getToken
  );
}

export async function removeTenantMember(userId: string, getToken: GetToken): Promise<void> {
  await call(
    `/api/auth/tenant/members/${encodeURIComponent(userId)}`,
    { method: "DELETE" },
    getToken
  );
}

export async function updateTenant(
  patch: Partial<Pick<Tenant, "name" | "type" | "country" | "timezone" | "company">>,
  getToken: GetToken
): Promise<Tenant> {
  const data = await call<{ tenant: Tenant }>(
    "/api/auth/tenant",
    { method: "PATCH", body: JSON.stringify(patch) },
    getToken
  );
  return data.tenant;
}
