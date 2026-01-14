import * as React from "react";
import { Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import type { Product } from "../types";
import { useProducts } from "../state/products";
import { ProductForm } from "./ProductForm";

const now = () => new Date().toISOString();

export const ProductAdd: React.FC = () => {
  const navigate = useNavigate();
  const { add } = useProducts();

  const [value, setValue] = React.useState<Product>({
    id: (crypto as any).randomUUID ? crypto.randomUUID() : String(Date.now()),
    tenantId: "tenant-shared",
    spaceId: "6967a16e85d8be6485d2dfbc",
    name: "",
    synonym: "",
    category: "Other",
    measureType: "Units",
    preferredStores: [],
    defaultQuantity: 1,
    percentageLeft: 100,
    createdOn: now(),
    lastUpdatedOn: now(),
  });

  const save = () => {
    add({ ...value, /*lastUpdatedOn: now()*/ });
    navigate("/?tab=list");
  };

  return (
    <>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Add Product
      </Typography>
      <ProductForm value={value} onChange={setValue} onSubmit={save} submitLabel="Add" />
    </>
  );
};
