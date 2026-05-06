import * as React from "react";
import { Typography, CircularProgress, Box, Alert } from "@mui/material";
import { useNavigate } from "react-router-dom";
import type { Product } from "../types";
import { useProducts } from "../state/products";
import { useAuth } from "../../auth/AuthContext";
import { fetchMySpaces, type Space } from "../services/spacesApi";
import { ProductForm } from "./ProductForm";

const now = () => new Date().toISOString();

type LoadState = "loading" | "ready" | "no-space";

export const ProductAdd: React.FC = () => {
  const navigate = useNavigate();
  const { add } = useProducts();
  const { firebaseUser, tenant } = useAuth();
  const [space, setSpace] = React.useState<Space | null>(null);
  const [loadState, setLoadState] = React.useState<LoadState>("loading");

  React.useEffect(() => {
    if (!firebaseUser) return;
    fetchMySpaces(() => firebaseUser.getIdToken())
      .then((spaces) => {
        if (spaces.length > 0) {
          setSpace(spaces[0]);
          setLoadState("ready");
        } else {
          setLoadState("no-space");
        }
      })
      .catch(() => setLoadState("no-space"));
  }, [firebaseUser]);

  const [value, setValue] = React.useState<Product>({
    id: crypto.randomUUID(),
    tenantId: "",
    spaceId: "",
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

  // Once tenant + space are known, populate the form defaults
  React.useEffect(() => {
    if (tenant && space) {
      setValue((v) => ({
        ...v,
        tenantId: String(tenant._id),
        spaceId: space._id,
      }));
    }
  }, [tenant, space]);

  if (loadState === "loading" || !tenant) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (loadState === "no-space" || !space) {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        No spaces found for your tenant. Sign out and back in to create a default space, or create one manually.
      </Alert>
    );
  }

  const save = () => {
    add({ ...value });
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
