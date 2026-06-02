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
  Collapse,
  IconButton,
  Tooltip,
} from "@mui/material";
import TuneIcon from "@mui/icons-material/Tune";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import CloseIcon from "@mui/icons-material/Close";
import AddShoppingCartIcon from "@mui/icons-material/AddShoppingCart";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
/**
 * Three-bar priority indicator — no color, shape only.
 * Critical: all 3 bars filled at full height.
 * Normal:   2 bars filled, shorter.
 * Optional (low): 1 bar, shortest.
 *
 * Inspired by Wi-Fi / signal-strength metaphors: more bars = more important.
 * Using opacity rather than color keeps it neutral and accessible.
 */
const CRITICALITY_CONFIG = {
  critical: { bars: 3, tooltip: "Critical — must keep stocked" },
  normal:   { bars: 2, tooltip: "Normal importance" },
  low:      { bars: 1, tooltip: "Optional" },
} as const;

const BAR_HEIGHTS = [5, 8, 11]; // px — short → tall

const CriticalityBars: React.FC<{ criticality?: string }> = ({ criticality }) => {
  const cfg = CRITICALITY_CONFIG[(criticality || "low") as keyof typeof CRITICALITY_CONFIG]
    ?? CRITICALITY_CONFIG.low;
  return (
    <Tooltip title={cfg.tooltip} arrow disableInteractive>
      <Box
        aria-label={cfg.tooltip}
        sx={{
          display: "inline-flex",
          alignItems: "flex-end",
          gap: "1.5px",
          flexShrink: 0,
          height: 14,
          mr: 0.25,
        }}
      >
        {BAR_HEIGHTS.map((h, i) => (
          <Box
            key={i}
            sx={{
              width: 3,
              height: h,
              borderRadius: 0.5,
              bgcolor: i < cfg.bars ? "text.primary" : "text.disabled",
              opacity: i < cfg.bars ? (criticality === "critical" ? 0.85 : 0.45) : 0.18,
              transition: "opacity 0.15s",
            }}
          />
        ))}
      </Box>
    </Tooltip>
  );
};
import { useShoppingList } from "../state/shopping";
import { addShoppingItem, removeShoppingItem } from "../services/shoppingApi";
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
type ListFilter = "all" | "on" | "off";
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
  const listFilter = (params.get("list") as ListFilter) || "all";
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

  // Live shopping list — used to mark cards and gate the +/− cart button
  const { list: shoppingList, reload: reloadShoppingList } = useShoppingList();
  const productIdsOnList = React.useMemo(() => {
    const s = new Set<string>();
    shoppingList?.items.forEach((i) => i.productId && s.add(i.productId));
    return s;
  }, [shoppingList]);
  const itemIdByProductId = React.useMemo(() => {
    const m = new Map<string, string>();
    shoppingList?.items.forEach((i) => i.productId && m.set(i.productId, i._id));
    return m;
  }, [shoppingList]);
  const [cartPending, setCartPending] = React.useState<Record<string, boolean>>({});

  // Number of active filters (excluding search) — drives the toggle pill
  const activeFilterCount =
    (stockFilter !== "all" ? 1 : 0) +
    (storeFilter !== STORE_ANY ? 1 : 0) +
    (sectionFilter !== SECTION_ALL ? 1 : 0) +
    (listFilter !== "all" ? 1 : 0) +
    (query.trim() ? 1 : 0);

  // Default-expand if user has filters active (so they see what's filtering),
  // collapse otherwise for a cleaner first-paint.
  const [filtersOpen, setFiltersOpen] = React.useState(activeFilterCount > 0);

  const clearAll = () => {
    const next = new URLSearchParams();
    setParams(next, { replace: true });
  };

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
    .filter((p) => {
      if (listFilter === "on") return productIdsOnList.has(p.id);
      if (listFilter === "off") return !productIdsOnList.has(p.id);
      return true;
    })
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

  const toggleCart = async (productId: string) => {
    if (!firebaseUser) return;
    setCartPending((p) => ({ ...p, [productId]: true }));
    try {
      const existingItemId = itemIdByProductId.get(productId);
      if (existingItemId) {
        await removeShoppingItem(existingItemId, () => firebaseUser.getIdToken());
      } else {
        await addShoppingItem({ productId }, () => firebaseUser.getIdToken());
      }
      await reloadShoppingList();
    } finally {
      setCartPending((prev) => {
        const { [productId]: _omit, ...rest } = prev;
        return rest;
      });
    }
  };

  if (loading) return <Typography variant="body2">Loading products…</Typography>;
  if (error) return <Typography variant="body2" color="error">{error}</Typography>;

  return (
    <Box>
      <RecentActivity />

      {/* Collapsible Search & Filters toggle */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Chip
          icon={<TuneIcon sx={{ fontSize: 18 }} />}
          deleteIcon={
            <KeyboardArrowDownIcon
              sx={{
                transform: filtersOpen ? "rotate(180deg)" : "rotate(0)",
                transition: "transform 0.18s",
              }}
            />
          }
          onDelete={() => setFiltersOpen((v) => !v)}
          label={
            activeFilterCount > 0
              ? `Search & filter · ${activeFilterCount}`
              : "Search & filter"
          }
          color={activeFilterCount > 0 ? "primary" : "default"}
          variant={activeFilterCount > 0 ? "filled" : "outlined"}
          onClick={() => setFiltersOpen((v) => !v)}
          sx={{ height: 36, fontSize: "0.85rem", px: 0.5 }}
        />
        <Box sx={{ flex: 1 }} />
        {activeFilterCount > 0 && (
          <IconButton size="small" onClick={clearAll} aria-label="Clear filters">
            <CloseIcon fontSize="small" />
          </IconButton>
        )}
      </Stack>

      <Collapse in={filtersOpen} timeout="auto" unmountOnExit>
        <Box sx={{ mb: 1 }}>
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

          {/* Shopping-list filter */}
          <Box sx={{ overflowX: "auto", mx: -1, px: 1, mb: 1 }}>
            <Stack direction="row" spacing={0.75} sx={{ flexWrap: "nowrap" }}>
              <Chip
                label="All products"
                color={listFilter === "all" ? "primary" : "default"}
                variant={listFilter === "all" ? "filled" : "outlined"}
                onClick={() => setFilterParam("list", null, "all")}
                sx={{ flexShrink: 0, height: 36, fontSize: "0.85rem", px: 0.5 }}
              />
              <Chip
                icon={<ShoppingCartIcon sx={{ fontSize: 16 }} />}
                label={`On list${productIdsOnList.size ? ` (${productIdsOnList.size})` : ""}`}
                color={listFilter === "on" ? "primary" : "default"}
                variant={listFilter === "on" ? "filled" : "outlined"}
                onClick={() => setFilterParam("list", "on", "all")}
                sx={{ flexShrink: 0, height: 36, fontSize: "0.85rem", px: 0.5 }}
              />
              <Chip
                label="Not on list"
                color={listFilter === "off" ? "primary" : "default"}
                variant={listFilter === "off" ? "filled" : "outlined"}
                onClick={() => setFilterParam("list", "off", "all")}
                sx={{ flexShrink: 0, height: 36, fontSize: "0.85rem", px: 0.5 }}
              />
            </Stack>
          </Box>

          {/* Section filter — same height as the store chips for visual consistency */}
          {spaces.length > 0 && (
            <Box sx={{ overflowX: "auto", mx: -1, px: 1, mb: 1 }}>
              <Stack direction="row" spacing={0.75} sx={{ flexWrap: "nowrap" }}>
                <Chip
                  label="All sections"
                  color={sectionFilter === SECTION_ALL ? "primary" : "default"}
                  variant={sectionFilter === SECTION_ALL ? "filled" : "outlined"}
                  onClick={() => setFilterParam("sectionId", null, SECTION_ALL)}
                  sx={{ flexShrink: 0, height: 36, fontSize: "0.85rem", px: 0.5 }}
                />
                {spaces.map((s) => (
                  <Chip
                    key={s._id}
                    label={s.name}
                    onClick={() => setFilterParam("sectionId", s._id, SECTION_ALL)}
                    color={sectionFilter === s._id ? "primary" : "default"}
                    variant={sectionFilter === s._id ? "filled" : "outlined"}
                    sx={{ flexShrink: 0, height: 36, fontSize: "0.85rem", px: 0.5 }}
                  />
                ))}
              </Stack>
            </Box>
          )}
        </Box>
      </Collapse>

      {/* Cards */}
      <Stack spacing={0.5} sx={{ pb: 9 }}>
        {filtered.map((p) => {
          const pct = Number.isFinite(p.percentageLeft) ? p.percentageLeft : 0;
          const trackColor = pctColor(pct);
          const isOut = p.percentageLeft === 0;
          const goToProduct = () => navigate(`/product/${p.id}`);

          const onList = productIdsOnList.has(p.id);
          const cartBusy = !!cartPending[p.id];

          return (
            <Card
              key={p.id}
              variant="outlined"
              sx={{
                borderRadius: 1.5,
                ...(onList
                  ? {
                      borderColor: "primary.main",
                      borderWidth: 1.5,
                    }
                  : {}),
              }}
            >
              {/* Row 1: name + cart toggle + % */}
              <Stack
                direction="row"
                alignItems="center"
                spacing={0.5}
                sx={{ px: 1.25, pt: 0.75, pb: 0.5 }}
              >
                <Box
                  onClick={goToProduct}
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    cursor: "pointer",
                    "&:active": { bgcolor: "action.hover" },
                    py: 0.25,
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={0.25}>
                    <CriticalityBars criticality={p.criticality} />
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
                  </Stack>
                </Box>

                {/* Cart toggle: filled when on list, outlined when not */}
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleCart(p.id);
                  }}
                  disabled={cartBusy}
                  aria-label={onList ? "Remove from shopping list" : "Add to shopping list"}
                  sx={{
                    color: onList ? "primary.main" : "text.secondary",
                    p: 0.5,
                  }}
                >
                  {onList ? (
                    <ShoppingCartIcon fontSize="small" />
                  ) : (
                    <AddShoppingCartIcon fontSize="small" />
                  )}
                </IconButton>

                <Typography
                  variant="body2"
                  sx={{ fontWeight: 700, color: trackColor, flexShrink: 0, ml: 0.5 }}
                >
                  {Math.round(pct)}%
                </Typography>
              </Stack>

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
