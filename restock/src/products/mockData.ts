import type { Category, MeasureType, Product, Store, Tenant } from "./types";

export const TENANTS: Tenant[] = [
  { id: "tenant-ed", name: "Ed" },
  { id: "tenant-partner", name: "Partner" },
  { id: "tenant-shared", name: "Shared" },
];

export const STORE_OPTIONS: Store[] = [
  "Aldi",
  "Lidl",
  "Edeka",
  "Rewe",
  "DM",
  "Rossmann",
  "IKEA",
  "Amazon",
  "Other",
];

export const CATEGORIES: Category[] = [
  "Beverages",
  "Canned & Jars",
  "Cleaning",
  "Dairy",
  "Freezer",
  "Fruits & Veg",
  "Grains & Pasta",
  "Household",
  "Snacks",
  "Toiletries",
  "Other",
];

export const MEASURE_TYPES: MeasureType[] = [
  "Litres",
  "Millilitres",
  "Kilograms",
  "Grams",
  "Units",
];

const now = () => new Date().toISOString();

export const MOCK_PRODUCTS: Product[] = [
  {
    id: "p1",
    tenantId: "tenant-shared",
    name: "Olive Oil",
    synonym: "Extra Virgin",
    category: "Canned & Jars",
    measureType: "Litres",
    preferredStores: ["Lidl", "Edeka", "Amazon"],
    defaultQuantity: 3,
    percentageLeft: 45,
    createdOn: now(),
    lastUpdatedOn: now(),
  },
  {
    id: "p2",
    tenantId: "tenant-ed",
    name: "Rice",
    category: "Grains & Pasta",
    measureType: "Kilograms",
    preferredStores: ["Aldi", "Lidl"],
    defaultQuantity: 5,
    percentageLeft: 80,
    createdOn: now(),
    lastUpdatedOn: now(),
  },
  {
    id: "p3",
    tenantId: "tenant-partner",
    name: "Oat Milk",
    category: "Dairy",
    measureType: "Litres",
    preferredStores: ["DM", "Rewe"],
    defaultQuantity: 6,
    percentageLeft: 15,
    createdOn: now(),
    lastUpdatedOn: now(),
  },
];
