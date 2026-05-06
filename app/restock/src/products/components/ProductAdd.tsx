import * as React from "react";
import { Typography, CircularProgress, Box, Alert } from "@mui/material";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { Product } from "../types";
import { useProducts } from "../state/products";
import { useAuth } from "../../auth/AuthContext";
import { fetchMySpaces, type Space } from "../services/spacesApi";
import { ProductForm } from "./ProductForm";

const now = () => new Date().toISOString();

type LoadState = "loading" | "ready" | "no-space";

export const ProductAdd: React.FC = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sectionIdFromUrl = params.get("sectionId");

  const { add } = useProducts();
  const { firebaseUser, tenant } = useAuth();
  const [spaces, setSpaces] = React.useState<Space[]>([]);
  const [loadState, setLoadState] = React.useState<LoadState>("loading");

  React.useEffect(() => {
    if (!firebaseUser) return;
    fetchMySpaces(() => firebaseUser.getIdToken())
      .then((loaded) => {
        setSpaces(loaded);
        setLoadState(loaded.length > 0 ? "ready" : "no-space");
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
    notes: "",
    createdOn: now(),
    lastUpdatedOn: now(),
  });

  // Once tenant + sections are loaded, populate defaults: tenantId, and the
  // initial section (URL hint takes priority, otherwise the first section).
  React.useEffect(() => {
    if (!tenant || spaces.length === 0) return;
    const target =
      (sectionIdFromUrl && spaces.find((s) => s._id === sectionIdFromUrl)) || spaces[0];
    setValue((v) => ({
      ...v,
      tenantId: String(tenant._id),
      spaceId: target._id,
    }));
  }, [tenant, spaces, sectionIdFromUrl]);

  if (loadState === "loading" || !tenant) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (loadState === "no-space") {
    return (
      <Alert severity="warning" sx={{ mt: 2 }}>
        No sections found for your tenant. Create one in Settings first.
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
      <ProductForm
        value={value}
        onChange={setValue}
        onSubmit={save}
        submitLabel="Add"
        sections={spaces}
      />
    </>
  );
};
