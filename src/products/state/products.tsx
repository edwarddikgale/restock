import React, { createContext, useContext, useMemo, useReducer } from "react";
import type { Product } from "../types";
import { MOCK_PRODUCTS } from "../mockData";

// ——— STATE & ACTIONS ———

type Action =
  | { type: "add"; product: Product }
  | { type: "update"; product: Product }
  | { type: "remove"; id: string };

interface ProductsState {
  products: Product[];
}

const initialState: ProductsState = { products: MOCK_PRODUCTS };

function reducer(state: ProductsState, action: Action): ProductsState {
  switch (action.type) {
    case "add":
      return { products: [action.product, ...state.products] };
    case "update":
      return {
        products: state.products.map((p) =>
          p.id === action.product.id ? action.product : p
        ),
      };
    case "remove":
      return { products: state.products.filter((p) => p.id !== action.id) };
    default:
      return state;
  }
}

// ——— CONTEXT ———

interface ProductsContextValue extends ProductsState {
  add: (p: Product) => void;
  update: (p: Product) => void;
  remove: (id: string) => void;
}

const ProductsContext = createContext<ProductsContextValue | null>(null);

export const ProductsProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  const value = useMemo<ProductsContextValue>(
    () => ({
      products: state.products,
      add: (p) => dispatch({ type: "add", product: p }),
      update: (p) => dispatch({ type: "update", product: p }),
      remove: (id) => dispatch({ type: "remove", id }),
    }),
    [state.products]
  );

  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  );
};

export const useProducts = () => {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error("useProducts must be used within ProductsProvider");
  return ctx;
};
