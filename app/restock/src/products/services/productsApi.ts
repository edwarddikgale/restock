// src/api/productsApi.ts

import { Product } from "../types";

export type ProductId = string;

// What backend returns from mongoose (uses _id + Dates)
type DbProduct = Omit<Product, "id" | "createdOn" | "lastUpdatedOn"> & {
  _id: string;
  createdOn: string | Date;
  lastUpdatedOn: string | Date;
};

type Pagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

type ListProductsResponse = {
  products: DbProduct[];
  pagination?: Pagination;
};

function toIso(d: string | Date): string {
  return typeof d === "string" ? d : d.toISOString();
}

function mapDbProduct(p: DbProduct): Product {
  return {
    id: p._id,
    tenantId: p.tenantId,
    spaceId: p.spaceId,
    name: p.name,
    synonym: p.synonym,
    category: p.category,
    measureType: p.measureType,
    preferredStores: p.preferredStores ?? [],
    defaultQuantity: p.defaultQuantity,
    percentageLeft: p.percentageLeft,
    createdOn: toIso(p.createdOn),
    lastUpdatedOn: toIso(p.lastUpdatedOn),
  };
}

export type ListProductsParams = {
  page?: number;
  pageSize?: number;
  searchText?: string;
  category?: string;
  measureType?: string;
  tenantId?: string;
};

export type CreateProductInput = {
  tenantId: string;
  spaceId: string;
  name: string;
  synonym?: string;
  category: string;
  measureType: string;
  preferredStores?: string[];
  defaultQuantity: number;
  percentageLeft: number;
  // optional if you want to pass; backend sets defaults
  createdOn?: string;
  lastUpdatedOn?: string;
};

export type UpdateProductInput = Partial<CreateProductInput>;

/**
 * Generic fetch wrapper (JSON)
 * - supports optional bearer token
 */
async function http<T>(
  url: string,
  options: RequestInit & { token?: string } = {}
): Promise<T> {
  const { token, ...init } = options;

  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const body: any = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);

  if (!res.ok) {
    const message =
      (body && (body.message || body.error)) ||
      (typeof body === "string" ? body : `HTTP ${res.status}`);
    throw new Error(message);
  }

  return body as T;
}

export type ProductsApiConfig = {
  baseUrl: string; // e.g. import.meta.env.VITE_API_URL
  getToken?: () => Promise<string | null> | string | null; // optional auth
};

export function createProductsApi(config: ProductsApiConfig) {
  const base = config.baseUrl.replace(/\/+$/, "");

  async function tokenOrUndefined(): Promise<string | undefined> {
    if (!config.getToken) return undefined;
    const t = await config.getToken();
    return t || undefined;
  }

  return {
    /**
     * List products for a space (scoped)
     */
    async listBySpace(spaceId: string, params: ListProductsParams = {}) {
      const t = await tokenOrUndefined();

      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && String(v).length > 0) qs.set(k, String(v));
      });

      const url = `${base}/api/products/space/${encodeURIComponent(spaceId)}${
        qs.toString() ? `?${qs.toString()}` : ""
      }`;

      const data = await http<ListProductsResponse>(url, { method: "GET", token: t });
      return {
        products: (data.products || []).map(mapDbProduct),
        pagination: data.pagination,
      };
    },

    /**
     * Get single product
     */
    async get(productId: ProductId) {
      const t = await tokenOrUndefined();
      const data = await http<{ product: DbProduct }>(
        `${base}/api/products/${encodeURIComponent(productId)}`,
        { method: "GET", token: t }
      );
      return mapDbProduct(data.product);
    },

    /**
     * Create product
     */
    async create(input: CreateProductInput) {
      const t = await tokenOrUndefined();
      const data = await http<DbProduct>(`${base}/api/products`, {
        method: "POST",
        token: t,
        body: JSON.stringify({
          ...input,
          preferredStores: input.preferredStores ?? [],
        }),
      });

      // controller returns db doc directly
      return mapDbProduct(data);
    },

    /**
     * Update product
     */
    async update(productId: ProductId, patch: UpdateProductInput) {
      const t = await tokenOrUndefined();
      const data = await http<DbProduct>(`${base}/api/products/${encodeURIComponent(productId)}`, {
        method: "PATCH",
        token: t,
        body: JSON.stringify(patch),
      });
      return mapDbProduct(data);
    },

    /**
     * Delete product
     */
    async remove(productId: ProductId) {
      const t = await tokenOrUndefined();
      const data = await http<{ success: boolean }>(
        `${base}/api/products/${encodeURIComponent(productId)}`,
        { method: "DELETE", token: t }
      );
      return data.success;
    },

    /**
     * Count products in a space
     */
    async countBySpace(spaceId: string) {
      const t = await tokenOrUndefined();
      const data = await http<{ count: number }>(
        `${base}/api/products/count/space/${encodeURIComponent(spaceId)}`,
        { method: "GET", token: t }
      );
      return data.count;
    },
  };
}
