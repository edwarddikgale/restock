import * as React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Box,
  Card,
  Typography,
  Stack,
  Chip,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import { useProducts } from "../state/products";
import { useAuth } from "../../auth/AuthContext";
import { fetchMySpaces, type Space } from "../services/spacesApi";
import { fetchMyStores, type Store as StoreOption } from "../services/storesApi";
import humanDate from "../../common/utils/date/humanDate";
import { formatInventoryHint } from "../utils/inventory";
import { RecentActivity } from "./RecentActivity";
import { StockEditDialog } from "./StockEditDialog";
import type { Product } from "../types";

import "../styles/product-list.css";

type StockFilter = "all" | "low" | "mid" | "full";
const STORE_ANY = "__ANY_STORE__";
const SECTION_ALL = "__ALL_SECTIONS__";
const SCROLL_KEY = "productList:scroll";

function pctColor(pct: number) {
  if (pct >= 75) return "success.main";
  if (pct <= 25) return "error.main";
  return "warning.main";
}

function bucket(pct: number): Exclude<StockFilter, "all"> {
  if (pct <= 25) return "low";
  if (pct >= 75) return "full";
  return "mid";
}

export const ProductList: React.FC = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  // ---- All filters live in the URL so navigating away (e.g. into a product
  // detail) and coming back via Browser Back restores them automatically.
  const query = params.get("q") || "";
  const stockFilter = (params.get("stock") as StockFilter) || "all";
  const storeFilter = params.get("store") || STORE_ANY;
  const sectionFilter = params.get("sectionId") || SECTION_ALL;
  const category = params.get("category");

  const setFilterParam = React.useCallback(
    (key: string, value: string | null, defaultValue: string) => {
      const next = new URLSearchParams(params);
      if (!value || value === defaultValue) next.delete(key);
      else next.set(key, value);
      // replace:true so each keystroke / chip-click doesn't pollute history
      setParams(next, { replace: true });
    },
    [params, setParams]
  );

  const { products, loadAll, loading, error, update } = useProducts();
  const { firebaseUser } = useAuth();

  const [spaces, setSpaces] = React.useState<Space[]>([]);
  const [storeOptions, setStoreOptions] = React.useState<StoreOption[]>([]);

  // Stock-edit dialog state
  const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);

  React.useEffect(() => {
    if (!firebaseUser) return;
    fetchMyStores(() => firebaseUser.getIdToken())
      .then(setStoreOptions)
      .catch(() => setStoreOptions([]));
  }, [firebaseUser]);

  React.useEffect(() => {
    if (!firebaseUser) return;
    fetchMySpaces(() => firebaseUser.getIdToken()).then(setSpaces);
  }, [firebaseUser]);

  React.useEffect(() => {
    if (firebaseUser) loadAll();
  }, [firebaseUser, loadAll]);

  // Save scroll on unmount, restore on mount once products are present.
  const restoredRef = React.useRef(false);
  React.useEffect(() => {
    return () => {
      sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
    };
  }, []);
  React.useEffect(() => {
    if (restoredRef.current || products.length === 0) return;
    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved !== null) {
      const y = parseInt(saved, 10);
      requestAnimationFrame(() => window.scrollTo(0, isFinite(y) ? y : 0));
      sessionStorage.removeItem(SCROLL_KEY);
    }
    restoredRef.current = true;
  }, [products.length]);

  // Counts for stock filter chips (within the active section filter)
  const stockCounts = React.useMemo(() => {
    const c = { low: 0, mid: 0, full: 0 };
    for (const p of products) {
      if (sectionFilter !== SECTION_ALL && p.spaceId !== sectionFilter) continue;
      c[bucket(p.percentageLeft)]++;
    }
    return c;
  }, [products, sectionFilter]);

  const filtered = products
    .filter((p) => (sectionFilter === SECTION_ALL ? true : p.spaceId === sectionFilter))
    .filter((p) => (category ? p.category === category : true))
    .filter((p) => (stockFilter === "all" ? true : bucket(p.percentageLeft) === stockFilter))
    .filter((p) =>
      storeFilter !== STORE_ANY ? p.preferredStores.includes(storeFilter) : true
    )
    .filter((p) =>
      query
        ? p.name.toLowerCase().includes(query.toLowerCase()) ||
          p.synonym?.toLowerCase().includes(query.toLowerCase())
        : true
    )
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleStockSave = async (id: string, percentageLeft: number) => {
    await update(id, { percentageLeft });
  };

  if (loading) return <Typography variant="body2">Loading products…</Typography>;
  if (error) return <Typography variant="body2" color="error">{error}</Typography>;

  return (
    <Box>
      <RecentActivity />

      <TextField
        size="small"
        fullWidth
        placeholder="Search…"
        value={query}
        onChange={(e) => setFilterParam("q", e.target.value, "")}
        sx={{ mb: 1 }}
      />

      {/* Stock-level filter */}
      <ToggleButtonGroup
        size="small"
        exclusive
        value={stockFilter}
        onChange={(_, v) => v && setFilterParam("stock", v, "all")}
        fullWidth
        sx={{ mb: 1, "& .MuiToggleButton-root": { fontSize: "0.72rem", py: 0.4 } }}
      >
        <ToggleButton value="all">All</ToggleButton>
        <ToggleButton value="low">Low {stockCounts.low ? `(${stockCounts.low})` : ""}</ToggleButton>
        <ToggleButton value="mid">On hand {stockCounts.mid ? `(${stockCounts.mid})` : ""}</ToggleButton>
        <ToggleButton value="full">Full {stockCounts.full ? `(${stockCounts.full})` : ""}</ToggleButton>
      </ToggleButtonGroup>

      {/* Store filter */}
      {storeOptions.length > 0 && (
        <Box sx={{ overflowX: "auto", mx: -1, px: 1, mb: 1 }}>
          <Stack direction="row" spacing={0.75} sx={{ flexWrap: "nowrap" }}>
            <Chip
              label="Any store"
              color={storeFilter === STORE_ANY ? "primary" : "default"}
              variant={storeFilter === STORE_ANY ? "filled" : "outlined"}
              onClick={() => setFilterParam("store", null, STORE_ANY)}
              sx={{ flexShrink: 0, height: 36, fontSize: "0.85rem", px: 0.5 }}
            />
            {storeOptions.map((s) => (
              <Chip
                key={s._id}
                label={s.name}
                color={storeFilter === s.name ? "primary" : "default"}
                variant={storeFilter === s.name ? "filled" : "outlined"}
                onClick={() => setFilterParam("store", s.name, STORE_ANY)}
                sx={{ flexShrink: 0, height: 36, fontSize: "0.85rem", px: 0.5 }}
              />
            ))}
          </Stack>
        </Box>
      )}

      {/* Section filter — defaults to "All sections" */}
      {spaces.length > 0 && (
        <Box sx={{ overflowX: "auto", mx: -1, px: 1, mb: 1 }}>
          <Stack direction="row" spacing={0.75} sx={{ flexWrap: "nowrap" }}>
            <Chip
              label="All sections"
              color={sectionFilter === SECTION_ALL ? "primary" : "default"}
              variant={sectionFilter === SECTION_ALL ? "filled" : "outlined"}
              onClick={() => setFilterParam("sectionId", null, SECTION_ALL)}
              size="small"
              sx={{ flexShrink: 0 }}
            />
            {spaces.map((s) => (
              <Chip
                key={s._id}
                label={s.name}
                onClick={() => setFilterParam("sectionId", s._id, SECTION_ALL)}
                color={sectionFilter === s._id ? "primary" : "default"}
                variant={sectionFilter === s._id ? "filled" : "outlined"}
                size="small"
                sx={{ flexShrink: 0 }}
              />
            ))}
          </Stack>
        </Box>
      )}

      {/* Cards */}
      <Stack spacing={0.5} sx={{ pb: 9 }}>
        {filtered.map((p) => {
          const pct = Number.isFinite(p.percentageLeft) ? p.percentageLeft : 0;
          const trackColor = pctColor(pct);
          const isOut = p.percentageLeft === 0;
          const goToProduct = () => navigate(`/product/${p.id}`);

          return (
            <Card key={p.id} variant="outlined" sx={{ borderRadius: 1.5 }}>
              {/* Row 1: name + % — clickable for navigation */}
              <Box
                onClick={goToProduct}
                sx={{
                  px: 1.25,
                  pt: 0.75,
                  pb: 0.5,
                  cursor: "pointer",
                  "&:active": { bgcolor: "action.hover" },
                }}
              >
                <Stack direction="row" alignItems="baseline" spacing={1}>
                  <Typography
                    variant="subtitle2"
                    noWrap
                    title={p.name}
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      fontWeight: 600,
                      color: isOut ? "error.main" : "text.primary",
                      textDecoration: isOut ? "line-through" : "none",
                      opacity: isOut ? 0.7 : 1,
                    }}
                  >
                    {p.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{ fontWeight: 700, color: trackColor, flexShrink: 0 }}
                  >
                    {Math.round(pct)}%
                  </Typography>
                </Stack>
              </Box>

              {/* Row 2: visual stock bar — TAP to open edit dialog (no drag, no scroll conflict) */}
              <Box
                onClick={() => setEditingProduct(p)}
                role="button"
                aria-label={`Edit stock for ${p.name}`}
                sx={{
                  px: 1.25,
                  py: 1,
                  cursor: "pointer",
                  "&:active": { bgcolor: "action.hover" },
                }}
              >
                <Box
                  sx={{
                    height: 10,
                    bgcolor: "rgba(0,0,0,0.08)",
                    borderRadius: 5,
                    overflow: "hidden",
                  }}
                >
                  <Box
                    sx={{
                      width: `${pct}%`,
                      height: "100%",
                      bgcolor: trackColor,
                      transition: "width 0.25s ease, background-color 0.25s ease",
                    }}
                  />
                </Box>
              </Box>

              {/* Row 3: hint + relative time — also clickable for navigation */}
              <Box
                onClick={goToProduct}
                sx={{
                  px: 1.25,
                  pt: 0.25,
                  pb: 0.75,
                  cursor: "pointer",
                  "&:active": { bgcolor: "action.hover" },
                }}
              >
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    noWrap
                    sx={{ flex: 1, minWidth: 0, fontSize: "0.7rem" }}
                  >
                    {formatInventoryHint(p.name, p.measureType, p.defaultQuantity, pct) ||
                      (p.synonym ? `aka ${p.synonym}` : p.category)}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ flexShrink: 0, fontSize: "0.7rem" }}
                  >
                    {humanDate(p.lastUpdatedOn)}
                  </Typography>
                </Stack>
              </Box>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mt: 4 }}>
            No products match these filters.
          </Typography>
        )}
      </Stack>

      <StockEditDialog
        open={editingProduct !== null}
        product={editingProduct}
        onClose={() => setEditingProduct(null)}
        onSave={handleStockSave}
      />
    </Box>
  );
};
