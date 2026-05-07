import * as React from "react";
import { ref, onValue } from "firebase/database";
import { database } from "../../config/firebase";
import { useAuth } from "../../auth/AuthContext";
import {
  fetchActiveShoppingList,
  type ShoppingList,
} from "../services/shoppingApi";

/**
 * Subscribes to /tenants/{tenantId}/shopping/version in Firebase Realtime
 * Database. The backend bumps that path on every shopping mutation, so any
 * connected client gets a near-real-time signal to refetch.
 */
function useShoppingVersion(tenantId: string | null | undefined): number | null {
  const [version, setVersion] = React.useState<number | null>(null);
  React.useEffect(() => {
    if (!tenantId) return;
    if (!database) return; // RTDB not configured — silently skip live sync
    const r = ref(database, `tenants/${tenantId}/shopping/version`);
    const unsub = onValue(
      r,
      (snap) => {
        const v = snap.val();
        if (typeof v === "number") setVersion(v);
      },
      (err) => {
        // Permission errors etc. — fall back to manual refresh, don't crash
        console.warn("RTDB subscription failed:", err.message);
      }
    );
    return () => unsub();
  }, [tenantId]);
  return version;
}

/**
 * Loads the active shopping list, reloads on every RTDB version bump.
 * Returns the live list plus a manual `reload` for after our own mutations
 * (so we get the new state immediately without waiting for the RTDB tick).
 */
export function useShoppingList() {
  const { firebaseUser, tenant } = useAuth();
  const [list, setList] = React.useState<ShoppingList | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const version = useShoppingVersion(tenant?._id);

  const reload = React.useCallback(async () => {
    if (!firebaseUser) return;
    try {
      setError(null);
      const next = await fetchActiveShoppingList(() => firebaseUser.getIdToken());
      setList(next);
    } catch (e: any) {
      setError(e?.message || "Failed to load shopping list");
    } finally {
      setLoading(false);
    }
  }, [firebaseUser]);

  // Initial load
  React.useEffect(() => {
    reload();
  }, [reload]);

  // Refetch on RTDB version bumps (i.e. somebody — possibly another tenant
  // member — mutated the list). The first emit also fires on subscribe, which
  // doubles up with the initial load, but that's a one-off.
  React.useEffect(() => {
    if (version !== null) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  return { list, loading, error, reload, setList };
}
