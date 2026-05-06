export type TenantId = string;

export type MeasureType = "Litres" | "Millilitres" | "Kilograms" | "Grams" | "Units";

export type Category =
  | "Beverages"
  | "Canned & Jars"
  | "Cleaning"
  | "Dairy"
  | "Freezer"
  | "Fruits & Veg"
  | "Grains & Pasta"
  | "Household"
  | "Snacks"
  | "Toiletries"
  | "Other";

// Store names are now user-managed per tenant — kept as a free-form string.
export type Store = string;

export interface Product {
  id: string;
  tenantId: TenantId; // supports couple/shared
  spaceId: string; // supports multiple spaces per tenant
  name: string;
  synonym?: string;
  category: Category;
  measureType: MeasureType;
  preferredStores: Store[]; // checkable list
  defaultQuantity: number; // how much we usually stock
  percentageLeft: number; // 0..100 slider
  lastUpdatedOn: string; // ISO string
  createdOn: string; // ISO string
}


export interface Tenant {
  id: TenantId;
  name: string;
}
