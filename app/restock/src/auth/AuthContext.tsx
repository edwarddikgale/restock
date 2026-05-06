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

const BASE_URL = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/+$/, "");

export interface UserProfile {
  _id: string;
  userId: string;
  fullName: string;
  email: string;
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
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
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
  const [loading, setLoading] = useState(true);

  // On auth state change: run onboard to get/create profile + tenant
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
        } catch (e) {
          console.error("Onboard failed:", e);
        }
      } else {
        setUserProfile(null);
        setTenant(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

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
      value={{ firebaseUser, userProfile, tenant, loading, signIn, signUp, signInWithGoogle, logout, claimSharedData }}
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
