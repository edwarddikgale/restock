import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Typography } from "@mui/material";
import { useProducts } from "../state/products";
import type { Product } from "../types";
import { ProductForm } from "./ProductForm";

const now = () => new Date().toISOString();

export const ProductEdit: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, update } = useProducts();
  const original = products.find((x) => x.id === id);

  const [value, setValue] = React.useState<Product | null>(original ? { ...original } : null);

  if (!original || !value) return <Typography>Not found.</Typography>;

  const save = () => {
    update(id!, { ...value, lastUpdatedOn: now() });
    navigate(`/product/${original.id}`);
  };

  return (
    <>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Edit Product
      </Typography>
      <ProductForm value={value} onChange={setValue} onSubmit={save} />
    </>
  );
};
