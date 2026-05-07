import * as React from "react";
import { ref, onValue } from "firebase/database";
import { database } from "../../config/firebase";
import { useAuth } from "../../auth/AuthContext";
import {
  fetchActiveShoppingList,
  type ShoppingList,
} from "../services/shoppingApi";

interface ShoppingListContextValue {
  list: ShoppingList | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

const ShoppingListContext = React.createContext<ShoppingListContextValue | null>(null);

export const ShoppingListProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const { firebaseUser, tenant } = useAuth();
  const [list, setList] = React.useState<ShoppingList | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [version, setVersion] = React.useState<number | null>(null);

  // Realtime: subscribe to /tenants/{tenantId}/shopping/version
  React.useEffect(() => {
    if (!tenant?._id || !database) return;
    const r = ref(database, `tenants/${tenant._id}/shopping/version`);
    const unsub = onValue(
      r,
      (snap) => {
        const v = snap.val();
        if (typeof v === "number") setVersion(v);
      },
      (err) => console.warn("RTDB subscription failed:", err.message)
    );
    return () => unsub();
  }, [tenant?._id]);

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

  // Initial fetch + tenant switch
  React.useEffect(() => {
    if (firebaseUser) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firebaseUser, tenant?._id]);

  // Refetch on every RTDB version bump (i.e. someone — possibly another
  // tenant member — mutated the list)
  React.useEffect(() => {
    if (version !== null) reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  const value = React.useMemo(
    () => ({ list, loading, error, reload }),
    [list, loading, error, reload]
  );

  return (
    <ShoppingListContext.Provider value={value}>{children}</ShoppingListContext.Provider>
  );
};

export const useShoppingList = () => {
  const ctx = React.useContext(ShoppingListContext);
  if (!ctx) throw new Error("useShoppingList must be used within ShoppingListProvider");
  return ctx;
};
