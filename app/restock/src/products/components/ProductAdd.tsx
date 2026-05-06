import * as React from "react";
import { Typography, CircularProgress, Box, Alert } from "@mui/material";
import { useNavigate, useSearchParams, type NavigateFunction } from "react-router-dom";
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

  return <ProductAddForm value={value} setValue={setValue} sections={spaces} add={add} navigate={navigate} />;
};

// Separate inner component so we can hold submit-state without polluting the
// loading/guard logic above.
const ProductAddForm: React.FC<{
  value: Product;
  setValue: React.Dispatch<React.SetStateAction<Product>>;
  sections: Space[];
  add: (p: Omit<Product, "id" | "createdOn" | "lastUpdatedOn">) => Promise<Product>;
  navigate: NavigateFunction;
}> = ({ value, setValue, sections, add, navigate }) => {
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const save = async () => {
    if (busy) return;
    setSubmitError(null);
    setBusy(true);
    try {
      await add({ ...value });
      // Go back via history so the previous list URL (with all filter params)
      // is restored exactly as the user left it.
      navigate(-1);
    } catch (err: any) {
      setSubmitError(err?.message || "Failed to add product");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Add Product
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
        submitLabel={busy ? "Adding…" : "Add"}
        sections={sections}
      />
    </>
  );
};
