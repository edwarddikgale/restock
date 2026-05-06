import * as React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Typography, Alert } from "@mui/material";
import { useProducts } from "../state/products";
import type { Product } from "../types";
import { ProductForm } from "./ProductForm";
import { useAuth } from "../../auth/AuthContext";
import { fetchMySpaces, type Space } from "../services/spacesApi";

const now = () => new Date().toISOString();

export const ProductEdit: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { products, update } = useProducts();
  const { firebaseUser } = useAuth();
  const original = products.find((x) => x.id === id);

  const [value, setValue] = React.useState<Product | null>(original ? { ...original } : null);
  const [spaces, setSpaces] = React.useState<Space[]>([]);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!firebaseUser) return;
    fetchMySpaces(() => firebaseUser.getIdToken())
      .then(setSpaces)
      .catch(() => setSpaces([]));
  }, [firebaseUser]);

  if (!original || !value) return <Typography>Not found.</Typography>;

  const save = async () => {
    if (busy) return;
    setSubmitError(null);
    setBusy(true);
    try {
      await update(id!, { ...value, lastUpdatedOn: now() });
      navigate(`/product/${original.id}`);
    } catch (err: any) {
      setSubmitError(err?.message || "Failed to update product");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Edit Product
      </Typography>
      {submitError && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {submitError}
        </Alert>
      )}
      <ProductForm
        value={value}
        onChange={setValue}
        onSubmit={save}
        submitLabel={busy ? "Saving…" : "Save"}
        sections={spaces}
      />
    </>
  );
};
