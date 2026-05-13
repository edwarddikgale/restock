import React, { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  type User,
} from "firebase/auth";
import { auth } from "../config/firebase";
import {
  fetchMyTenants,
  setActiveTenant as setActiveTenantApi,
  updateMyProfile,
  type TenantSummary,
  type UserProfilePatch,
} from "./tenantApi";

const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/+$/, "");

export interface UserProfile {
  _id: string;
  userId: string;
  fullName: string;
  displayName?: string;
  email: string;
  notifyEmail?: boolean;
  notifyAtHour?: number;
  notifyTimezone?: string;
}

export interface Tenant {
  _id: string;
  name: string;
  ownerId: string;
  members: { userId: string; role: string }[];
}

interface AuthContextValue {
  firebaseUser: User | null;
  userProfile: UserProfile | null;
  tenant: Tenant | null;
  tenants: TenantSummary[];
  activeTenantId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  switchTenant: (tenantId: string) => Promise<void>;
  updateProfile: (patch: UserProfilePatch) => Promise<UserProfile>;
  claimSharedData: () => Promise<{ migratedProducts: number; migratedSpaces: number }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function apiPost<T>(path: string, token: string, body?: object): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // On auth state change: run onboard, then fetch the user's full tenant list
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const token = await user.getIdToken();
          const data = await apiPost<{ userProfile: UserProfile; tenant: Tenant }>(
            "/api/auth/onboard",
            token
          );
          setUserProfile(data.userProfile);
          setTenant(data.tenant);

          // Pull the full list so the UserMenu can render the switcher
          const tlist = await fetchMyTenants(() => user.getIdToken());
          setTenants(tlist.tenants);
          setActiveTenantId(tlist.activeTenantId);
        } catch (e) {
          console.error("Onboard failed:", e);
        }
      } else {
        setUserProfile(null);
        setTenant(null);
        setTenants([]);
        setActiveTenantId(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const switchTenant = async (tenantId: string) => {
    if (!firebaseUser) return;
    if (tenantId === activeTenantId) return;
    await setActiveTenantApi(tenantId, () => firebaseUser.getIdToken());
    // Reload so every tenant-scoped panel rehydrates from the new active tenant.
    window.location.reload();
  };

  const updateProfile = async (patch: UserProfilePatch): Promise<UserProfile> => {
    if (!firebaseUser) throw new Error("Not authenticated");
    const updated = await updateMyProfile(patch, () => firebaseUser.getIdToken());
    setUserProfile(updated as UserProfile);
    return updated as UserProfile;
  };

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string) => {
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, new GoogleAuthProvider());
  };

  const logout = async () => {
    await signOut(auth);
  };

  const claimSharedData = async () => {
    if (!firebaseUser) throw new Error("Not authenticated");
    const token = await firebaseUser.getIdToken();
    const result = await apiPost<{ migratedProducts: number; migratedSpaces: number }>(
      "/api/auth/claim-shared-data",
      token
    );
    return result;
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userProfile,
        tenant,
        tenants,
        activeTenantId,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        logout,
        switchTenant,
        updateProfile,
        claimSharedData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
