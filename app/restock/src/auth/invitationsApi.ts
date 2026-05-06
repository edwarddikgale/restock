const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/+$/, "");

export type InvitationRole = "admin" | "member";
export type InvitationStatus = "pending" | "accepted" | "rejected" | "revoked";

export interface Invitation {
  _id: string;
  tenantId: string;
  tenantName: string;
  invitedEmail: string;
  role: InvitationRole;
  status: InvitationStatus;
  invitedByUserId: string;
  invitedByName: string;
  createdAt: string;
  respondedAt?: string;
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

export async function fetchPendingInvitations(getToken: GetToken): Promise<Invitation[]> {
  const data = await call<{ invitations: Invitation[] }>("/api/invitations/pending", { method: "GET" }, getToken);
  return data.invitations || [];
}

export async function fetchSentInvitations(getToken: GetToken): Promise<Invitation[]> {
  const data = await call<{ invitations: Invitation[] }>("/api/invitations/sent", { method: "GET" }, getToken);
  return data.invitations || [];
}

export async function createInvitation(
  email: string,
  role: InvitationRole,
  getToken: GetToken
): Promise<Invitation> {
  const data = await call<{ invitation: Invitation }>(
    "/api/invitations",
    { method: "POST", body: JSON.stringify({ email, role }) },
    getToken
  );
  return data.invitation;
}

export async function respondToInvitation(
  id: string,
  accept: boolean,
  getToken: GetToken
): Promise<Invitation> {
  const data = await call<{ invitation: Invitation }>(
    `/api/invitations/${encodeURIComponent(id)}/respond`,
    { method: "POST", body: JSON.stringify({ accept }) },
    getToken
  );
  return data.invitation;
}

export async function revokeInvitation(id: string, getToken: GetToken): Promise<void> {
  await call(`/api/invitations/${encodeURIComponent(id)}`, { method: "DELETE" }, getToken);
}
