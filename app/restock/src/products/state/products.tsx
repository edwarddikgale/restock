import React, { createContext, useContext, useMemo, useReducer } from "react";
import type { Product } from "../types";
import { createProductsApi } from "../services/productsApi";
import { useAuth } from "../../auth/AuthContext";

const initialState: ProductsState = {
  products: [],
  loading: false,
  error: null,
  activeSpaceId: null,
};

type Action =
  | { type: "set_loading"; loading: boolean }
  | { type: "set_error"; error: string | null }
  | { type: "set_active_space"; spaceId: string | null }
  | { type: "set_all"; products: Product[] }
  | { type: "add"; product: Product }
  | { type: "update"; product: Product }
  | { type: "remove"; id: string };

interface ProductsState {
  products: Product[];
  loading: boolean;
  error: string | null;
  activeSpaceId: string | null;
}

function reducer(state: ProductsState, action: Action): ProductsState {
  switch (action.type) {
    case "set_loading":
      return { ...state, loading: action.loading };
    case "set_error":
      return { ...state, error: action.error };
    case "set_active_space":
      return { ...state, activeSpaceId: action.spaceId };
    case "set_all":
      return { ...state, products: action.products };
    case "add":
      return { ...state, products: [action.product, ...state.products] };
    case "update":
      return {
        ...state,
        products: state.products.map((p) =>
          p.id === action.product.id ? action.product : p
        ),
      };
    case "remove":
      return { ...state, products: state.products.filter((p) => p.id !== action.id) };
    default:
      return state;
  }
}

interface ProductsContextValue extends ProductsState {
  loadBySpace: (spaceId: string) => Promise<void>;
  add: (p: Omit<Product, "id" | "createdOn" | "lastUpdatedOn">) => Promise<Product>;
  update: (id: string, patch: Partial<Product>) => Promise<Product>;
  remove: (id: string) => Promise<void>;
}

const ProductsContext = createContext<ProductsContextValue | null>(null);

export const ProductsProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { firebaseUser } = useAuth();

  const productsApi = useMemo(
    () =>
      createProductsApi({
        baseUrl: import.meta.env.VITE_API_URL || "http://localhost:8080",
        getToken: () => firebaseUser?.getIdToken() ?? null,
      }),
    [firebaseUser]
  );

  const value = useMemo<ProductsContextValue>(() => {
    const loadBySpace: ProductsContextValue["loadBySpace"] = async (spaceId) => {
      if (!spaceId) return;

      if (state.activeSpaceId === spaceId && state.products.length > 0) return;

      dispatch({ type: "set_loading", loading: true });
      dispatch({ type: "set_error", error: null });
      dispatch({ type: "set_active_space", spaceId });

      try {
        const { products } = await productsApi.listBySpace(spaceId, { page: 1, pageSize: 500 });
        dispatch({ type: "set_all", products });
      } catch (err: any) {
        dispatch({ type: "set_error", error: err?.message || "Failed to load products" });
        dispatch({ type: "set_all", products: [] });
      } finally {
        dispatch({ type: "set_loading", loading: false });
      }
    };

    const add: ProductsContextValue["add"] = async (p) => {
      dispatch({ type: "set_error", error: null });
      try {
        const created = await productsApi.create({
          tenantId: p.tenantId,
          spaceId: p.spaceId,
          name: p.name,
          synonym: p.synonym,
          category: p.category,
          measureType: p.measureType,
          preferredStores: p.preferredStores ?? [],
          defaultQuantity: p.defaultQuantity,
          percentageLeft: p.percentageLeft,
          notes: p.notes,
        });
        dispatch({ type: "add", product: created });
        return created;
      } catch (err: any) {
        const msg = err?.message || "Failed to create product";
        dispatch({ type: "set_error", error: msg });
        throw new Error(msg);
      }
    };

    const update: ProductsContextValue["update"] = async (id, patch) => {
      dispatch({ type: "set_error", error: null });
      try {
        const updated = await productsApi.update(id, {
          tenantId: patch.tenantId,
          spaceId: patch.spaceId,
          name: patch.name,
          synonym: patch.synonym,
          category: patch.category,
          measureType: patch.measureType,
          preferredStores: patch.preferredStores,
          defaultQuantity: patch.defaultQuantity,
          percentageLeft: patch.percentageLeft,
          notes: patch.notes,
          lastUpdatedOn: new Date().toISOString(),
        });
        dispatch({ type: "update", product: updated });
        return updated;
      } catch (err: any) {
        const msg = err?.message || "Failed to update product";
        dispatch({ type: "set_error", error: msg });
        throw new Error(msg);
      }
    };

    const remove: ProductsContextValue["remove"] = async (id) => {
      dispatch({ type: "set_error", error: null });
      try {
        await productsApi.remove(id);
        dispatch({ type: "remove", id });
      } catch (err: any) {
        const msg = err?.message || "Failed to delete product";
        dispatch({ type: "set_error", error: msg });
        throw new Error(msg);
      }
    };

    return {
      products: state.products,
      loading: state.loading,
      error: state.error,
      activeSpaceId: state.activeSpaceId,
      loadBySpace,
      add,
      update,
      remove,
    };
  }, [state.products, state.loading, state.error, state.activeSpaceId, productsApi]);

  return <ProductsContext.Provider value={value}>{children}</ProductsContext.Provider>;
};

export const useProducts = () => {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error("useProducts must be used within ProductsProvider");
  return ctx;
};
